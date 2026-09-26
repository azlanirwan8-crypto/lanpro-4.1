/**
 * Otak "LanPro AI Assistant" (#551).
 *
 * Kenapa berkas ini ada. Sebelum 26 Sep 2026 asisten hanya menerima teks
 * pertanyaan pengguna — tanpa riwayat, tanpa data siapa pun — lalu diminta
 * "berikan saran praktis seputar manajemen tugas, debugging, figma, database,
 * atau motivasi kerja" dengan temperature 0,8 (chat.routes.ts:267-292). Ia
 * tidak mungkin menjawab seperti asisten pribadi karena memang tidak diberi
 * apa pun untuk dijawab: setiap jawaban adalah karangan yang masuk akal.
 *
 * Yang berubah di sini:
 *  1. KONTEKS — daftar proyek yang boleh dilihat penanya + tugasnya sendiri,
 *     dibaca dari repository yang sama dipakai aplikasi, dengan cakupan dari
 *     `req.user` (BUKAN dari body).
 *  2. PERKAKAS — model boleh meminta data tambahan (mencari tugas, merangkum
 *     satu proyek). Eksekusinya di server, dan setiap perkakas memeriksa ulang
 *     bahwa proyek yang diminta benar terlihat oleh penanya.
 *  3. MEMORI — beberapa giliran percakapan terakhir ikut dikirim, jadi "yang
 *     tadi" punya rujukan.
 *  4. JUJUR — tanpa kunci API tidak ada karangan persona; pengguna menerima
 *     pesan bahwa asisten sedang tidak tersambung. Model juga diizinkan
 *     menjawab "datanya tidak ada".
 *
 * Semua fungsi di sini murni terhadap transport: `ai` disuntik dari luar, jadi
 * uji bisa menjalankan seluruh lingkaran perkakas tanpa jaringan.
 */
import { projectRepository } from "../repositories/project.repository";
import { taskRepository } from "../repositories/task.repository";
import { generateContentWithFallback } from "./ai.service";
// Satu sumber kebenaran untuk "tugas ini sudah selesai" — sama persis dengan
// yang dipakai kartu jumlah di dasbor. Kalau asisten memakai daftarnya sendiri,
// angkanya bisa berbeda dari papan dan tidak ada yang tahu mana yang benar.
import { statusSelesai } from "../../src/lib/statusSelesai";

export type PemanggilAsisten = { id: string; role: string; nama?: string };

/** Batas keras: jawaban asisten tidak boleh mengubah ukuran basis data. */
const MAKS_PROYEK = 8;
const MAKS_TUGAS_PER_PROYEK = 400;
const MAKS_BARIS_KONTKS = 24;
const MAKS_ROUNDS_ALAT = 3;

/**
 * Model yang benar-benar dipakai. Namanya ikut ditulis di label widget obrolan,
 * dan `asisten.model-label.test.ts` menjaga keduanya tetap sama — supaya teks
 * "Assistant" yang dibaca pengguna bisa dicek, bukan dikira-kira.
 */
const MODEL_ASISTEN = "gemini-flash-latest";

const terbuka = (t: any) => !statusSelesai(t?.status);
const lewatTenggat = (t: any) => {
  const d = t.endDate || t.dueDate;
  if (!d) return false;
  const ms = new Date(d).getTime();
  return Number.isFinite(ms) && ms < Date.now();
};

/** Satu-satunya sumber cakupan: proyek yang boleh dilihat pemanggil. */
async function proyekTerlihat(pemanggil: PemanggilAsisten) {
  const rows = await projectRepository.findProjectsForCaller(pemanggil.id, pemanggil.role);
  return (rows || []).slice(0, MAKS_PROYEK);
}

type TugasRingkas = {
  id: string;
  key: string;
  judul: string;
  status: string;
  tenggat: string | null;
  proyek: string;
  proyekId: string;
  lembur: boolean;
};

function persempit(t: any, namaProyek: string): TugasRingkas {
  return {
    id: String(t.id),
    key: String(t.taskKey || t.key || ""),
    judul: String(t.title || ""),
    status: String(t.status || ""),
    tenggat: t.endDate ? String(t.endDate).slice(0, 10) : null,
    proyek: namaProyek,
    proyekId: String(t.projectId || ""),
    lembur: lewatTenggat(t),
  };
}

