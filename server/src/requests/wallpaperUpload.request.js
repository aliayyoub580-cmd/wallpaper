import { z } from "zod";

export const wallpaperUploadRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional().or(z.literal("")),
  categories: z.array(z.coerce.number().int()).optional(),
  categoryIds: z.string().optional(),
});
