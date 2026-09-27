import { z } from "zod";

export const createMasterDataSchema = z.object({
  type: z.string().min(1, "Type master data wajib diisi").max(100),
  label: z.string().max(255).optional().nullable(),
  code: z.string().max(100).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  order: z.number().optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  fieldType: z.string().max(100).optional().nullable(),
  dropdownOptions: z.any().optional(),
  role_type: z.string().max(100).optional().nullable(),
  roleType: z.string().max(100).optional().nullable(),
  id: z.string().max(100).optional(),
  isTerminal: z.boolean().optional().nullable(),
});

export const updateMasterDataSchema = z.object({
  label: z.string().max(255).optional().nullable(),
  type: z.string().max(100).optional().nullable(),
  color: z.string().max(100).optional().nullable(),
  icon: z.string().max(100).optional().nullable(),
  order: z.number().optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  fieldType: z.string().max(100).optional().nullable(),
  dropdownOptions: z.any().optional(),
  role_type: z.string().max(100).optional().nullable(),
  roleType: z.string().max(100).optional().nullable(),
  isTerminal: z.boolean().optional().nullable(),
});
