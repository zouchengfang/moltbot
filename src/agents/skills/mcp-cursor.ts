/**
 * Load Cursor MCP server config and expose them as skill entries.
 * Config paths: workspace .cursor/mcp.json, user ~/.cursor/mcp.json.
 * Merged so project config overrides global for same server name.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import type { Skill } from "@mariozechner/pi-coding-agent";

import type { MoltbotConfig } from "../../config/config.js";
import { resolveUserPath } from "../../utils.js";
import type { SkillEntry } from "./types.js";

const CURSOR_MCP_FILENAME = "mcp.json";
export const SOURCE_CURSOR_MCP = "cursor-mcp";

export type CursorMcpServerConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  [key: string]: unknown;
};

export type CursorMcpConfig = {
  mcpServers?: Record<string, CursorMcpServerConfig>;
};

function readJsonFile<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function resolveGlobalCursorMcpPath(): string {
  const home = os.homedir();
  return path.join(home, ".cursor", CURSOR_MCP_FILENAME);
}

export function resolveCursorMcpPaths(workspaceDir: string): {
  project: string;
  global: string;
} {
  const project = path.join(resolveUserPath(workspaceDir), ".cursor", CURSOR_MCP_FILENAME);
  const global = resolveGlobalCursorMcpPath();
  return { project, global };
}

/**
 * Load and merge MCP server config from project and global Cursor config.
 * Project entries override global for the same server name.
 */
export function loadCursorMcpConfig(workspaceDir: string): Record<string, CursorMcpServerConfig> {
  const { project, global } = resolveCursorMcpPaths(workspaceDir);
  const globalConfig = readJsonFile<CursorMcpConfig>(global);
  const projectConfig = readJsonFile<CursorMcpConfig>(project);

  const merged: Record<string, CursorMcpServerConfig> = {};
  const globalServers = globalConfig?.mcpServers ?? {};
  const projectServers = projectConfig?.mcpServers ?? {};
  for (const [name, config] of Object.entries(globalServers)) {
    if (name && config && typeof config === "object") {
      merged[name] = { ...config };
    }
  }
  for (const [name, config] of Object.entries(projectServers)) {
    if (name && config && typeof config === "object") {
      merged[name] = { ...config };
    }
  }
  return merged;
}

function isMcpEnabled(config?: MoltbotConfig): boolean {
  const raw = config?.skills?.mcp;
  if (raw === undefined || raw === null) return true;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "object" && raw !== null && "enabled" in raw) {
    return (raw as { enabled?: boolean }).enabled !== false;
  }
  return true;
}

/**
 * Build synthetic SkillEntry for each Cursor-configured MCP server.
 * These appear in the skill list with source "cursor-mcp"; no install,
 * always eligible when MCP is enabled.
 */
export function loadMcpSkillEntries(
  workspaceDir: string,
  opts?: { config?: MoltbotConfig },
): SkillEntry[] {
  if (!isMcpEnabled(opts?.config)) return [];

  const servers = loadCursorMcpConfig(workspaceDir);
  const entries: SkillEntry[] = [];

  for (const [serverName, serverConfig] of Object.entries(servers)) {
    const trimmed = serverName.trim();
    if (!trimmed) continue;

    const command =
      typeof serverConfig.command === "string"
        ? serverConfig.command.trim()
        : undefined;
    const args = Array.isArray(serverConfig.args)
      ? serverConfig.args.map((a) => String(a))
      : undefined;
    const hasCommand = command && (args === undefined || args.length >= 0);
    const url = typeof serverConfig.url === "string" ? serverConfig.url.trim() : undefined;
    const description = hasCommand
      ? `MCP server (stdio): ${command}${args?.length ? ` ${args.join(" ")}` : ""}`
      : url
        ? `MCP server (URL): ${url}`
        : "MCP server from Cursor config";

    const skill: Skill = {
      name: trimmed,
      description,
      source: SOURCE_CURSOR_MCP,
      filePath: resolveCursorMcpPaths(workspaceDir).project,
      baseDir: workspaceDir,
    };

    entries.push({
      skill,
      frontmatter: {},
      metadata: {
        skillKey: trimmed,
        emoji: "🔌",
        always: true,
        requires: {},
      },
    });
  }

  return entries;
}
