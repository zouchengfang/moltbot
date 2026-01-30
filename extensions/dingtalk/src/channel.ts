import {
  buildChannelConfigSchema,
  DEFAULT_ACCOUNT_ID,
  deleteAccountFromConfigSection,
  normalizeAccountId,
  setAccountEnabledInConfigSection,
  type ChannelPlugin,
} from "clawdbot/plugin-sdk";

import {
  listDingTalkAccountIds,
  resolveDefaultDingTalkAccountId,
  resolveDingTalkAccount,
  type ResolvedDingTalkAccount,
} from "./accounts.js";
import { DingTalkConfigSchema } from "./config-schema.js";
import { sendMessageDingTalk } from "./send.js";

const meta = {
  id: "dingtalk",
  label: "钉钉",
  selectionLabel: "钉钉 (自定义机器人)",
  detailLabel: "钉钉通知",
  docsPath: "/channels/dingtalk",
  docsLabel: "dingtalk",
  blurb: "通过自定义机器人 Webhook 发送通知；支持加签；仅支持出站通知。",
  systemImage: "message",
  order: 91,
} as const;

export const dingtalkPlugin: ChannelPlugin<ResolvedDingTalkAccount> = {
  id: "dingtalk",
  meta: { ...meta },
  capabilities: {
    chatTypes: ["group"],
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.dingtalk"] },
  configSchema: buildChannelConfigSchema(DingTalkConfigSchema),
  config: {
    listAccountIds: (cfg) => listDingTalkAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveDingTalkAccount({ cfg, accountId }),
    defaultAccountId: (cfg) => resolveDefaultDingTalkAccountId(cfg),
    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setAccountEnabledInConfigSection({
        cfg,
        sectionKey: "dingtalk",
        accountId,
        enabled,
        allowTopLevel: true,
      }),
    deleteAccount: ({ cfg, accountId }) =>
      deleteAccountFromConfigSection({
        cfg,
        sectionKey: "dingtalk",
        accountId,
        clearBaseFields: ["webhookUrl", "secret", "name"],
      }),
    isConfigured: (account) => Boolean(account.webhookUrl),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: Boolean(account.webhookUrl),
    }),
    resolveAllowFrom: () => [],
    formatAllowFrom: ({ allowFrom }) => allowFrom.map((e) => String(e)).filter(Boolean),
  },
  outbound: {
    deliveryMode: "direct",
    chunker: (text, limit) => {
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += limit) {
        chunks.push(text.slice(i, i + limit));
      }
      return chunks.length > 0 ? chunks : [""];
    },
    chunkerMode: "text",
    textChunkLimit: 4096,
    resolveTarget: ({ to, accountId, cfg }) => {
      const resolvedAccountId =
        to?.trim() || normalizeAccountId(accountId) || resolveDefaultDingTalkAccountId(cfg);
      const account = resolveDingTalkAccount({ cfg, accountId: resolvedAccountId });
      if (!account.webhookUrl) {
        return {
          ok: false,
          error: new Error("DingTalk webhook URL not configured for this account"),
        };
      }
      return { ok: true, to: resolvedAccountId };
    },
    sendText: async ({ to, text, accountId, cfg }) => {
      const resolvedAccountId =
        to?.trim() || normalizeAccountId(accountId) || resolveDefaultDingTalkAccountId(cfg);
      const account = resolveDingTalkAccount({ cfg, accountId: resolvedAccountId });
      if (!account.webhookUrl) {
        throw new Error("DingTalk webhook URL not configured");
      }
      const result = await sendMessageDingTalk(account.webhookUrl, text, {
        accountId: resolvedAccountId,
        secret: account.secret,
      });
      return {
        channel: "dingtalk",
        messageId: result.messageId ?? String(Date.now()),
        ...result,
      };
    },
    sendMedia: async ({ to, text, mediaUrl, accountId, cfg }) => {
      const resolvedAccountId =
        to?.trim() || normalizeAccountId(accountId) || resolveDefaultDingTalkAccountId(cfg);
      const account = resolveDingTalkAccount({ cfg, accountId: resolvedAccountId });
      if (!account.webhookUrl) {
        throw new Error("DingTalk webhook URL not configured");
      }
      const content = mediaUrl ? `${text || ""}\n${mediaUrl}`.trim() : text;
      const result = await sendMessageDingTalk(account.webhookUrl, content || "(媒体)", {
        accountId: resolvedAccountId,
        secret: account.secret,
      });
      return {
        channel: "dingtalk",
        messageId: result.messageId ?? String(Date.now()),
        ...result,
      };
    },
  },
};
