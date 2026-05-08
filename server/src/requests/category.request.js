import { z } from "zod";

export const categoryRequestSchema = z.object({
  name: z.string().min(2).max(255),
  description: z.string().max(500).optional().or(z.literal("")),
  icon: z.string().max(50).optional().or(z.literal("")),
  parent_id: z.number().int().nullable().optional(),
});
