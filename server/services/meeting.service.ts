/**
 * Pipeline AI rapat: ekstraksi audio, transkripsi, dan analisis terstruktur.
 *
 * Fungsi ini berjalan sebagai pekerja latar setelah response upload terkirim,
 * bukan sebagai handler rute. Tempatnya memang di lapisan services — ia tidak
 * menyentuh req maupun res sama sekali, hanya membaca dan menulis database
 * serta memancarkan progres lewat Socket.IO.
 *
 * Dipindah apa adanya dari meetings.routes.ts. Isi logikanya tidak diubah
 * sebaris pun.
 */
import db from "../../src/lib/db";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithFallback } from "./ai.service";
import { getSocketServer } from "../config/socket";
import { GLOBAL_UPLOADS_DIR } from "../config/uploads";
import { meetingRepository } from "../repositories/meeting.repository";
import { filterKlaimTerverifikasi } from "./meeting-ai-filter";
import {
  pipelineDibatalkan,
  PipelineDibatalkanError,
  updateMenyentuhBaris,
} from "./meeting-pipeline-batal";

/**
 * Instance Socket.IO untuk memancarkan progres.
 *
 * Pipeline berjalan setelah response terkirim sehingga tidak punya akses ke
 * `req.io`. Registry dipakai agar seluruh titik pemancaran memakai satu cara
 * yang sama; optional chaining membuat event terlewat dengan aman bila registry
 * belum terisi.
 */
const io = { emit: (event: string, ...args: any[]) => getSocketServer()?.emit(event, ...args) };

/** #322 — batas pekerja AI in-process agar tidak menumpuk job berat tanpa antrian durable. */
const MAX_AI_PIPELINE_CONCURRENT = Math.max(
  1,
  Math.min(4, Number(process.env.AI_PIPELINE_MAX_CONCURRENT || 2) || 2)
);
let aiPipelineAktif = 0;
const aiPipelineAntrian: Array<() => void> = [];

function ambilSlotAiPipeline(): Promise<void> {
  if (aiPipelineAktif < MAX_AI_PIPELINE_CONCURRENT) {
    aiPipelineAktif += 1;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    aiPipelineAntrian.push(() => {
      aiPipelineAktif += 1;
      resolve();
    });
  });
}

function lepaskanSlotAiPipeline(): void {
  aiPipelineAktif = Math.max(0, aiPipelineAktif - 1);
  const berikutnya = aiPipelineAntrian.shift();
  if (berikutnya) berikutnya();
}

async function pastikanPipelineAktif(
  connection: { query: (sql: string, params?: unknown[]) => Promise<unknown> },
  meetingId: string
): Promise<void> {
  const [rows]: any = await connection.query("SELECT upload_status FROM Meetings WHERE id = ?", [
    meetingId,
  ]);
  const status = rows?.[0]?.upload_status;
  if (!rows?.[0] || pipelineDibatalkan(status)) {
    throw new PipelineDibatalkanError();
  }
}

export async function runAIPipeline(meetingId: string): Promise<void> {
  await ambilSlotAiPipeline();
  try {
    await jalankanAiPipelineDalamSlot(meetingId);
  } finally {
    lepaskanSlotAiPipeline();
  }
}

