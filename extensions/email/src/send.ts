/**
 * Send email via SMTP using nodemailer.
 * Requires: host, from. Optional: port, secure, auth.
 */

import nodemailer from "nodemailer";
import type { ResolvedEmailAccount } from "./accounts.js";

export type SendEmailOptions = {
  accountId?: string;
  subject?: string;
};

export type SendEmailResult = {
  messageId?: string;
  envelope?: { from: string; to: string[] };
};

const DEFAULT_SUBJECT = "Moltbot notification";

export async function sendEmail(
  account: ResolvedEmailAccount,
  to: string,
  text: string,
  opts?: SendEmailOptions & { mediaUrl?: string },
): Promise<SendEmailResult & { channel: "email" }> {
  if (!account.from?.trim()) {
    throw new Error("Email channel: from address not configured");
  }
  const transporter = nodemailer.createTransport({
    host: account.host,
    port: account.port,
    secure: account.secure,
    ...(account.auth?.user || account.auth?.pass
      ? { auth: { user: account.auth.user ?? "", pass: account.auth.pass ?? "" } }
      : {}),
  });
  const subject = opts?.subject?.trim() || DEFAULT_SUBJECT;
  const body = opts?.mediaUrl ? `${text}\n\n${opts.mediaUrl}` : text;
  const info = await transporter.sendMail({
    from: account.name ? `"${account.name}" <${account.from}>` : account.from,
    to: to.trim(),
    subject,
    text: body,
  });
  return {
    channel: "email",
    messageId: info.messageId ?? String(Date.now()),
    envelope: info.envelope,
  };
}
