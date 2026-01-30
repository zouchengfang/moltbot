import type { MoltbotConfig } from "clawdbot/plugin-sdk";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "clawdbot/plugin-sdk";

export type ResolvedWeComAccount = {
  accountId: string;
  name?: string;
  enabled: boolean;
  webhookUrl: string;
};

type WeComSection = {
  webhookUrl?: string;
  name?: string;
  enabled?: boolean;
  accounts?: Record<string, { webhookUrl?: string; name?: string; enabled?: boolean }>;
};

function getWeComSection(cfg: MoltbotConfig): WeComSection {
  return ((cfg.channels as { wecom?: WeComSection })?.wecom) ?? {};
}

export function listWeComAccountIds(cfg: MoltbotConfig): string[] {
  const section = getWeComSection(cfg);
  if (!section) return [];
  const ids: string[] = [];
  const topLevelUrl = section.webhookUrl?.trim();
  if (topLevelUrl) {
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

export function resolveDefaultWeComAccountId(cfg: MoltbotConfig): string {
  const ids = listWeComAccountIds(cfg);
  return ids.length > 0 ? ids[0]! : DEFAULT_ACCOUNT_ID;
}

export function resolveWeComAccount(params: {
  cfg: MoltbotConfig;
  accountId?: string | null;
}): ResolvedWeComAccount {
  const { cfg, accountId } = params;
  const section = getWeComSection(cfg);
  const normalizedId = normalizeAccountId(accountId) || DEFAULT_ACCOUNT_ID;
  const enabled = section?.enabled !== false;
  const accounts = section?.accounts;

  if (normalizedId === DEFAULT_ACCOUNT_ID && section?.webhookUrl?.trim()) {
    return {
      accountId: DEFAULT_ACCOUNT_ID,
      name: section.name?.trim(),
      enabled,
      webhookUrl: section.webhookUrl!.trim(),
    };
  }

  const acc = accounts?.[normalizedId];
  const webhookUrl = acc?.webhookUrl?.trim() ?? section?.webhookUrl?.trim() ?? "";
  return {
    accountId: normalizedId,
    name: acc?.name?.trim() ?? section?.name?.trim(),
    enabled: acc?.enabled !== false && enabled,
    webhookUrl,
  };
}
