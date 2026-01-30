import { z } from "zod";

const SmtpAuthSchema = z
  .object({
    user: z.string().optional(),
    pass: z.string().optional(),
  })
  .strict();

const EmailAccountSchema = z
  .object({
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    secure: z.boolean().optional(),
    auth: SmtpAuthSchema.optional(),
    from: z.string().email().optional(),
    name: z.string().optional(),
    enabled: z.boolean().optional(),
  })
  .strict();

export const EmailConfigSchema = z
  .object({
    host: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    secure: z.boolean().optional(),
    auth: SmtpAuthSchema.optional(),
    from: z.string().email().optional(),
    name: z.string().optional(),
    enabled: z.boolean().optional(),
    accounts: z.record(z.string(), EmailAccountSchema.optional()).optional(),
  })
  .strict();