/** Tugas milik pemanggil (bukan seluruh tim) di proyek yang boleh ia lihat. */
async function tugasMilik(pemanggil: PemanggilAsisten, hanyaTerbuka = true) {
  const hasil: TugasRingkas[] = [];
  for (const p of await proyekTerlihat(pemanggil)) {
    const rows = await taskRepository.findRawProjectTasks(String(p.id));
    const milik = (rows || [])
      .filter((t: any) => t && String(t.assigneeId || "") === String(pemanggil.id))
      .filter((t: any) => (hanyaTerbuka ? terbuka(t) : true))
      .slice(0, MAKS_TUGAS_PER_PROYEK)
      .map((t: any) => persempit(t, String(p.name || p.id)));
    hasil.push(...milik);
  }
  return hasil;
}

/** Grounding yang selalu ikut terkirim — murah, dan membuat jawaban pertama sudah benar. */
async function bangunKonteks(pemanggil: PemanggilAsisten): Promise<string> {
  const proyek = await proyekTerlihat(pemanggil);
  if (!proyek.length) return "Penanya tidak punya proyek aktif yang bisa ia lihat.";

  const milik = (await tugasMilik(pemanggil)).slice(0, MAKS_BARIS_KONTKS);
  const lembur = milik.filter((t) => t.lembur);
  const baris = milik.map(
    (t) =>
      `- [${t.key}] ${t.judul} | ${t.status} | ${t.proyek}${t.tenggat ? ` | tenggat ${t.tenggat}` : ""}${t.lembur ? " | TERLAMBAT" : ""}`
  );

  return [
    `Data nyata LanPro milik penanya (${pemanggil.nama || pemanggil.id}, peran ${pemanggil.role}), dibaca saat ${new Date().toISOString().slice(0, 10)}:`,
    `Proyek terlihat: ${proyek.map((p: any) => p.name || p.id).join(", ")}`,
    lembur.length ? `Terlambat: ${lembur.length} tugas` : "Tidak ada tugas terlambat.",
    baris.length
      ? `Tugas terbuka milik penanya:\n${baris.join("\n")}`
      : "Penanya tidak punya tugas terbuka.",
  ].join("\n");
}

/** Deklarasi perkakas untuk Gemini. Nama fungsi dipakai kembali di `jalankanAlat`. */
const DEKLARASI_ALAT = [
  {
    name: "tugas_saya",
    description:
      "Daftar tugas milik pengguna yang bertanya, pada proyek yang boleh ia lihat. Pakai ini untuk 'apa tugas saya', 'yang mana terlambat', 'prioritas minggu ini'.",
    parameters: {
      type: "object",
      properties: {
        hanyaTerbuka: {
          type: "boolean",
          description: "true (bawaan) = kecuali yang selesai; false = semua.",
        },
      },
    },
  },
  {
    name: "cari_tugas",
    description:
      "Mencari tugas berdasarkan kata pada judul atau kode tugas, di seluruh proyek yang terlihat oleh pengguna.",
    parameters: {
      type: "object",
      properties: {
        kata: { type: "string", description: "Kata yang dicari, mis. 'login' atau 'LNP-123'." },
      },
      required: ["kata"],
    },
  },
  {
    name: "ringkas_proyek",
    description:
      "Ringkasan satu proyek: jumlah tugas, yang selesai, yang terlambat, dan tugas yang tertunda tertua. Hanya untuk proyek yang terlihat oleh pengguna.",
    parameters: {
      type: "object",
      properties: {
        proyekId: { type: "string", description: "id atau nama proyek." },
      },
      required: ["proyekId"],
    },
  },
];

/**
 * Eksekusi perkakas di server. Setiap cabang memfilter ulang dengan cakupan
 * pemanggil — nilai dari model TIDAK pernah dipercaya sebagai izin.
 */
