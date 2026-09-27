import { z } from "zod";

export const sendChatMessageSchema = z.object({
  senderId: z.string().min(1, "senderId wajib diisi"),
  receiverId: z.string().min(1, "receiverId wajib diisi"),
  message: z
    .string()
    .min(1, "Pesan tidak boleh kosong")
    .max(5000, "Pesan terlalu panjang (maksimum 5000 karakter)"),
});

export const markChatReadSchema = z.object({
  senderId: z.string().min(1, "senderId wajib diisi"),
  receiverId: z.string().min(1, "receiverId wajib diisi"),
});

export const simulateReplySchema = z.object({
  senderId: z.string().min(1, "senderId wajib diisi"),
  receiverId: z.string().min(1, "receiverId wajib diisi"),
  message: z.string().min(1, "Pesan tidak boleh kosong"),
  senderName: z.string().optional(),
  senderRole: z.string().optional(),
});

/**
 * #551 — asisten pribadi. `userId` SENGAJA tidak ada di sini: identitas penanya
 * diambil dari token (req.user), supaya tidak ada yang bisa meminta data orang
 * lain dengan mengirim id milik orang lain.
 *
 * `.trim()` sebelum `.min(1)`: pertanyaan yang hanya berisi spasi tidak layak
 * membangunkan seluruh mesin (baca proyek + panggilan model).
 */
export const assistantSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Pesan tidak boleh kosong")
    .max(2000, "Pesan terlalu panjang (maksimum 2000 karakter)"),
  bahasa: z.enum(["id", "en"]).optional(),
  /**
   * "Mata" asisten — snapshot flowchart yang sedang dibuka user (fitur
   * screenContext). Opsional; dipangkas ketat di rute sebelum masuk prompt
   * supaya klien jahat tidak bisa membajak konteks dengan teks panjang.
   */
  layar: z
    .object({
      view: z.string().trim().max(40).default("flowchart"),
      flowName: z.string().trim().max(120).nullable().optional(),
      nodes: z
        .array(
          z.object({
            id: z.string().trim().max(60),
            type: z.string().trim().max(40),
            label: z.string().trim().max(80),
          })
        )
        .max(60)
        .default([]),
      edges: z
        .array(
          z.object({
            fromLabel: z.string().trim().max(80),
            toLabel: z.string().trim().max(80),
            label: z.string().trim().max(80).optional(),
          })
        )
        .max(80)
        .default([]),
      selectedNodeId: z.string().trim().max(60).nullable().optional(),
    })
    .optional(),
});
