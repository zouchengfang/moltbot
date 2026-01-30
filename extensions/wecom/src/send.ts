/**
 * Send message to WeCom (企业微信) group robot via webhook.
 * API: https://developer.work.weixin.qq.com/document/path/91770
 */

export type SendWeComOptions = {
  accountId?: string;
};

export type SendWeComResult = {
  messageId?: string;
  errcode?: number;
  errmsg?: string;
};

export async function sendMessageWeCom(
  webhookUrl: string,
  text: string,
  _opts?: SendWeComOptions,
): Promise<SendWeComResult & { channel: "wecom" }> {
  const body = {
    msgtype: "text",
    text: { content: text },
  };
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { errcode?: number; errmsg?: string };
  if (!res.ok) {
    throw new Error(
      `WeCom webhook failed: ${res.status} ${data.errmsg ?? res.statusText}`,
    );
  }
  if (data.errcode && data.errcode !== 0) {
    throw new Error(`WeCom API error: ${data.errcode} ${data.errmsg ?? ""}`);
  }
  return { channel: "wecom", messageId: String(Date.now()), ...data };
}
