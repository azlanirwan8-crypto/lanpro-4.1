import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Judul task tidak boleh kosong"),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  reporterId: z.string().optional().nullable(),
  sprintId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  storyPoints: z.any().optional(),
  projectRisk: z.string().optional().nullable(),
  acceptanceCriteria: z.any().optional(),
  customFields: z.any().optional(),
  tags: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  attachments: z.array(z.any()).optional(),
  linkedTaskIds: z.array(z.any()).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1, "Judul task tidak boleh kosong").optional(),
  description: z.string().optional().nullable(),
  status: z.string().optional(),
  type: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional().nullable(),
  reporterId: z.string().optional().nullable(),
  sprintId: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  storyPoints: z.any().optional(),
  estimatedHours: z.any().optional(),
  loggedHours: z.any().optional(),
  acceptanceCriteria: z.any().optional(),
  version: z.any().optional(),
  isBlocked: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  orderIndex: z.number().optional(),
  attachments: z.array(z.any()).optional(),
  linkedTaskIds: z.array(z.any()).optional(),
  // Item #139 — tanpa entri di sini, validasiBody membuang kelima field ini
  // (req.body diganti hasil parse zod) sebelum rute sempat melihatnya. Jadi
  // memperluas allowlist rute saja tidak cukup.
  resolution: z.string().optional().nullable(),
  release: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  environment: z.string().optional().nullable(),
  projectRisk: z.string().optional().nullable(),
});

export const reorderTaskIdsSchema = z.object({
  orderedIds: z.array(z.string()),
});

export const addTaskCommentSchema = z.object({
  content: z.string().min(1, "Konten komentar tidak boleh kosong"),
  userId: z.string().optional(),
  authorId: z.string().optional(),
});
