import type { MoltbotConfig, HumanDelayConfig, IdentityConfig } from "../config/config.js";
import { parseChannelAccountFromSessionKey } from "../routing/session-key.js";
import { resolveAgentConfig, resolveAgentWorkspaceDir } from "./agent-scope.js";
import { loadAgentIdentityFromWorkspaceForChannelAccount } from "./identity-file.js";

const DEFAULT_ACK_REACTION = "👀";

export type IdentityContext = {
  sessionKey?: string;
  channel?: string;
  accountId?: string;
};

/** Merge override identity over base (only defined fields override). */
function mergeIdentity(base: IdentityConfig | undefined, over: IdentityConfig): IdentityConfig {
  if (!base) return { ...over };
  return {
    name: over.name !== undefined ? over.name : base.name,
    theme: over.theme !== undefined ? over.theme : base.theme,
    emoji: over.emoji !== undefined ? over.emoji : base.emoji,
    avatar: over.avatar !== undefined ? over.avatar : base.avatar,
  };
}

/**
 * Resolves agent identity for display/replies. Resolution order (later overrides earlier):
 * 1) agent identity, 2) identityByChannelAccount["channel:accountId"], 3) per-account file identity/IDENTITY.<channel>.<accountId>.md.
 * Call sites (e.g. assistant-identity, identity-avatar) may then fall back to root IDENTITY.md when no per-account file exists.
 */
export function resolveAgentIdentity(
  cfg: MoltbotConfig,
  agentId: string,
  ctx?: IdentityContext | null,
): IdentityConfig | undefined {
  const agent = resolveAgentConfig(cfg, agentId);
  const base = agent?.identity;
  let channel: string | undefined;
  let accountId: string | undefined;
  if (ctx?.channel != null && ctx?.accountId != null) {
    channel = ctx.channel.trim().toLowerCase() || undefined;
    accountId = ctx.accountId.trim().toLowerCase() || undefined;
  } else if (ctx?.sessionKey) {
    const parsed = parseChannelAccountFromSessionKey(ctx.sessionKey);
    channel = parsed.channel;
    accountId = parsed.accountId;
  }
  const key = channel && accountId ? `${channel}:${accountId}` : undefined;
  const override = key ? agent?.identityByChannelAccount?.[key] : undefined;
  let merged = override ? mergeIdentity(base, override) : base;
  if (channel && accountId && merged) {
    const workspace = resolveAgentWorkspaceDir(cfg, agentId);
    const fileIdentity = loadAgentIdentityFromWorkspaceForChannelAccount(
      workspace,
      channel,
      accountId,
    );
    if (
      fileIdentity &&
      (fileIdentity.name ?? fileIdentity.emoji ?? fileIdentity.avatar ?? fileIdentity.theme)
    ) {
      merged = mergeIdentity(merged, {
        name: fileIdentity.name,
        theme: fileIdentity.theme,
        emoji: fileIdentity.emoji,
        avatar: fileIdentity.avatar,
      });
    }
  }
  return merged;
}

export function resolveAckReaction(
  cfg: MoltbotConfig,
  agentId: string,
  ctx?: IdentityContext | null,
): string {
  const configured = cfg.messages?.ackReaction;
  if (configured !== undefined) return configured.trim();
  const emoji = resolveAgentIdentity(cfg, agentId, ctx)?.emoji?.trim();
  return emoji || DEFAULT_ACK_REACTION;
}

export function resolveIdentityNamePrefix(
  cfg: MoltbotConfig,
  agentId: string,
  ctx?: IdentityContext | null,
): string | undefined {
  const name = resolveAgentIdentity(cfg, agentId, ctx)?.name?.trim();
  if (!name) return undefined;
  return `[${name}]`;
}

/** Returns just the identity name (without brackets) for template context. */
export function resolveIdentityName(
  cfg: MoltbotConfig,
  agentId: string,
  ctx?: IdentityContext | null,
): string | undefined {
  return resolveAgentIdentity(cfg, agentId, ctx)?.name?.trim() || undefined;
}

export function resolveMessagePrefix(
  cfg: MoltbotConfig,
  agentId: string,
  opts?: {
    configured?: string;
    hasAllowFrom?: boolean;
    fallback?: string;
  } & IdentityContext,
): string {
  const configured = opts?.configured ?? cfg.messages?.messagePrefix;
  if (configured !== undefined) return configured;

  const hasAllowFrom = opts?.hasAllowFrom === true;
  if (hasAllowFrom) return "";

  const ctx =
    opts?.sessionKey != null || opts?.channel != null ? (opts as IdentityContext) : undefined;
  return resolveIdentityNamePrefix(cfg, agentId, ctx) ?? opts?.fallback ?? "[moltbot]";
}

export function resolveResponsePrefix(
  cfg: MoltbotConfig,
  agentId: string,
  ctx?: IdentityContext | null,
): string | undefined {
  const configured = cfg.messages?.responsePrefix;
  if (configured !== undefined) {
    if (configured === "auto") {
      return resolveIdentityNamePrefix(cfg, agentId, ctx);
    }
    return configured;
  }
  return undefined;
}

export function resolveEffectiveMessagesConfig(
  cfg: MoltbotConfig,
  agentId: string,
  opts?: { hasAllowFrom?: boolean; fallbackMessagePrefix?: string } & IdentityContext,
): { messagePrefix: string; responsePrefix?: string } {
  const ctx =
    opts?.sessionKey != null || opts?.channel != null ? (opts as IdentityContext) : undefined;
  return {
    messagePrefix: resolveMessagePrefix(cfg, agentId, {
      ...opts,
      hasAllowFrom: opts?.hasAllowFrom,
      fallback: opts?.fallbackMessagePrefix,
    }),
    responsePrefix: resolveResponsePrefix(cfg, agentId, ctx),
  };
}

export function resolveHumanDelayConfig(
  cfg: MoltbotConfig,
  agentId: string,
): HumanDelayConfig | undefined {
  const defaults = cfg.agents?.defaults?.humanDelay;
  const overrides = resolveAgentConfig(cfg, agentId)?.humanDelay;
  if (!defaults && !overrides) return undefined;
  return {
    mode: overrides?.mode ?? defaults?.mode,
    minMs: overrides?.minMs ?? defaults?.minMs,
    maxMs: overrides?.maxMs ?? defaults?.maxMs,
  };
}
