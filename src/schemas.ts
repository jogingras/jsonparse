import { z } from "zod";

export const PersonSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email().optional(),
});

export type Person = z.infer<typeof PersonSchema>;