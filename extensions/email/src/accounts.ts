import type { MoltbotConfig } from "clawdbot/plugin-sdk";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "clawdbot/plugin-sdk";

export type EmailAccountAuth = {
  user?: string;
  pass?: string;
};

export type ResolvedEmailAccount = {
  accountId: string;
  name?: string;
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  auth?: EmailAccountAuth;
  from: string;
};

type EmailSection = {
  host?: string;
  port?: number;
  secure?: boolean;
  auth?: EmailAccountAuth;
  from?: string;
  name?: string;
  enabled?: boolean;
  accounts?: Record<
    string,
    { host?: string; port?: number; secure?: boolean; auth?: EmailAccountAuth; from?: string; name?: string; enabled?: boolean }
  >;
};

function getSection(cfg: MoltbotConfig): EmailSection {
  return ((cfg.channels as { email?: EmailSection })?.email) ?? {};
}

function mergeAccount(
  base: EmailSection,
  accountId: string,
  acc?: EmailSection["accounts"] extends Record<string, infer V> ? V : never,
): ResolvedEmailAccount {
  const host = acc?.host?.trim() ?? base.host?.trim() ?? "localhost";
  const port = acc?.port ?? base.port ?? 587;
  const secure = acc?.secure ?? base.secure ?? false;
  const auth = acc?.auth ?? base.auth;
  const from = acc?.from?.trim() ?? base.from?.trim() ?? "";
  const name = acc?.name?.trim() ?? base.name?.trim();
  const enabled = base.enabled !== false && (acc?.enabled !== false ?? true);
  return {
    accountId,
    name,
    enabled,
    host,
    port,
    secure,
    ...(auth && (auth.user || auth.pass) ? { auth } : {}),
    from,
  };
}

export function listEmailAccountIds(cfg: MoltbotConfig): string[] {
  const section = getSection(cfg);
  if (!section) return [];
  const ids: string[] = [];
  const hasTopLevel = section.host?.trim() || section.from?.trim();
  if (hasTopLevel) {
    ids.push(DEFAULT_ACCOUNT_ID);
  }
  const accounts = section.accounts;
  if (accounts && typeof accounts === "object") {
    for (const [id, acc] of Object.entries(accounts)) {
      if ((acc?.host?.trim() || acc?.from?.trim()) && !ids.includes(id)) {
        ids.push(id);
      }
    }
  }
  return ids;
}

export function resolveDefaultEmailAccountId(cfg: MoltbotConfig): string {
  const ids = listEmailAccountIds(cfg);
  return ids.length > 0 ? ids[0]! : DEFAULT_ACCOUNT_ID;
}

export function resolveEmailAccount(params: {
  cfg: MoltbotConfig;
  accountId?: string | null;
}): ResolvedEmailAccount {
  const { cfg, accountId } = params;
  const section = getSection(cfg);
  const normalizedId = normalizeAccountId(accountId) || DEFAULT_ACCOUNT_ID;

  if (normalizedId === DEFAULT_ACCOUNT_ID) {
    return mergeAccount(section, DEFAULT_ACCOUNT_ID, undefined);
  }

  const acc = section.accounts?.[normalizedId];
  return mergeAccount(section, normalizedId, acc);
}
