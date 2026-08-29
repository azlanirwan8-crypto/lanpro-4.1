import { z } from "zod";

export const createProjectModuleSchema = z.object({
  projectId: z.string().min(1, "projectId wajib diisi"),
  namaModul: z.string().min(1, "namaModul wajib diisi").max(255),
  keterangan: z.string().max(10000).optional().nullable(),
  id: z.string().optional(),
});

export const updateProjectModuleSchema = z.object({
  namaModul: z.string().min(1, "namaModul wajib diisi").max(255).optional(),
  projectId: z.string().optional(),
  keterangan: z.string().max(10000).optional().nullable(),
});
