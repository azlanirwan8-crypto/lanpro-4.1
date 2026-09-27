import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(1, "Username/Email dan Password wajib diisi."),
  password: z.string().min(1, "Username/Email dan Password wajib diisi."),
  force: z.boolean().optional(),
  browserSessionId: z.string().optional(),
});

export const registerSchema = z.object({
  name: z.string().min(3, "Nama minimal 3 karakter").max(25, "Nama maksimal 25 karakter").optional(),
  nama_lengkap: z.string().min(3).max(25).optional(),
  displayName: z.string().min(3).max(25).optional(),
  email: z.string().email("Format email tidak valid (contoh: user@gmail.com)"),
  username: z
    .string()
    .regex(/^[a-zA-Z]+$/, "Username hanya boleh berupa huruf")
    .max(10, "Username maksimal 10 karakter"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[A-Z]/, "Password harus mengandung minimal 1 huruf besar (A-Z)")
    .regex(/[a-z]/, "Password harus mengandung minimal 1 huruf kecil (a-z)")
    .regex(/[0-9]/, "Password harus mengandung minimal 1 angka (0-9)")
    .regex(/[@$!%*?&]/, "Password harus mengandung minimal 1 simbol khusus (@$!%*?&)"),
  role: z.string().optional(),
  status: z.string().optional(),
  department: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  permissions: z.record(z.string(), z.any()).nullable().optional(),
  id: z.string().optional(),
  uid: z.string().optional(),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password baru minimal 6 karakter"),
});

export const forceLogoutSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
  browserSessionId: z.string().optional(),
});
