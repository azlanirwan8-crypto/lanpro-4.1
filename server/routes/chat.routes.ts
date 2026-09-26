/**
 * Rute obrolan antar pengguna, termasuk asisten pribadi "LanPro AI".
 *
 * Menggunakan chatRepository untuk operasi data. #551 menambah
 * `/api/chat/assistant` (di bagian bawah berkas ini) dan menutup lubang
 * penulisan di `/api/chat/simulate-reply`; keduanya dijelaskan di tempatnya.
 */
import express from "express";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { generateContentWithFallback } from "../services/ai.service";
import { matchesCaller } from "../services/task.service";
import { chatRepository } from "../repositories/chat.repository";
import { jawabAsisten, statusMesin } from "../services/asisten";
import { validasiBody } from "../middleware/validate";
import {
  sendChatMessageSchema,
  markChatReadSchema,
  simulateReplySchema,
  assistantSchema,
} from "../schemas/chat.schema";

const router = express.Router();

/** Akun virtual asisten. Nilainya sama dengan `UserProfile` di LiveChatWidget. */
const ID_ASISTEN = "lanpro-ai";

router.get("/api/chat/last-messages", async (req: any, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res
        .status(400)
        .json({ status: "error", code: "srv.userid_diperlukan", message: "userId diperlukan." });
    }
    if (!matchesCaller(req.user, userId)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_anda_hanya",
        message: "Akses ditolak: Anda hanya dapat melihat percakapan Anda sendiri.",
      });
    }

    const allRows = await chatRepository.findLastMessages(userId);
    res.json({ status: "success", data: allRows });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET /api/chat/last-messages error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

