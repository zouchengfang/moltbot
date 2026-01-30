import type { MoltbotConfig } from "clawdbot/plugin-sdk";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "clawdbot/plugin-sdk";

export type ResolvedDingTalkAccount = {
  accountId: string;
  name?: string;
  enabled: boolean;
  webhookUrl: string;
  secret?: string;
};

type DingTalkSection = {
  webhookUrl?: string;
  secret?: string;
  name?: string;
  enabled?: boolean;
  accounts?: Record<string, { webhookUrl?: string; secret?: string; name?: string; enabled?: boolean }>;
};

function getSection(cfg: MoltbotConfig): DingTalkSection {
  return ((cfg.channels as { dingtalk?: DingTalkSection })?.dingtalk) ?? {};
}

export function listDingTalkAccountIds(cfg: MoltbotConfig): string[] {
  const section = getSection(cfg);
  if (!section) return [];
  const ids: string[] = [];
  if (section.webhookUrl?.trim()) {
    ids.push(DEFAULT_ACCOUNT_ID);
  }
  const accounts = section.accounts;
  if (accounts && typeof accounts === "object") {
    for (const [id, acc] of Object.entries(accounts)) {
      if (acc?.webhookUrl?.trim() && !ids.includes(id)) {
        ids.push(id);
      }
    }
  }
  return ids;
}

export function resolveDefaultDingTalkAccountId(cfg: MoltbotConfig): string {
  const ids = listDingTalkAccountIds(cfg);
  return ids.length > 0 ? ids[0]! : DEFAULT_ACCOUNT_ID;
}

export function resolveDingTalkAccount(params: {
  cfg: MoltbotConfig;
  accountId?: string | null;
}): ResolvedDingTalkAccount {
  const { cfg, accountId } = params;
  const section = getSection(cfg);
  const normalizedId = normalizeAccountId(accountId) || DEFAULT_ACCOUNT_ID;
  const enabled = section?.enabled !== false;
  const accounts = section?.accounts;

  if (normalizedId === DEFAULT_ACCOUNT_ID && section?.webhookUrl?.trim()) {
    return {
      accountId: DEFAULT_ACCOUNT_ID,
      name: section.name?.trim(),
      enabled,
      webhookUrl: section.webhookUrl!.trim(),
      secret: section.secret?.trim(),
    };
  }

  const acc = accounts?.[normalizedId];
  const webhookUrl = acc?.webhookUrl?.trim() ?? section?.webhookUrl?.trim() ?? "";
  const secret = acc?.secret?.trim() ?? section?.secret?.trim();
  return {
    accountId: normalizedId,
    name: acc?.name?.trim() ?? section?.name?.trim(),
    enabled: acc?.enabled !== false && enabled,
    webhookUrl,
    ...(secret ? { secret } : {}),
  };
}
