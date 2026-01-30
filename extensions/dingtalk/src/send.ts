/**
 * Send message to DingTalk (钉钉) custom robot via webhook.
 * If secret is set, sign with HMAC-SHA256 and append timestamp & sign to URL.
 * Ref: https://open.dingtalk.com/document/robots/custom-robot-access
 */

import { createHmac } from "node:crypto";

export type SendDingTalkOptions = {
  accountId?: string;
  secret?: string;
};

export type SendDingTalkResult = {
  messageId?: string;
  errcode?: number;
  errmsg?: string;
};

function buildSignedUrl(webhookUrl: string, secret: string): string {
  const timestamp = String(Date.now());
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = createHmac("sha256", secret);
  hmac.update(stringToSign);
  const sign = encodeURIComponent(hmac.digest("base64"));
  const separator = webhookUrl.includes("?") ? "&" : "?";
  return `${webhookUrl}${separator}timestamp=${timestamp}&sign=${sign}`;
}

export async function sendMessageDingTalk(
  webhookUrl: string,
  text: string,
  opts?: SendDingTalkOptions,
): Promise<SendDingTalkResult & { channel: "dingtalk" }> {
  const url = opts?.secret
    ? buildSignedUrl(webhookUrl, opts.secret)
    : webhookUrl;
  const body = {
    msgtype: "text",
    text: { content: text },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    errcode?: number;
    errmsg?: string;
  };
  if (!res.ok) {
    throw new Error(
      `DingTalk webhook failed: ${res.status} ${data.errmsg ?? res.statusText}`,
    );
  }
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`DingTalk API error: ${data.errcode} ${data.errmsg ?? ""}`);
  }
  return { channel: "dingtalk", messageId: String(Date.now()), ...data };
}
