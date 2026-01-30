export type SkillConfig = {
  enabled?: boolean;
  apiKey?: string;
  env?: Record<string, string>;
  config?: Record<string, unknown>;
};

export type SkillsMcpConfig = {
  /** Include Cursor MCP servers (from .cursor/mcp.json and ~/.cursor/mcp.json) as skills. Default true. */
  enabled?: boolean;
};

export type SkillsLoadConfig = {
  /**
   * Additional skill folders to scan (lowest precedence).
   * Each directory should contain skill subfolders with `SKILL.md`.
   */
  extraDirs?: string[];
  /** Watch skill folders for changes and refresh the skills snapshot. */
  watch?: boolean;
  /** Debounce for the skills watcher (ms). */
  watchDebounceMs?: number;
};

export type SkillsInstallConfig = {
  preferBrew?: boolean;
  nodeManager?: "npm" | "pnpm" | "yarn" | "bun";
};

export type SkillsConfig = {
  /** Optional bundled-skill allowlist (only affects bundled skills). */
  allowBundled?: string[];
  /** Cursor MCP server mode: expose locally configured MCP servers as skills. */
  mcp?: SkillsMcpConfig;
  load?: SkillsLoadConfig;
  install?: SkillsInstallConfig;
  entries?: Record<string, SkillConfig>;
};
