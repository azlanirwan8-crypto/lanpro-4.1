/**
 * Rute obrolan antar pengguna, termasuk simulasi balasan berbantuan AI.
 *
 * Menggunakan chatRepository untuk operasi data.
 */
import express from "express";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import { generateContentWithFallback } from "../services/ai.service";
import { matchesCaller } from "../services/task.service";
import { chatRepository } from "../repositories/chat.repository";

const router = express.Router();

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
    res
      .status(500)
      .json({
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
      return res
        .status(400)
        .json({
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
    res
      .status(500)
      .json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
  }
});

router.post("/api/chat/messages", async (req: any, res) => {
  try {
    const { senderId, receiverId, message, timestamp } = req.body;
    if (!senderId || !receiverId || !message) {
      return res
        .status(400)
        .json({
          status: "error",
          code: "srv.senderid_receiverid_dan_message",
          message: "senderId, receiverId, dan message diperlukan.",
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
    const finalTs = timestamp || new Date().toISOString();

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
    res
      .status(500)
      .json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
  }
});

router.put("/api/chat/messages/read", async (req: any, res) => {
  try {
    const { senderId, receiverId } = req.body;
    if (!senderId || !receiverId) {
      return res
        .status(400)
        .json({
          status: "error",
          code: "srv.senderid_dan_receiverid_diperlukan",
          message: "senderId dan receiverId diperlukan.",
        });
    }
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
    res
      .status(500)
      .json({
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
    res
      .status(500)
      .json({
        status: "error",
        code: "srv.terjadi_kesalahan_internal_server",
        message: "Terjadi kesalahan internal server",
      });
  }
});

router.post("/api/chat/simulate-reply", async (req, res) => {
  try {
    const { senderId, receiverId, message, senderName, senderRole } = req.body;
    if (!senderId || !receiverId || !message) {
      return res
        .status(400)
        .json({
          status: "error",
          code: "srv.senderid_receiverid_dan_message",
          message: "senderId, receiverId, dan message diperlukan.",
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

        const isAiAssistant = senderId === "lanpro-ai";
        const prompt = isAiAssistant
          ? `Anda adalah "LanPro AI Assistant", asisten kecerdasan buatan super pintar, ramah, dan solutif di platform manajemen proyek SDLC "LanPro".
Anda baru saja menerima pesan dari pengguna: "${message}"

Berikan jawaban yang membantu, profesional, dan mengesankan dalam Bahasa Indonesia yang santai, modern, dan sopan (gaya tech startup Jakarta).
Berikan saran praktis seputar manajemen tugas, debugging, figma, database, atau motivasi kerja.
Jaga agar jawaban tetap ringkas dan padat (maksimal 2-3 kalimat saja) seperti pesan chat instan di Slack/Teams. Jangan gunakan kata pengantar atau tanda kutip, langsung tulis balasannya.`
          : `Anda adalah rekan kerja tim profesional bernama "${replySenderName}" dengan peran "${replySenderRole}" di tim proyek "LanPro" (sebuah Platform manajemen SDLC kelas profesional).
Anda baru saja menerima pesan chat berikut dari rekan Anda:
"${message}"

Tolong berikan balasan chat yang sangat realistis, ramah, profesional, menggunakan Bahasa Indonesia yang santai tapi sopan (seperti bahasa profesional startup/tech Jakarta).
Tanggapi pesan tersebut secara langsung dan relevan sesuai dengan peran Anda (${replySenderRole}):
- Jika Anda adalah Siti Rahma (IT Head), fokuslah pada arsitektur, database, pipeline release, performa, atau code quality.
- Jika Anda adalah Rian Hidayat (PM), fokuslah pada deadlines, sprint backlog, manajemen resiko, koordinasi tim, atau Story Points.
- Jika Anda adalah Budi Santoso (Developer), bicarakan tentang debugging, penulisan kode, progress tugas teknis, pull request, atau tantangan implementasi.
- Jika Anda adalah Dewi Lestari (UI/UX Designer), bicarakan tentang estetika layout, kontras warna, figma, aset visual, responsive web, atau feedback user experience.

Balasan Anda harus singkat (1-3 kalimat saja) layaknya pesan instan di Slack atau WA, jangan terlalu formal atau kaku. Jangan ada kata pengantar atau tanda kutip, langsung tulis balasannya saja.`;

        const response = await generateContentWithFallback(ai, {
          model: "gemini-flash-latest",
          contents: prompt,
          config: {
            temperature: 0.8,
          },
        });

        if (response && response.text) {
          replyText = response.text.trim();
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

      if (role.includes("head") || role.includes("architect") || replySenderName.includes("Siti")) {
        options = [
          "Halo! Saya sedang mereview skema database terbaru dan integrasi gateway. Ada hal spesifik yang ingin dikoordinasikan terkait modul core platform?",
          "Terima kasih infonya. Terkait pipeline deployment, tolong pastikan port 3000 sudah terkonfigurasi dengan benar di nginx proxy ya.",
          "Bagus sekali. Rencana migrasi tabel sudah aman, kita akan eksekusi setelah testing di staging selesai. Kabari jika butuh bantuan debug.",
          "Saya sedang melihat laporan audit logs untuk aktivitas perubahan skema. Kita perlu memitigasi kemungkinan downtime pada release berikutnya.",
        ];
      } else if (
        role.includes("manager") ||
        role.includes("pm") ||
        replySenderName.includes("Rian")
      ) {
        options = [
          "Halo! Terkait sprint backlog kita minggu ini, apakah ada hambatan (blocker) yang perlu kita diskusikan bersama?",
          "Siap, terima kasih atas updatenya. Tolong pastikan Story Points di task diupdate ya agar velocity sprint kita terpantau presisi.",
          "Untuk milestone rilis hybrid berikutnya, saya sedang mengoordinasikan jadwal dengan stakeholders. Tetap semangat rekan-rekan!",
          "Bisa tolong siapkan ringkasan progres untuk bahan meeting besok pagi? Cukup 3 poin utama saja.",
        ];
      } else if (
        role.includes("user") ||
        role.includes("dev") ||
        replySenderName.includes("Budi")
      ) {
        options = [
          "Siap mas/mbak! Saya sedang fokus memperbaiki bug Navbar di Safari mobile dulu ya. Setelah ini selesai, saya langsung lanjut ke task dependensi berikutnya.",
          "Aman! Tadi saya sudah coba pull code terbaru, jalurnya lancar tanpa konflik. Ada bagian kode tertentu yang perlu saya bantu review?",
          "Untuk integrasi REST API, saya sedang mencocokkan payload JSON-nya. Sejauh ini aman, tinggal nunggu approval pull request dari tim lead.",
          "Waduh, tadi sempat ada error koneksi DB di lokal saya, tapi sekarang sudah teratasi setelah diswitch ke fallback JSON local. Thank you infonya!",
        ];
      } else if (
        role.includes("viewer") ||
        role.includes("design") ||
        replySenderName.includes("Dewi")
      ) {
        options = [
          "Halo! Desain mockup figma untuk flow kolaborasi dan bagan timeline waterfall sudah saya finalisasi. Silakan dicek kontras warna dan responsive layout-nya.",
          "Terima kasih sarannya. Saya setuju, ukuran font di card details memang agak kekecilan di mobile screen. Akan segera saya sesuaikan ukuran padding-nya.",
          "Untuk layout visual dashboard baru, saya menggunakan pendekatan monokromatik abu-abu gelap dengan aksen oranye terang agar terkesan modern dan tangguh.",
          "Siap! Jika butuh aset SVG baru atau panduan layout bento grid, langsung colek saya saja ya.",
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
      data: {
        id,
        senderId,
        receiverId,
        message: replyText,
        timestamp,
        read: false,
      },
    });
  } catch (error: any) {
    console.error("LOG ANOMALI CRITICAL: POST /api/chat/simulate-reply error:", error);
    res
      .status(500)
      .json({
        status: "error",
        code: "srv.gagal_membuat_simulasi_balasan",
        message: "Gagal membuat simulasi balasan: " + error.message,
      });
  }
});

export default router;
