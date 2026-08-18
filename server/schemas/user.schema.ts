import { z } from "zod";

export const updateUserSchema = z.object({
  displayName: z.string().optional(),
  name: z.string().optional(),
  nama_lengkap: z.string().optional(),
  username: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.string().optional(),
  status: z.string().optional(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
  permissions: z.record(z.string(), z.any()).optional().nullable(),
  photoURL: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  password: z.string().optional(),
  passwordHash: z.string().optional(),
});

export const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  username: z.string().optional(),
  email: z.string().email("Format email tidak valid").optional().nullable(),
  phone: z.string().optional().nullable(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter").optional(),
  photoURL: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
});
