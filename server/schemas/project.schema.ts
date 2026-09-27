import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Nama proyek tidak boleh kosong"),
  description: z.string().optional().nullable(),
  ownerId: z.string().min(1, "Owner ID wajib diisi"),
  status: z.string().optional(),
  projectKey: z.string().optional(),
  category: z.string().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1, "Nama proyek tidak boleh kosong").optional(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  projectKey: z.string().optional(),
  category: z.string().optional(),
  methodology: z.string().optional(),
  custom_roles: z.any().optional(),
  customRoles: z.any().optional(),
  columns: z.any().optional(),
});

export const updateDashboardLayoutSchema = z.object({
  layout: z.array(z.any()),
});

export const addProjectMemberSchema = z.object({
  userId: z.string().min(1, "User ID wajib diisi"),
  role: z.string().optional(),
});

export const updateProjectMemberRoleSchema = z.object({
  role: z.string().min(1, "Role wajib diisi"),
});
