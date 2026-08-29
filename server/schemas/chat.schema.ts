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
