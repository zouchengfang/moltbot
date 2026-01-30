import {
  buildChannelConfigSchema,
  deleteAccountFromConfigSection,
  missingTargetError,
  normalizeAccountId,
  setAccountEnabledInConfigSection,
  type ChannelPlugin,
} from "clawdbot/plugin-sdk";

import {
  listEmailAccountIds,
  resolveDefaultEmailAccountId,
  resolveEmailAccount,
  type ResolvedEmailAccount,
} from "./accounts.js";
import { EmailConfigSchema } from "./config-schema.js";
import { sendEmail } from "./send.js";

const meta = {
  id: "email",
  label: "Email",
  selectionLabel: "Email (SMTP)",
  detailLabel: "Email 通知",
  docsPath: "/channels/email",
  docsLabel: "email",
  blurb: "通过 SMTP 发送邮件通知；仅支持出站。",
  systemImage: "envelope",
  order: 92,
} as const;

function isConfigured(account: ResolvedEmailAccount): boolean {
  return Boolean(account.host?.trim() && account.from?.trim());
}

export const emailPlugin: ChannelPlugin<ResolvedEmailAccount> = {
  id: "email",
  meta: { ...meta },
  capabilities: {
    chatTypes: ["direct"],
    blockStreaming: true,
  },
  reload: { configPrefixes: ["channels.email"] },
  configSchema: buildChannelConfigSchema(EmailConfigSchema),
  config: {
    listAccountIds: (cfg) => listEmailAccountIds(cfg),
    resolveAccount: (cfg, accountId) => resolveEmailAccount({ cfg, accountId }),
    defaultAccountId: (cfg) => resolveDefaultEmailAccountId(cfg),
    setAccountEnabled: ({ cfg, accountId, enabled }) =>
      setAccountEnabledInConfigSection({
        cfg,
        sectionKey: "email",
        accountId,
        enabled,
        allowTopLevel: true,
      }),
    deleteAccount: ({ cfg, accountId }) =>
      deleteAccountFromConfigSection({
        cfg,
        sectionKey: "email",
        accountId,
        clearBaseFields: ["host", "port", "secure", "auth", "from", "name"],
      }),
    isConfigured: (account) => isConfigured(account),
    describeAccount: (account) => ({
      accountId: account.accountId,
      name: account.name,
      enabled: account.enabled,
      configured: isConfigured(account),
      from: account.from,
    }),
    resolveAllowFrom: () => [],
    formatAllowFrom: ({ allowFrom }) => allowFrom.map((e) => String(e)).filter(Boolean),
  },
  messaging: {
    targetResolver: {
      hint: "<recipient@example.com>",
    },
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
    textChunkLimit: 65536,
    resolveTarget: ({ to, accountId, cfg }) => {
      const trimmed = to?.trim();
      if (!trimmed) {
        return {
          ok: false,
          error: missingTargetError(meta.label, "<recipient@example.com>"),
        };
      }
      const resolvedAccountId =
        normalizeAccountId(accountId) || resolveDefaultEmailAccountId(cfg);
      const account = resolveEmailAccount({ cfg, accountId: resolvedAccountId });
      if (!isConfigured(account)) {
        return {
          ok: false,
          error: new Error("Email account not configured (host and from required)"),
        };
      }
      return { ok: true, to: trimmed };
    },
    sendText: async ({ to, text, accountId, cfg }) => {
      const trimmed = to?.trim();
      if (!trimmed) {
        throw new Error("Email recipient (--to) is required");
      }
      const resolvedAccountId =
        normalizeAccountId(accountId) || resolveDefaultEmailAccountId(cfg);
      const account = resolveEmailAccount({ cfg, accountId: resolvedAccountId });
      const result = await sendEmail(account, trimmed, text, { accountId: resolvedAccountId });
      return { channel: "email", messageId: result.messageId ?? String(Date.now()), ...result };
    },
    sendMedia: async ({ to, text, mediaUrl, accountId, cfg }) => {
      const trimmed = to?.trim();
      if (!trimmed) {
        throw new Error("Email recipient (--to) is required");
      }
      const resolvedAccountId =
        normalizeAccountId(accountId) || resolveDefaultEmailAccountId(cfg);
      const account = resolveEmailAccount({ cfg, accountId: resolvedAccountId });
      const content = text || "(媒体)";
      const result = await sendEmail(account, trimmed, content, {
        accountId: resolvedAccountId,
        mediaUrl,
      });
      return { channel: "email", messageId: result.messageId ?? String(Date.now()), ...result };
    },
  },
};
