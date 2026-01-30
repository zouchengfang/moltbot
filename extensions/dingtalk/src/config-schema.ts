import { z } from "zod";

const DingTalkAccountSchema = z
  .object({
    webhookUrl: z.string().url().optional(),
    secret: z.string().optional(),
    name: z.string().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export const DingTalkConfigSchema = z
  .object({
    webhookUrl: z.string().url().optional(),
    secret: z.string().optional(),
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    accounts: z.record(z.string(), DingTalkAccountSchema.optional()).optional(),
  })
  .strict();
