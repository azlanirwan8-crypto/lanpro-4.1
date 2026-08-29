import { z } from "zod";

export const completeSsoRegistrationSchema = z.object({
  username: z.string().min(1, "Username wajib diisi").max(30, "Username maksimal 30 karakter"),
});
