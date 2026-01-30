import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadCursorMcpConfig,
  loadMcpSkillEntries,
  resolveCursorMcpPaths,
  SOURCE_CURSOR_MCP,
} from "./mcp-cursor.js";

describe("mcp-cursor", () => {
  it("resolveCursorMcpPaths returns project and global paths", () => {
    const dir = "/tmp/workspace";
    const { project, global } = resolveCursorMcpPaths(dir);
    expect(project).toBe(path.join("/tmp/workspace", ".cursor", "mcp.json"));
    expect(global).toContain(".cursor");
    expect(global).toContain("mcp.json");
  });

  it("loadCursorMcpConfig returns empty when no config files exist", () => {
    const dir = path.join(os.tmpdir(), "mcp-none");
    const servers = loadCursorMcpConfig(dir);
    expect(servers).toEqual({});
  });

  it("loadCursorMcpConfig merges project and global config", async () => {
    const workspaceDir = path.join(os.tmpdir(), `mcp-merge-${Date.now()}`);
    const cursorDir = path.join(workspaceDir, ".cursor");
    await fs.mkdir(cursorDir, { recursive: true });
    await fs.writeFile(
      path.join(cursorDir, "mcp.json"),
      JSON.stringify({
        mcpServers: {
          projectServer: { command: "node", args: ["project.js"] },
        },
      }),
    );
    const servers = loadCursorMcpConfig(workspaceDir);
    expect(servers.projectServer).toBeDefined();
    expect(servers.projectServer?.command).toBe("node");
  });

  it("loadMcpSkillEntries returns entries for each MCP server", async () => {
    const workspaceDir = path.join(os.tmpdir(), `mcp-skills-${Date.now()}`);
    const cursorDir = path.join(workspaceDir, ".cursor");
    await fs.mkdir(cursorDir, { recursive: true });
    await fs.writeFile(
      path.join(cursorDir, "mcp.json"),
      JSON.stringify({
        mcpServers: {
          userGithub: { command: "npx", args: ["-y", "github-mcp"] },
          userFetch: { url: "https://example.com/mcp" },
        },
      }),
    );
    const entries = loadMcpSkillEntries(workspaceDir);
    expect(entries.length).toBe(2);
    const names = entries.map((e) => e.skill.name).sort();
    expect(names).toEqual(["userFetch", "userGithub"]);
    expect(entries.every((e) => e.skill.source === SOURCE_CURSOR_MCP)).toBe(true);
    expect(entries.every((e) => e.metadata?.always === true)).toBe(true);
  });

  it("loadMcpSkillEntries returns empty when skills.mcp.enabled is false", async () => {
    const workspaceDir = path.join(os.tmpdir(), `mcp-disabled-${Date.now()}`);
    const cursorDir = path.join(workspaceDir, ".cursor");
    await fs.mkdir(cursorDir, { recursive: true });
    await fs.writeFile(
      path.join(cursorDir, "mcp.json"),
      JSON.stringify({ mcpServers: { foo: { command: "node", args: [] } } }),
    );
    const entries = loadMcpSkillEntries(workspaceDir, {
      config: { skills: { mcp: { enabled: false } } },
    });
    expect(entries).toEqual([]);
  });
});
