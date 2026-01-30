import {
  buildChannelConfigSchema,
  DEFAULT_ACCOUNT_ID,
  deleteAccountFromConfigSection,
  migrateBaseNameToDefaultAccount,
  normalizeAccountId,
  setAccountEnabledInConfigSection,
  type ChannelPlugin,
} from "clawdbot/plugin-sdk";

import {
  listWeComAccountIds,
  resolveDefaultWeComAccountId,
  resolveWeComAccount,
  type ResolvedWeComAccount,
} from "./accounts.js";
import { WeComConfigSchema } from "./config-schema.js";
import { sendMessageWeCom } from "./send.js";

const meta = {
  id: "wecom",
  label: "企业微信",
  selectionLabel: "企业微信 (群机器人)",
  detailLabel: "企业微信通知",
  docsPath: "/channels/wecom",
  docsLabel: "wecom",
  blurb: "通过群机器人 Webhook 发送通知；仅支持出站通知。",
  systemImage: "message",
  order: 90,
} as const;

export const wecomPlugin: ChannelPlugin<ResolvedWeComAccount> = {
  id: "wecom",
  meta: { ...meta },
  capabilities: {
    chatTypes: ["group"],
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.wecom"] },
  configSchema: buildChannelConfigSchema(WeComConfigSchema),
  config: {
    listAccountIds: (cfg) => listWeComAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveWeComAccount({ cfg, accountId }),
    defaultAccountId: (cfg) => resolveDefaultWeComAccountId(cfg),
    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setAccountEnabledInConfigSection({
        cfg,
        sectionKey: "wecom",
        accountId,
        enabled,
        allowTopLevel: true,
      }),
    deleteAccount: ({ cfg, accountId }) =>
      deleteAccountFromConfigSection({
        cfg,
        sectionKey: "wecom",
        accountId,
        clearBaseFields: ["webhookUrl", "name"],
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
      const trimmed = to?.trim();
      const resolvedAccountId = trimmed || normalizeAccountId(accountId) || resolveDefaultWeComAccountId(cfg);
      const account = resolveWeComAccount({ cfg, accountId: resolvedAccountId });
      if (!account.webhookUrl) {
        return {
          ok: false,
          error: new Error("WeCom webhook URL not configured for this account"),
        };
      }
      return { ok: true, to: resolvedAccountId };
    },
    sendText: async ({ to, text, accountId, cfg }) => {
      const resolvedAccountId =
        to?.trim() || normalizeAccountId(accountId) || resolveDefaultWeComAccountId(cfg);
      const account = resolveWeComAccount({ cfg, accountId: resolvedAccountId });
      if (!account.webhookUrl) {
        throw new Error("WeCom webhook URL not configured");
      }
      const result = await sendMessageWeCom(account.webhookUrl, text, {
        accountId: resolvedAccountId,
      });
      return { channel: "wecom", messageId: result.messageId ?? String(Date.now()), ...result };
    },
    sendMedia: async ({ to, text, mediaUrl, accountId, cfg }) => {
      const resolvedAccountId =
        to?.trim() || normalizeAccountId(accountId) || resolveDefaultWeComAccountId(cfg);
      const account = resolveWeComAccount({ cfg, accountId: resolvedAccountId });
      if (!account.webhookUrl) {
        throw new Error("WeCom webhook URL not configured");
      }
      const content = mediaUrl ? `${text || ""}\n${mediaUrl}`.trim() || text;
      const result = await sendMessageWeCom(account.webhookUrl, content || "(媒体)", {
        accountId: resolvedAccountId,
      });
      return { channel: "wecom", messageId: result.messageId ?? String(Date.now()), ...result };
    },
  },
};