async function jalankanAiPipelineDalamSlot(meetingId: string): Promise<void> {
  console.log(`[AI PIPELINE] Starting background processing for meeting: ${meetingId}`);
  let connection;
  try {
    connection = await db.getConnection();

    await pastikanPipelineAktif(connection, meetingId);

    // Set status to EXTRACTING_AUDIO
    await connection.query("UPDATE Meetings SET upload_status = 'EXTRACTING_AUDIO' WHERE id = ?", [
      meetingId,
    ]);
    io.emit("meeting_ai_status", {
      meetingId,
      status: "EXTRACTING_AUDIO",
      progress_percentage: 15,
      code: "srv.ekstraksi_audio_sedang_berjalan",
      message: "Ekstraksi audio sedang berjalan...",
    });

    // Fetch meeting details
    const [rows]: any = await connection.query("SELECT * FROM Meetings WHERE id = ?", [meetingId]);
    if (!rows || rows.length === 0) {
      throw new Error(`Meeting dengan ID ${meetingId} tidak ditemukan.`);
    }

    const meeting = rows[0];
    const recordingUrl = meeting.recording_url;
    const meetingLink = meeting.meetingLink || "";

    if (!recordingUrl) {
      throw new Error("File rekaman belum diunggah atau tidak terdaftar di database.");
    }

    // Resolve file path
    const safeFileName = path.basename(recordingUrl);

    const filePath = path.join(GLOBAL_UPLOADS_DIR, safeFileName);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File rekaman tidak ditemukan di path: ${filePath}`);
    }

    // Determine mime type from extension
    const fileExt = path.extname(filePath).toLowerCase();
    let mimeType = "audio/mp3";
    if (fileExt === ".wav") mimeType = "audio/wav";
    else if (fileExt === ".webm") mimeType = "audio/webm";
    else if (fileExt === ".m4a") mimeType = "audio/x-m4a";
    else if (fileExt === ".mp4") mimeType = "video/mp4";

    // 1. FFmpeg Audio Extraction
    let audioPath = filePath;
    let finalMimeType = mimeType;
    // .webm live dari MediaRecorder adalah AUDIO, bukan video. FFmpeg -vn
    // pada webm audio sering gagal dan membuat pipeline jatuh ke fallback
    // yang tidak perlu. Video sungguhan: mp4/mkv/mov/avi (#320).
    const isVideo = [".mp4", ".mkv", ".mov", ".avi"].includes(fileExt);

    if (isVideo) {
      const extractedPath = path.join(
        GLOBAL_UPLOADS_DIR,
        `extracted_${meetingId}_${Date.now()}.mp3`
      );
      console.log(
        `[AI PIPELINE] Extracting audio from video file using FFmpeg: ${filePath} -> ${extractedPath}`
      );

      try {
        await new Promise<void>((resolve, reject) => {
          exec(
            `ffmpeg -y -i "${filePath}" -vn -acodec libmp3lame -ar 16000 -ac 1 "${extractedPath}"`,
            (err, stdout, stderr) => {
              if (err) {
                console.warn(
                  "[AI PIPELINE] FFmpeg execution failed, using original file:",
                  err.message
                );
                reject(err);
              } else {
                console.log("[AI PIPELINE] FFmpeg extracted audio successfully.");
                resolve();
              }
            }
          );
        });
        audioPath = extractedPath;
        finalMimeType = "audio/mp3";
      } catch (ffmpegErr) {
        console.warn("[AI PIPELINE] FFmpeg fallback activated. Direct processing.");
      }
    }

    // 2. Speech-to-Text using Gemini
    console.log(`[AI PIPELINE] Transcribing audio file: ${audioPath}`);
    await pastikanPipelineAktif(connection, meetingId);
    await connection.query("UPDATE Meetings SET upload_status = 'TRANSCRIBING_STT' WHERE id = ?", [
      meetingId,
    ]);
    io.emit("meeting_ai_status", {
      meetingId,
      status: "TRANSCRIBING_STT",
      progress_percentage: 60,
      code: "srv.mengubah_suara_rekaman_audio",
      message: "Mengubah suara rekaman audio menjadi teks mentah secara akurat...",
    });

    const fileBuffer = fs.readFileSync(audioPath);
    const base64Audio = fileBuffer.toString("base64");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Kunci API Gemini tidak dikonfigurasi.");
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const responseGemini = await generateContentWithFallback(ai, {
      model: "gemini-flash-latest",
      contents: [
        {
          inlineData: {
            data: base64Audio,
            mimeType: finalMimeType,
          },
        },
        {
          text: "Transkripsikan isi rekaman audio rapat ini ke Bahasa Indonesia secara lengkap. Aturan ketat: (1) Jangan mengarang nama orang — jika pembicara terdengar berbeda, label Speker 1/2/3 atau suara yang disebut di audio; (2) Jika ada jeda atau bagian tidak jelas, tulis [tidak jelas]; (3) Jangan meringkas — tulis apa yang diucapkan; (4) Jangan menambah fakta di luar audio.",
        },
      ],
    });

    const transcriptText = responseGemini.text || "";
    if (!transcriptText.trim()) {
      throw new Error("Hasil transkrip audio kosong dari Gemini.");
    }

    console.log(`[AI PIPELINE] Transcript length: ${transcriptText.length} characters.`);
    await connection.query("UPDATE Meetings SET transcript = ? WHERE id = ?", [
      transcriptText,
      meetingId,
    ]);

    // 3. LLM Structured Analysis using Gemini SDK with Structured Outputs (responseSchema)
    console.log("[AI PIPELINE] Generating structured output analysis...");
    await pastikanPipelineAktif(connection, meetingId);
    await connection.query("UPDATE Meetings SET upload_status = 'ANALYZING_LLM' WHERE id = ?", [
      meetingId,
    ]);
    io.emit("meeting_ai_status", {
      meetingId,
      status: "ANALYZING_LLM",
      progress_percentage: 90,
      code: "srv.mengekstrak_rangkuman_keputusan_rencana",
      message: "Mengekstrak rangkuman, keputusan, & rencana tindak lanjut dengan AI...",
    });

    const structuredSchema = {
      type: Type.OBJECT,
      properties: {
        ringkasan_eksekutif: {
          type: Type.STRING,
          description:
            "Bertindaklah sebagai Senior Business Analyst dan PMO Lead kelas enterprise yang sangat detail dan perfeksionis. Susun Notulen Rapat Profesional yang sangat detail secara UTUH, mendalam, dan TANPA meringkas/memotong poin penting dalam format Markdown. Patuhi instruksi ketat berikut:\n1. JANGAN lakukan enkapsulasi atau generalisasi (jangan meringkas perdebatan menjadi hanya satu kalimat jika di transkrip mereka berdiskusi panjang).\n2. Tuliskan semua studi kasus, nama brand/mitra, angka, estimasi bulan/target, dan istilah teknis secara verbatim (apa adanya sesuai transkrip).\n3. Jika ada perdebatan alur berpikir (misal: salah paham di awal lalu dikoreksi oleh pembicara lain), jabarkan kronologi koreksi tersebut di poin diskusi.\n\nGunakan struktur formatting berikut secara ketat:\n\n## NOTULEN RAPAT: [Nama Topik/Agenda Rapat Utama]\n**Tanggal:** [Isi Tanggal/Bulan/Tahun jika disebutkan]\n**Topik Utama:** [Tujuan besar rapat ini diadakan]\n\n---\n\n### **A. DAFTAR HADIR & IDENTIFIKASI PERAN**\n(Daftar semua pembicara beserta peran, divisi, atau latar belakang mereka berdasarkan isi percakapan).\n\n---\n\n### **B. KRONOLOGI DISKUSI MENDALAM & DETAIL TEKNIS**\n(Kupas habis setiap topik yang didebatkan. Bagi menjadi sub-heading (###) berdasarkan topik masalah. Masukkan detail arsitektur sistem, skema database/API/flow data, alasan bisnis di balik sebuah request, serta perbandingan sistem eksisting vs sistem baru yang dibahas).\n\n---\n\n### **C. BREAKDOWN RENCANA TINDAK LANJUT (ACTION ITEMS)**\n(Buat daftar tugas konkret yang sifatnya operasional dan siap dieksekusi, sebutkan:\n- Pihak/Tim Penanggung Jawab.\n- Detail Tugas (Langkah 1, Langkah 2, dst).\n- Dampak Teknis/Bisnis jika tugas ini dijalankan).",
        },
        kronologi_dan_kesimpulan: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              topik_bahasan: {
                type: Type.STRING,
                description: "Nama sub-topik spesifik yang diperdebatkan atau dibahas.",
              },
              latar_belakang_argumen: {
                type: Type.STRING,
                description:
                  "Detail penjelasan MENGAPA sub-topik ini dibahas dan argumen/pendapat yang disampaikan oleh para pembicara selama diskusi berjalan.",
              },
              keputusan_akhir: {
                type: Type.STRING,
                description:
                  "Pernyataan keputusan resmi yang disepakati. Kosongkan string bila tidak ada keputusan eksplisit di transkrip.",
              },
              bukti_cuplikan: {
                type: Type.STRING,
                description:
                  "Kutipan singkat verbatim dari transkrip yang membuktikan keputusan/argumen. Wajib diisi bila keputusan_akhir terisi; jika tidak ada kutipan, biarkan keputusan kosong.",
              },
              status_bukti: {
                type: Type.STRING,
                description:
                  "VERIFIED jika ada kutipan transkrip; UNVERIFIED jika tidak — item UNVERIFIED sebaiknya dikosongkan.",
              },
            },
            required: [
              "topik_bahasan",
              "latar_belakang_argumen",
              "keputusan_akhir",
              "bukti_cuplikan",
              "status_bukti",
            ],
          },
          description:
            "Daftar kronologi bahasan rapat beserta jalannya argumen dan keputusan akhir.",
        },
        tindak_lanjut_dan_concern: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              pembicara: {
                type: Type.STRING,
                description:
                  "Nama atau kode pembicara (Speaker ID) yang mengangkat isu / kekhawatiran spesifik.",
              },
              kekhawatiran_spesifik: {
                type: Type.STRING,
                description:
                  "Detail ketakutan, kendala teknis, atau gap sistem yang dikhawatirkan oleh pembicara tersebut secara mendalam.",
              },
              solusi_dan_arahan: {
                type: Type.STRING,
                description:
                  "Instruksi langsung, mandat, atau solusi penyelesaian yang disepakati di transkrip.",
              },
              bukti_cuplikan: {
                type: Type.STRING,
                description:
                  "Kutipan verbatim dari transkrip yang mendukung kekhawatiran/solusi. Wajib jika item diisi.",
              },
              status_bukti: {
                type: Type.STRING,
                description: "VERIFIED atau UNVERIFIED.",
              },
            },
            required: [
              "pembicara",
              "kekhawatiran_spesifik",
              "solusi_dan_arahan",
              "bukti_cuplikan",
              "status_bukti",
            ],
          },
          description:
            "Daftar kekhawatiran spesifik dari pembicara beserta arahan/solusi penyelesaiannya.",
        },
        next_plan_roadmap: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              action_item: {
                type: Type.STRING,
                description:
                  "Deskripsi tugas taktis yang sangat spesifik dan detail (bukan kalimat pendek umum).",
              },
              pic: {
                type: Type.STRING,
                description:
                  "Nama orang/tim penanggung jawab HANYA jika disebut di transkrip. Jika tidak disebut, tulis UNVERIFIED (bukan menebak).",
              },
              estimasi_waktu: {
                type: Type.STRING,
                description:
                  "Tenggat eksplisit dari transkrip. Jika tidak disebut, tulis UNVERIFIED.",
              },
              bukti_cuplikan: {
                type: Type.STRING,
                description:
                  "Kutipan verbatim dari transkrip yang membuktikan action item / penugasan.",
              },
              status_bukti: {
                type: Type.STRING,
                description: "VERIFIED atau UNVERIFIED.",
              },
            },
            required: ["action_item", "pic", "estimasi_waktu", "bukti_cuplikan", "status_bukti"],
          },
          description: "Roadmap rencana aksi taktis berikutnya.",
        },
        target_to_be_architecture: {
          type: Type.OBJECT,
          properties: {
            proses_bisnis_as_is: {
              type: Type.STRING,
              description:
                "Detail gambaran alur kerja, sistem, atau prosedur operasional yang sedang berjalan saat ini (beserta kelemahannya jika ada).",
            },
            proses_bisnis_to_be: {
              type: Type.STRING,
              description:
                "Spesifikasi langkah demi langkah mengenai alur sistem baru, fitur baru, atau model operasional masa depan yang disepakati untuk dibangun.",
            },
            langkah_transisi: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description:
                "Langkah-langkah teknis atau operasional konkret untuk bermigrasi menuju kondisi target.",
            },
          },
          required: ["proses_bisnis_as_is", "proses_bisnis_to_be", "langkah_transisi"],
          description: "Gambaran target arsitektur proses bisnis (As-Is vs To-Be).",
        },
      },
      required: [
        "ringkasan_eksekutif",
        "kronologi_dan_kesimpulan",
        "tindak_lanjut_dan_concern",
        "next_plan_roadmap",
        "target_to_be_architecture",
      ],
    };

    // 2.1 Dynamic Prompt Injection: Fetch latest 5-10 learning notes from ai_learning_logs
    let learningNotesStr = "";
    try {
      const [logs]: any = await connection.query(
        "SELECT evaluation_notes, timestamp FROM ai_learning_logs WHERE project_id = ? ORDER BY timestamp DESC LIMIT 10",
        [meeting.projectId]
      );
      if (logs && logs.length > 0) {
        learningNotesStr = logs
          .map(
            (log: any, idx: number) =>
              `[Evaluation #${idx + 1} - ${log.timestamp}]: ${log.evaluation_notes}`
          )
          .join("\n");
      }
    } catch (logQueryErr) {
      console.warn("[AI PIPELINE] Gagal mengambil log evaluasi pembelajaran:", logQueryErr);
    }

    const learningSection = `
PANDUAN PENINGKATAN KEMAMPUAN ADAPTIF (SELF-IMPROVEMENT):
- Di bawah ini adalah daftar kritik dan catatan evaluasi dari user mengenai hasil kerja Anda pada rapat-rapat sebelumnya:
  ${learningNotesStr || "Tidak ada catatan evaluasi sebelumnya. Harap berikan hasil analisis terbaik dan detail secara konsisten."}

- TUGAS ANDA: Analisis kelemahan Anda berdasarkan catatan di atas. Jika user mengkritik Anda 'kurang detail pada aspek arsitektur', maka pada analisis rapat kali ini Anda WAJIB meningkatkan kedalaman informasi pada aspek arsitektur secara drastis.
- Selalu adaptasikan gaya penulisan notulen Anda agar semakin mendekati ekspektasi spesifik yang diminta oleh user dalam log evaluasi tersebut. Jangan ulangi kesalahan klasifikasi atau reduksi informasi yang sama.
`;

    const systemInstruction = `Bertindaklah sebagai Senior Business Analyst / PMO. Susun notulen dari TRANSKRIP saja.

ATURAN ANTI-HALUSINASI (wajib):
1. HANYA fakta yang ada di transkrip. Dilarang mengarang nama, tanggal, PIC, tenggat, atau keputusan.
2. Setiap keputusan/aksi/concern WAJIB punya bukti_cuplikan (kutipan singkat verbatim). Jika tidak ada kutipan → jangan isi klaim itu (biarkan array item tidak dibuat, atau status_bukti=UNVERIFIED dan field klaim dikosongkan).
3. PIC dan tenggat: hanya jika disebut eksplisit; jika tidak → "UNVERIFIED" (bukan tebakan nama).
4. Pembicara: pakai nama hanya jika disebut; selain itu Speker N / label dari transkrip.
5. Output JSON bersih sesuai skema — tanpa blok markdown.

Isi field:
- ringkasan_eksekutif: notulen Markdown terstruktur (hadir, kronologi, action) — tetap berbasis transkrip.
- kronologi_dan_kesimpulan: topik, argumen, keputusan_akhir + bukti_cuplikan + status_bukti.
- tindak_lanjut_dan_concern: pembicara, kekhawatiran, solusi + bukti_cuplikan + status_bukti.
- next_plan_roadmap: action_item, pic, estimasi_waktu + bukti_cuplikan + status_bukti.
- target_to_be_architecture: as-is / to-be / langkah_transisi hanya dari transkrip.

${learningSection}`;

    const responseAnalysis = await generateContentWithFallback(ai, {
      model: "gemini-flash-latest",
      contents: `[TRANSKRIP RAPAT]:\n${transcriptText}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: structuredSchema,
      },
    });

    const analysisJson = responseAnalysis.text ? responseAnalysis.text.trim() : "{}";
    let parsedData;
    try {
      parsedData = JSON.parse(analysisJson);
    } catch (parseErr) {
      console.error("Failed to parse meeting analysis JSON:", parseErr);
      parsedData = {};
    }

    const kronologi_dan_kesimpulan = filterKlaimTerverifikasi(
      parsedData.kronologi_dan_kesimpulan || [],
      ["keputusan_akhir", "topik_bahasan"]
    );
    const tindak_lanjut_dan_concern = filterKlaimTerverifikasi(
      parsedData.tindak_lanjut_dan_concern || [],
      ["kekhawatiran_spesifik", "solusi_dan_arahan"]
    );
    const next_plan_roadmap = filterKlaimTerverifikasi(parsedData.next_plan_roadmap || [], [
      "action_item",
    ]);
    const ringkasan_eksekutif = parsedData.ringkasan_eksekutif || "";
    const target_to_be_architecture = parsedData.target_to_be_architecture || {
      proses_bisnis_as_is: "",
      proses_bisnis_to_be: "",
      langkah_transisi: [],
    };

    const kesimpulan = kronologi_dan_kesimpulan
      .map((item: any) => item.keputusan_akhir)
      .filter(Boolean);
    const saran = tindak_lanjut_dan_concern
      .map((item: any) => `${item.pembicara || "UNVERIFIED"}: ${item.solusi_dan_arahan || ""}`)
      .filter(Boolean);

    const notulen_rapat = kronologi_dan_kesimpulan.map((item: any, idx: number) => ({
      topik: item.topik_bahasan || `Topik Bahasan ${idx + 1}`,
      pembahasan: `Latar Belakang & Argumen:\n${item.latar_belakang_argumen || "Tidak disebutkan."}\n\nKeputusan Akhir:\n${item.keputusan_akhir || "Tidak disebutkan."}${item.bukti_cuplikan ? `\n\nBukti: "${item.bukti_cuplikan}"` : ""}`,
    }));

    const meeting_metadata = {
      topik_utama: ringkasan_eksekutif
        ? ringkasan_eksekutif.split(".")[0] || "Koordinasi Proyek"
        : "Koordinasi Proyek",
      peserta_aktif: Array.from(
        new Set(tindak_lanjut_dan_concern.map((item: any) => item.pembicara).filter(Boolean))
      ) as string[],
      tanggal_waktu: new Date().toLocaleDateString("id-ID"),
    };

    const poin_diskusi_tambahan = tindak_lanjut_dan_concern.map((item: any) => ({
      concern: item.kekhawatiran_spesifik || "",
      tindakanLanjut: item.solusi_dan_arahan || "",
      PIC: item.pembicara || "UNVERIFIED",
      targetDate: "UNVERIFIED",
      fitur: "",
      system: "",
      surrounding: "",
      keterangan: item.bukti_cuplikan ? `Bukti: ${item.bukti_cuplikan}` : "",
      bukti_cuplikan: item.bukti_cuplikan || "",
      status_bukti: item.status_bukti || "",
    }));

    const next_plan = next_plan_roadmap.map((item: any) => ({
      tahapan: item.action_item || "",
      deskripsi: `Ditugaskan kepada: ${item.pic || "UNVERIFIED"}. Rencana Aksi: ${item.action_item}`,
      estimasi_waktu: item.estimasi_waktu || "UNVERIFIED",
      pic: item.pic || "UNVERIFIED",
      bukti_cuplikan: item.bukti_cuplikan || "",
      status_bukti: item.status_bukti || "",
    }));

    const to_be_scenario = {
      kondisi_sekarang: target_to_be_architecture.proses_bisnis_as_is || "",
      target_ke_depan: target_to_be_architecture.proses_bisnis_to_be || "",
      langkah_transisi: target_to_be_architecture.langkah_transisi || [],
    };

    // Create a combined JSON with old and new structures
    const combinedData = {
      ...parsedData,
      notulen_rapat,
      kesimpulan,
      saran,
      meeting_metadata,
      poin_diskusi_tambahan,
      next_plan,
      to_be_scenario,
    };

    const finalJson = JSON.stringify(combinedData);

    await pastikanPipelineAktif(connection, meetingId);

    const [hasilSelesai]: any = await connection.query(
      "UPDATE Meetings SET aiSummary = ?, analysis_result = ?, upload_status = 'COMPLETED' WHERE id = ? AND upload_status <> 'IDLE'",
      [finalJson, finalJson, meetingId]
    );
    if (!updateMenyentuhBaris(hasilSelesai || {})) {
      throw new PipelineDibatalkanError();
    }

    // #320 — kebijakan pemilik: rekaman HANYA untuk analisis. Setelah notulen
    // (aiSummary/analysis_result/transcript) tersimpan dan status COMPLETED,
    // berkas audio/video dihapus dari disk dan recording_url dikosongkan.
    // Hasil analisis tetap tersimpan. Gagal analisis → berkas dipertahankan agar bisa diulang.
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      if (audioPath !== filePath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath);
      await meetingRepository.clearRecordingFile(meetingId);
      console.log(`[AI PIPELINE] Rekaman dihapus pasca-analisis OK (meeting ${meetingId}).`);
    } catch (cleanupErr) {
      console.warn(`[AI PIPELINE] Gagal menghapus berkas rekaman pasca-analisis:`, cleanupErr);
    }

    console.log(`[AI PIPELINE] Successfully completed meeting ${meetingId}. Emitting COMPLETED.`);

    // Broadcast success to frontend
    io.emit("meeting_ai_status", {
      meetingId,
      status: "COMPLETED",
      progress_percentage: 100,
      code: "srv.pemrosesan_selesai",
      message: "Pemrosesan selesai!",
    });

    io.emit("meeting_ai_completed", {
      meetingId,
      status: "COMPLETED",
      progress_percentage: 100,
      aiSummary: combinedData,
      analysis_result: combinedData,
      transcript: transcriptText,
    });
  } catch (err: any) {
    if (err instanceof PipelineDibatalkanError) {
      console.log(
        `[AI PIPELINE] Dibatalkan, tidak menulis FAILED/COMPLETED (meeting ${meetingId}).`
      );
      return;
    }
    console.error(`[AI PIPELINE ERROR] Error in AI pipeline for meeting ${meetingId}:`, err);
    if (connection) {
      await connection.query(
        "UPDATE Meetings SET upload_status = 'FAILED' WHERE id = ? AND upload_status <> 'IDLE'",
        [meetingId]
      );
    }
    io.emit("meeting_ai_failed", { meetingId, error: err.message || "Gagal memproses AI." });
  } finally {
    if (connection) connection.release();
  }
}