async function jalankanAlat(
  nama: string,
  args: Record<string, any>,
  pemanggil: PemanggilAsisten
): Promise<string> {
  if (nama === "tugas_saya") {
    const hanyaTerbuka = args?.hanyaTerbuka !== false;
    const rows = (await tugasMilik(pemanggil, hanyaTerbuka)).slice(0, MAKS_BARIS_KONTKS);
    return JSON.stringify({ jumlah: rows.length, tugas: rows });
  }

  if (nama === "cari_tugas") {
    const kata = String(args?.kata || "")
      .trim()
      .toLowerCase();
    if (!kata) return JSON.stringify({ galat: "kata kosong" });
    const temuan: TugasRingkas[] = [];
    for (const p of await proyekTerlihat(pemanggil)) {
      const rows = await taskRepository.findRawProjectTasks(String(p.id));
      (rows || [])
        .filter((t: any) => {
          const teks = `${t.title || ""} ${t.taskKey || ""}`.toLowerCase();
          return teks.includes(kata);
        })
        .slice(0, 12)
        .forEach((t: any) => temuan.push(persempit(t, String(p.name || p.id))));
    }
    const dipotong = temuan.slice(0, MAKS_BARIS_KONTKS);
    return JSON.stringify({ jumlah: dipotong.length, tugas: dipotong });
  }

  if (nama === "ringkas_proyek") {
    const kunci = String(args?.proyekId || "")
      .trim()
      .toLowerCase();
    const proyek = (await proyekTerlihat(pemanggil)).find(
      (p: any) =>
        String(p.id).toLowerCase() === kunci || String(p.name || "").toLowerCase() === kunci
    );
    if (!proyek) {
      return JSON.stringify({
        galat: "Proyek itu tidak ada di daftar yang boleh dilihat pengguna ini. Jangan dikarang.",
      });
    }
    const rows = await taskRepository.findRawProjectTasks(String(proyek.id));
    const semua = (rows || []).slice(0, MAKS_TUGAS_PER_PROYEK);
    const selesai = semua.filter((t: any) => !terbuka(t)).length;
    const lembur = semua.filter((t: any) => terbuka(t) && lewatTenggat(t)).length;
    return JSON.stringify({
      proyek: String(proyek.name || proyek.id),
      totalTugas: semua.length,
      selesai,
      terlambat: lembur,
      terbuka: semua.length - selesai,
    });
  }

  return JSON.stringify({ galat: `Perkakas tidak dikenal: ${nama}` });
}

const SISTEM = (bahasa: string) =>
  [
    `Kamu adalah "LanPro AI Assistant", asisten kerja pribadi di platform manajemen proyek LanPro. Jawab dalam bahasa ${bahasa === "en" ? "English" : "Bahasa Indonesia"}.`,
    "Kamu punya data nyata di bawah ini dan perkakas untuk mengambil sisanya. Jawab BERDASARKAN data itu; sebut kode tugas (mis. [LNP-12]) bila kamu merujuknya.",
    "Kalau datanya tidak ada di konteks dan tidak bisa diambil dengan perkakas, katakan singkat bahwa datanya tidak ada dan apa yang perlu dicek. JANGAN mengarang nama tugas, angka, atau tanggal.",
    "Gaya: seperti rekan senior yang membantu - langsung, konkret, maksimal 4 kalimat, tanpa pembuka basa-basi, tanpa tanda kutip.",
    "Bila pertanyaan bisa dijawab dengan perkakas (tugas saya, cari tugas, ringkas proyek), panggil perkakas itu lebih dulu.",
  ].join("\n");

export type PutusanAsisten = { teks: string; perkakas: string[] };

/** Isi pesan ketika kunci API tidak ada atau model gagal: jujur, bukan persona. */
const TeksTanpaMesin = (bahasa: string) =>
  bahasa === "en"
    ? "The assistant engine is not connected right now (no model key configured), so I cannot read your data. Everything else in LanPro works as usual."
    : "Mesin asisten sedang tidak tersambung (kunci model belum dipasang), jadi saya belum bisa membaca data Anda. Bagian LanPro yang lain tetap berjalan seperti biasa.";

/**
 * Bentuk minimal klien Gemini yang dipakai di sini — sengaja tidak lebih lebar
 * dari yang dibutuhkan. `GenerateContentResponse` SDK punya `text` (getter
 * string) dan `functionCalls` (getter daftar), jadi keduanya dibaca sebagai properti.
 */
export type KlienAi = {
  models: {
    generateContent: (params: any) => Promise<{
      text?: string;
      functionCalls?: Array<{ name?: string; args?: Record<string, any> }>;
    }>;
  };
};

/** Hasil perkakas sudah JSON; kalau bukan (perkakas tak dikenal), dibungkus. */
function muatJson(teks: string): Record<string, any> {
  try {
    const nilai = JSON.parse(teks);
    return nilai && typeof nilai === "object" ? nilai : { nilai };
  } catch {
    return { teks };
  }
}

/**
 * Satu lingkaran tanya-jawab: konteks + memori -> model -> (perkakas -> model)
 * sampai jawaban teks atau MAKS_ROUNDS_ALAT tercapai.
 */