router.get("/api/chat/messages", async (req: any, res) => {
  try {
    const { senderId, receiverId } = req.query;
    if (!senderId || !receiverId) {
      return res.status(400).json({
        status: "error",
        code: "srv.senderid_dan_receiverid_diperlukan",
        message: "senderId dan receiverId diperlukan.",
      });
    }
    if (!matchesCaller(req.user, senderId) && !matchesCaller(req.user, receiverId)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_anda_bukan",
        message: "Akses ditolak: Anda bukan bagian dari percakapan ini.",
      });
    }

    const rows = await chatRepository.findConversationMessages(senderId, receiverId);
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET /api/chat/messages error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

router.post("/api/chat/messages", async (req: any, res) => {
  try {
    const { senderId, receiverId, message } = req.body || {};
    if (!senderId || !receiverId || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({
        status: "error",
        code: "srv.senderid_receiverid_dan_message",
        message: "senderId, receiverId, dan message diperlukan.",
      });
    }
    if (message.length > 5000) {
      return res.status(400).json({
        status: "error",
        code: "srv.pesan_terlalu_panjang",
        message: "Pesan terlalu panjang (maksimum 5000 karakter).",
      });
    }
    if (!matchesCaller(req.user, senderId)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_anda_tidak",
        message: "Akses ditolak: Anda tidak dapat mengirim pesan mengatasnamakan pengguna lain.",
      });
    }

    const id = crypto.randomUUID();
    const finalTs = new Date().toISOString();

    await chatRepository.createMessage({
      id,
      senderId,
      receiverId,
      message,
      timestamp: finalTs,
      read: false,
    });

    res.json({
      status: "success",
      data: { id, senderId, receiverId, message, timestamp: finalTs, read: false },
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: POST /api/chat/messages error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

router.put("/api/chat/messages/read", validasiBody(markChatReadSchema), async (req: any, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (!matchesCaller(req.user, receiverId)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_anda_hanya_2",
        message: "Akses ditolak: Anda hanya dapat menandai percakapan Anda sendiri sebagai dibaca.",
      });
    }

    await chatRepository.markAsRead(senderId, receiverId);
    res.json({
      status: "success",
      code: "srv.pesan_berhasil_ditandai_sebagai",
      message: "Pesan berhasil ditandai sebagai dibaca.",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: PUT /api/chat/messages/read error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

/**
 * Menghapus satu pesan — item #248.
 *
 * SIAPA YANG BOLEH: pengirimnya saja. Bukan penerimanya, dan bukan admin.
 * Percakapan ini privat antar dua orang; memberi peran lain hak menghapus
 * berarti memberi mereka hak mengubah isi percakapan yang tidak mereka ikuti.
 * Penerima yang terganggu punya jalur lain — itu urusan moderasi, dan moderasi
 * yang belum diputuskan lebih baik tidak ada daripada ditebak.
 *
 * HAPUS KERAS, bukan penanda. Setiap DELETE di repo ini menghapus barisnya
 * (`master-data`, `milestones`, `documents`, `users`); memperkenalkan
 * soft-delete di sini berarti melahirkan konsep baru yang harus dipahami
 * setiap kueri `Messages` yang sudah ada — dan satu kueri yang lupa menyaring
 * akan menampilkan pesan yang pengirimnya yakin sudah hilang.
 */
router.delete("/api/chat/messages/:id", async (req: any, res) => {
  try {
    const { id } = req.params;

    const senderId = await chatRepository.findSenderIdById(id);
    if (!senderId) {
      return res.status(404).json({
        status: "error",
        code: "srv.pesan_tidak_ditemukan",
        message: "Pesan tidak ditemukan.",
      });
    }

    if (!matchesCaller(req.user, senderId)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_hapus_pesan",
        message: "Akses ditolak: Anda hanya dapat menghapus pesan yang Anda kirim sendiri.",
      });
    }

    await chatRepository.deleteMessage(id);
    res.json({
      status: "success",
      code: "srv.pesan_berhasil_dihapus",
      message: "Pesan berhasil dihapus.",
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: DELETE /api/chat/messages/:id error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

router.get("/api/chat/unread-counts", async (req: any, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res
        .status(400)
        .json({ status: "error", code: "srv.userid_diperlukan", message: "userId diperlukan." });
    }
    if (!matchesCaller(req.user, userId)) {
      return res.status(403).json({
        status: "error",
        code: "srv.akses_ditolak_anda_hanya_3",
        message: "Akses ditolak: Anda hanya dapat melihat notifikasi Anda sendiri.",
      });
    }

    const rows = await chatRepository.getUnreadCounts(userId);
    res.json({ status: "success", data: rows });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: GET /api/chat/unread-counts error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.terjadi_kesalahan_internal_server",
      message: "Terjadi kesalahan internal server",
    });
  }
});

/**
 * Asisten pribadi (#551).
 *
 * Tiga hal yang bedakan rute ini dari simulate-reply (yang sejak #551 tidak
 * pernah dipakai lagi oleh asisten, hanya oleh sakelar balasan simulasi rekan):
 *
 *  1. IDENTITAS DARI TOKEN, BUKAN DARI BODY. `pemanggil` dibangun dari
 *     `req.user`, dan setiap perkakas di `services/asisten.ts` memfilter ulang
 *     hasilnya dengan cakupan itu — jadi tidak ada jalur untuk meminta jawaban
 *     yang menyingkap data orang lain.
 *  2. MENULIS HANYA ATAS NAMA ASISTEN. `senderId` baris yang disimpan adalah
 *     konstanta `ID_ASISTEN`, bukan nilai kiriman klien.
 *  3. TANPA KUNCI API TIDAK ADA KARANGAN. `jawabAsisten` memulangkan kalimat
 *     jujur bahwa mesinnya tidak tersambung, bukan persona rekan fiktif. Fitur
 *     tetap jalan seperti biasa — tidak ada pintu yang tertutup karena kunci
 *     model belum dipasang.
 */
router.post("/api/chat/assistant", validasiBody(assistantSchema), async (req: any, res) => {
  try {
    const pemanggilId = String(req.user?.id ?? req.user?.uid ?? "");
    if (!pemanggilId) {
      return res.status(401).json({
        status: "error",
        code: "srv.sesi_asisten_diperlukan",
        message: "Sesi diperlukan: asisten hanya menjawab untuk akun yang sedang masuk.",
      });
    }

    const pemanggil = {
      id: pemanggilId,
      role: String(req.user?.role || "user"),
      nama: String(req.user?.displayName || req.user?.username || pemanggilId),
    };

    // Riwayat dibaca dari percakapan yang sama dengan yang dipakai widget, jadi
    // kata "yang tadi" punya rujukan. Batas jumlah barisnya sudah dipegang
    // repository (BATAS_RIWAYAT_PESAN).
    const barisRiwayat = await chatRepository.findConversationMessages(ID_ASISTEN, pemanggilId);
    const riwayat = (barisRiwayat || []).map((r: any) => ({
      peran: String(r.senderId) === ID_ASISTEN ? ("model" as const) : ("user" as const),
      teks: String(r.message || ""),
    }));

    const apiKey = process.env.GEMINI_API_KEY;
    // Kunci template (`.env` kiriman berisi "MY_...") dihitung TIDAK ADA.
    // Klien yang dibangun darinya selalu gagal, jadi lebih baik langsung
    // menjawab dari data daripada membakar anggaran waktu pada panggilan mati.
    const ai =
      apiKey && statusMesin().keadaan === "siap"
        ? new GoogleGenAI({
            apiKey,
            httpOptions: { headers: { "User-Agent": "aistudio-build" } },
          })
        : null;

    const { message, bahasa } = req.body;
    const putusan = await jawabAsisten({
      pesan: message,
      riwayat,
      pemanggil,
      bahasa: bahasa || "id",
      ai,
    });

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const teks = putusan.teks;

    await chatRepository.createMessage({
      id,
      senderId: ID_ASISTEN,
      receiverId: pemanggilId,
      message: teks,
      timestamp,
      read: false,
    });

    res.json({
      status: "success",
      data: {
        id,
        senderId: ID_ASISTEN,
        receiverId: pemanggilId,
        message: teks,
        timestamp,
        read: false,
      },
      meta: { perkakas: putusan.perkakas, mesin: !!ai },
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: POST /api/chat/assistant error:", error);
    res.status(500).json({
      status: "error",
      code: "srv.gagal_mendapatkan_jawaban_asisten",
      message: "Gagal mendapatkan jawaban asisten.",
    });
  }
});

/**
 * Balasan otomatis untuk chat dengan REKAN (bukan asisten), sakelar "Auto reply
 * simulation" di widget (#551 menyesuaikan, bukan menghapus).
 *
 * PINTU YANG DITUTUP #551: rute ini menulis baris Messages atas nama `senderId`
 * mana pun yang dikirim klien, tanpa memeriksa siapa yang memanggil. Sebelum
 * 26 Sep 2026 akun mana pun bisa menanam "kata orang" di percakapan siapa pun.
 * Sekarang penjaganya `receiverId` harus si pemanggil sendiri: ia tetap boleh
 * menyalakan balasan simulasi di threads miliknya, dan tidak lagi boleh menulis
 * di threads orang lain.
 *
 * Cabang "lanpro-ai" pada prompt di bawah juga dicabut: asisten punya jalurnya
 * sendiri (/api/chat/assistant) yang menjawab dari data nyata, jadi tidak ada
 * lagi alasan untuk menyamar jadi rekan.
 */
router.post(
  "/api/chat/simulate-reply",
  validasiBody(simulateReplySchema),
  async (req: any, res) => {
    try {
      const { senderId, receiverId, message, senderName, senderRole } = req.body;
      if (!matchesCaller(req.user, receiverId)) {
        return res.status(403).json({
          status: "error",
          code: "srv.akses_ditolak_simulasi_hanya",
          message:
            "Akses ditolak: balasan simulasi hanya bisa diminta untuk percakapan Anda sendiri.",
        });
      }

      const replySenderName = senderName || "Rekan Tim";
      const replySenderRole = senderRole || "user";

      let replyText = "";
      const apiKey = process.env.GEMINI_API_KEY;

      if (apiKey) {
        try {
          const ai = new GoogleGenAI({
            apiKey: apiKey,
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          });

          const prompt = `Anda adalah rekan kerja tim profesional bernama "${replySenderName}" dengan peran "${replySenderRole}" di tim proyek "LanPro" (sebuah Platform manajemen SDLC kelas profesional).
Anda baru saja menerima pesan chat berikut dari rekan Anda:
"${message}"

Tolong berikan balasan chat yang sangat realistis, ramah, profesional, menggunakan Bahasa Indonesia yang santai tapi sopan (seperti bahasa profesional startup/tech Jakarta).
Tanggapi pesan tersebut secara langsung dan relevan sesuai dengan peran Anda (${replySenderRole}).

Balasan Anda harus singkat (1-3 kalimat saja) layaknya pesan instan di Slack atau WA, jangan terlalu formal atau kaku. Jangan ada kata pengantar atau tanda kutip, langsung tulis balasannya saja.`;

          const response = await generateContentWithFallback(ai, {
            model: "gemini-flash-latest",
            contents: prompt,
            config: {
              temperature: 0.8,
            },
          });

          if (response && response.text) {
            replyText = String(response.text).trim();
          }
        } catch (geminiError) {
          console.warn(
            "[SIMULATION_API] Gagal menggunakan Gemini API, beralih ke fallback:",
            geminiError
          );
        }
      }

      if (!replyText) {
        const role = String(replySenderRole).toLowerCase();
        let options = [
          "Halo! Terima kasih atas pesannya. Pesan Anda sudah saya terima dan akan segera saya pelajari kembali. Selamat bekerja!",
          "Siap, dipahami. Mari kita tuntaskan sprint ini dengan baik!",
          "Oke, nanti kita bahas detailnya saat sinkronisasi ya.",
        ];

        if (role.includes("head") || role.includes("architect")) {
          options = [
            "Halo! Saya sedang mereview skema database terbaru dan integrasi gateway. Ada hal spesifik yang ingin dikoordinasikan terkait modul core platform?",
            "Terima kasih infonya. Terkait pipeline deployment, tolong pastikan konfigurasi nginx proxy sudah benar ya.",
            "Bagus sekali. Rencana migrasi tabel sudah aman, kita akan eksekusi setelah testing di staging selesai. Kabari jika butuh bantuan debug.",
            "Saya sedang melihat laporan audit logs untuk aktivitas perubahan skema. Kita perlu memitigasi kemungkinan downtime pada release berikutnya.",
          ];
        } else if (role.includes("manager") || role.includes("pm")) {
          options = [
            "Halo! Terkait sprint backlog kita minggu ini, apakah ada hambatan (blocker) yang perlu kita diskusikan bersama?",
            "Siap, terima kasih atas updatenya. Tolong pastikan Story Points di task diupdate ya agar velocity sprint kita terpantau presisi.",
            "Untuk milestone rilis berikutnya, saya sedang mengoordinasikan jadwal dengan stakeholders. Tetap semangat rekan-rekan!",
            "Bisa tolong siapkan ringkasan progres untuk bahan meeting besok pagi? Cukup 3 poin utama saja.",
          ];
        } else if (role.includes("user") || role.includes("dev")) {
          options = [
            "Siap mas/mbak! Saya sedang fokus memperbaiki bug yang ada di antrean dulu ya. Setelah ini selesai, saya langsung lanjut ke task dependensi berikutnya.",
            "Aman! Tadi saya sudah coba pull code terbaru, jalurnya lancar tanpa konflik. Ada bagian kode tertentu yang perlu saya bantu review?",
            "Untuk integrasi REST API, saya sedang mencocokkan payload JSON-nya. Sejauh ini aman, tinggal nunggu approval pull request dari tim lead.",
            "Waduh, tadi sempat ada error koneksi DB di lokal saya, tapi sekarang sudah teratasi. Thank you infonya!",
          ];
        } else if (role.includes("viewer") || role.includes("design")) {
          options = [
            "Halo! Desain mockup untuk flow kolaborasi dan bagan timeline sudah saya finalisasi. Silakan dicek kontras warna dan responsive layout-nya.",
            "Terima kasih sarannya. Saya setuju, ukuran font di card details memang agak kekecilan di mobile screen. Akan segera saya sesuaikan ukuran padding-nya.",
            "Untuk layout visual dashboard baru, saya menggunakan pendekatan monokromatik dengan aksen warna primer agar terkesan modern dan bersih.",
            "Siap! Jika butuh aset SVG baru atau panduan layout, langsung colek saya saja ya.",
          ];
        }

        const randomIndex = Math.floor(Math.random() * options.length);
        replyText = options[randomIndex];
      }

      const id = crypto.randomUUID();
      const timestamp = new Date().toISOString();

      await chatRepository.createMessage({
        id,
        senderId,
        receiverId,
        message: replyText,
        timestamp,
        read: false,
      });

      res.json({
        status: "success",
        data: { id, senderId, receiverId, message: replyText, timestamp, read: false },
      });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/chat/simulate-reply error:", error);
      res.status(500).json({
        status: "error",
        code: "srv.gagal_membuat_simulasi_balasan",
        message: "Gagal membuat simulasi balasan.",
      });
    }
  }
);

export default router;
