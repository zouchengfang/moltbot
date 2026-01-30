import { z } from "zod";

const WeComAccountSchema = z
  .object({
    webhookUrl: z.string().url().optional(),
    name: z.string().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export const WeComConfigSchema = z
  .object({
    webhookUrl: z.string().url().optional(),
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    accounts: z.record(z.string(), WeComAccountSchema.optional()).optional(),
  })
  .strict();