export async function jawabAsisten(params: {
  pesan: string;
  riwayat: Array<{ peran: "user" | "model"; teks: string }>;
  pemanggil: PemanggilAsisten;
  bahasa?: string;
  ai?: KlienAi | null;
  konteks?: string;
}): Promise<PutusanAsisten> {
  const bahasa = params.bahasa === "en" ? "en" : "id";
  const { pesan, riwayat, pemanggil, ai } = params;

  if (!ai) return { teks: TeksTanpaMesin(bahasa), perkakas: [] };

  const konteks = params.konteks ?? (await bangunKonteks(pemanggil));
  // Aplikasi menyimpan pesan penanya SEBELUM meminta balasan (LiveChatWidget
  // mengirim ke /api/chat/messages lalu /api/chat/assistant), jadi riwayat yang
  // baru dibaca hampir selalu ditutup oleh pertanyaan yang sama. Tanpa langkah
  // ini model melihat pertanyaannya sendiri dua kali.
  const memori = riwayat.slice(-9);
  const ekor = memori[memori.length - 1];
  if (ekor && ekor.peran === "user" && ekor.teks.trim() === pesan.trim()) memori.pop();

  // Grounding ditempel ke pertanyaan, bukan jadi giliran sendiri: dua pesan
  // berturut-turut dari peran "user" (konteks lalu pertanyaan) membuat riwayat
  // menabrak aturan giliran model-pengguna yang dipakai Gemini untuk perkakas.
  // Lihat loop di bawah: functionCall (model) -> functionResponse (user).
  const isi: any[] = [
    ...memori.map((m) => ({ role: m.peran, parts: [{ text: m.teks }] })),
    { role: "user", parts: [{ text: `[Konteks data pengguna]\n${konteks}\n\n${pesan}` }] },
  ];

  const dipakai: string[] = [];
  const config = {
    temperature: 0.3,
    systemInstruction: SISTEM(bahasa),
    tools: [{ functionDeclarations: DEKLARASI_ALAT }],
  };
  try {
    // generateContentWithFallback dipakai, bukan panggilan langsung: ia sudah
    // menyimpan daftar model cadangan + retry kuota yang dipakai seluruh fitur
    // AI lain di repo ini, dan ia memanggil `ai.models.generateContent` — jadi
    // `ai` sungguhan dan `ai` tiruan hasil uji lewat jalur yang sama.
    let respons = await generateContentWithFallback(ai, {
      model: MODEL_ASISTEN,
      contents: isi,
      config,
    });

    for (let ronde = 0; ronde < MAKS_ROUNDS_ALAT; ronde++) {
      const daftar = Array.isArray(respons?.functionCalls) ? respons.functionCalls : [];
      if (!daftar.length) break;

      const panggilan: any[] = [];
      const balasan: any[] = [];
      for (const p of daftar) {
        const nama = String(p?.name || "");
        const args = (p?.args || {}) as Record<string, any>;
        const hasil = await jalankanAlat(nama, args, pemanggil);
        dipakai.push(nama);
        panggilan.push({ functionCall: { name: nama, args } });
        balasan.push({ functionResponse: { name: nama, response: muatJson(hasil) } });
      }

      // Pemanggilan dan hasilnya masuk sebagai bagian functionCall /
      // functionResponse, bukan ditempel sebagai teks: kalau riwayat hanya
      // berisi teks, model ronde kedua tidak melihat bahwa ia sudah meminta
      // data dan mengulang permintaannya sampai ronde habis.
      isi.push({ role: "model", parts: panggilan });
      isi.push({ role: "user", parts: balasan });

      respons = await generateContentWithFallback(ai, {
        model: MODEL_ASISTEN,
        contents: isi,
        config,
      });
    }

    const teks = typeof respons?.text === "string" ? respons.text : "";
    if (!teks.trim()) return { teks: TeksTanpaMesin(bahasa), perkakas: dipakai };
    return { teks: teks.trim(), perkakas: dipakai };
  } catch (error) {
    // Galat jaringan/kuota tidak boleh terlihat seperti asisten yang menjawab
    // asal; pengguna berhak tahu mesinnya sedang tidak reachable.
    console.warn("[ASISTEN] Mesin gagal, menjawab jujur tanpa karangan:", error);
    return { teks: TeksTanpaMesin(bahasa), perkakas: dipakai };
  }
}
