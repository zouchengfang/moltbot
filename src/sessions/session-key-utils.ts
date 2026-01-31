export type ParsedAgentSessionKey = {
  agentId: string;
  rest: string;
};

export function parseAgentSessionKey(
  sessionKey: string | undefined | null,
): ParsedAgentSessionKey | null {
  const raw = (sessionKey ?? "").trim();
  if (!raw) return null;
  const parts = raw.split(":").filter(Boolean);
  if (parts.length < 3) return null;
  if (parts[0] !== "agent") return null;
  const agentId = parts[1]?.trim();
  const rest = parts.slice(2).join(":");
  if (!agentId || !rest) return null;
  return { agentId, rest };
}

export function isSubagentSessionKey(sessionKey: string | undefined | null): boolean {
  const raw = (sessionKey ?? "").trim();
  if (!raw) return false;
  if (raw.toLowerCase().startsWith("subagent:")) return true;
  const parsed = parseAgentSessionKey(raw);
  return Boolean((parsed?.rest ?? "").toLowerCase().startsWith("subagent:"));
}

export function isAcpSessionKey(sessionKey: string | undefined | null): boolean {
  const raw = (sessionKey ?? "").trim();
  if (!raw) return false;
  const normalized = raw.toLowerCase();
  if (normalized.startsWith("acp:")) return true;
  const parsed = parseAgentSessionKey(raw);
  return Boolean((parsed?.rest ?? "").toLowerCase().startsWith("acp:"));
}

/** Peer-kind markers in session key rest (channel:accountId?:dm|group|channel:...). */
const PEER_KIND_MARKERS = new Set(["dm", "group", "channel", "thread", "topic"]);

/**
 * Parse channel and accountId from an agent session key for identity lookup.
 * Keys like agent:main:telegram:bot1:dm:123 yield { channel: "telegram", accountId: "bot1" };
 * agent:main:telegram:dm:123 yields { channel: "telegram", accountId: "default" };
 * agent:main:main yields {}.
 */
export function parseChannelAccountFromSessionKey(sessionKey: string | undefined | null): {
  channel?: string;
  accountId?: string;
} {
  const parsed = parseAgentSessionKey(sessionKey);
  if (!parsed) return {};
  const rest = parsed.rest.trim().toLowerCase();
  const parts = rest.split(":").filter(Boolean);
  if (parts.length < 2 || parts[0] === "main") return {};
  const channel = parts[0];
  const second = parts[1];
  const accountId =
    parts.length >= 4 && second && !PEER_KIND_MARKERS.has(second) ? second : "default";
  return { channel, accountId };
}

const THREAD_SESSION_MARKERS = [":thread:", ":topic:"];

export function resolveThreadParentSessionKey(
  sessionKey: string | undefined | null,
): string | null {
  const raw = (sessionKey ?? "").trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  let idx = -1;
  for (const marker of THREAD_SESSION_MARKERS) {
    const candidate = normalized.lastIndexOf(marker);
    if (candidate > idx) idx = candidate;
  }
  if (idx <= 0) return null;
  const parent = raw.slice(0, idx).trim();
  return parent ? parent : null;
}
