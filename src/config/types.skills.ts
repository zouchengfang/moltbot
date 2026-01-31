export type SkillConfig = {
  enabled?: boolean;
  apiKey?: string;
  env?: Record<string, string>;
  config?: Record<string, unknown>;
};

/** Same shape as Cursor MCP server: stdio (command/args) or URL. */
export type McpServerConfig = {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  [key: string]: unknown;
};

export type SkillsMcpConfig = {
  /** Include MCP servers (Cursor mcp.json + config servers) as skills. Default true. */
  enabled?: boolean;
  /**
   * MCP servers defined in config. Merged with Cursor .cursor/mcp.json and ~/.cursor/mcp.json;
   * config entries override Cursor for the same server name.
   * Example: { "my-server": { "command": "npx", "args": ["-y", "my-mcp-server"] } }
   */
  servers?: Record<string, McpServerConfig>;
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
