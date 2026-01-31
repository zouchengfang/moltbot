import fs from "node:fs";
import path from "node:path";

import { DEFAULT_IDENTITY_FILENAME } from "./workspace.js";

export type AgentIdentityFile = {
  name?: string;
  emoji?: string;
  theme?: string;
  creature?: string;
  vibe?: string;
  avatar?: string;
};

const IDENTITY_PLACEHOLDER_VALUES = new Set([
  "pick something you like",
  "ai? robot? familiar? ghost in the machine? something weirder?",
  "how do you come across? sharp? warm? chaotic? calm?",
  "your signature - pick one that feels right",
  "workspace-relative path, http(s) url, or data uri",
]);

function normalizeIdentityValue(value: string): string {
  let normalized = value.trim();
  normalized = normalized.replace(/^[*_]+|[*_]+$/g, "").trim();
  if (normalized.startsWith("(") && normalized.endsWith(")")) {
    normalized = normalized.slice(1, -1).trim();
  }
  normalized = normalized.replace(/[\u2013\u2014]/g, "-");
  normalized = normalized.replace(/\s+/g, " ").toLowerCase();
  return normalized;
}

function isIdentityPlaceholder(value: string): boolean {
  const normalized = normalizeIdentityValue(value);
  return IDENTITY_PLACEHOLDER_VALUES.has(normalized);
}

export function parseIdentityMarkdown(content: string): AgentIdentityFile {
  const identity: AgentIdentityFile = {};
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.trim().replace(/^\s*-\s*/, "");
    const colonIndex = cleaned.indexOf(":");
    if (colonIndex === -1) continue;
    const label = cleaned.slice(0, colonIndex).replace(/[*_]/g, "").trim().toLowerCase();
    const value = cleaned
      .slice(colonIndex + 1)
      .replace(/^[*_]+|[*_]+$/g, "")
      .trim();
    if (!value) continue;
    if (isIdentityPlaceholder(value)) continue;
    if (label === "name") identity.name = value;
    if (label === "emoji") identity.emoji = value;
    if (label === "creature") identity.creature = value;
    if (label === "vibe") identity.vibe = value;
    if (label === "theme") identity.theme = value;
    if (label === "avatar") identity.avatar = value;
  }
  return identity;
}

export function identityHasValues(identity: AgentIdentityFile): boolean {
  return Boolean(
    identity.name ||
    identity.emoji ||
    identity.theme ||
    identity.creature ||
    identity.vibe ||
    identity.avatar,
  );
}

export function loadIdentityFromFile(identityPath: string): AgentIdentityFile | null {
  try {
    const content = fs.readFileSync(identityPath, "utf-8");
    const parsed = parseIdentityMarkdown(content);
    if (!identityHasValues(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadAgentIdentityFromWorkspace(workspace: string): AgentIdentityFile | null {
  const identityPath = path.join(workspace, DEFAULT_IDENTITY_FILENAME);
  return loadIdentityFromFile(identityPath);
}

/** Subdir under workspace for per-channel-account identity files. */
export const IDENTITY_CHANNEL_SUBDIR = "identity";

/**
 * Path to the identity file for a channel+account (e.g. identity/IDENTITY.telegram.bot1.md).
 * Used so each bot/account can have its own name/avatar/emoji file memory.
 */
export function getIdentityFilePathForChannelAccount(
  workspaceDir: string,
  channel: string,
  accountId: string,
): string {
  const safeChannel =
    (channel ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-") || "default";
  const safeAccount =
    (accountId ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-") || "default";
  const basename = `${path.basename(DEFAULT_IDENTITY_FILENAME, path.extname(DEFAULT_IDENTITY_FILENAME))}.${safeChannel}.${safeAccount}.md`;
  return path.join(workspaceDir, IDENTITY_CHANNEL_SUBDIR, basename);
}

/**
 * Load identity from the per-channel-account file (identity/IDENTITY.<channel>.<accountId>.md).
 * Returns null if the file is missing or has no values.
 */
export function loadAgentIdentityFromWorkspaceForChannelAccount(
  workspaceDir: string,
  channel: string,
  accountId: string,
): AgentIdentityFile | null {
  const identityPath = getIdentityFilePathForChannelAccount(workspaceDir, channel, accountId);
  return loadIdentityFromFile(identityPath);
}
