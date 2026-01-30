import { describe, expect, it } from "vitest";
import { resolveMcpTools } from "./mcp-tools.js";

describe("resolveMcpTools", () => {
  it("returns [] when workspaceDir is missing", async () => {
    const tools = await resolveMcpTools({ config: {} });
    expect(tools).toEqual([]);
  });

  it("returns [] when workspaceDir is empty string", async () => {
    const tools = await resolveMcpTools({ workspaceDir: "   ", config: {} });
    expect(tools).toEqual([]);
  });

  it("returns [] when skills.mcp.enabled is false", async () => {
    const tools = await resolveMcpTools({
      workspaceDir: "/some/workspace",
      config: { skills: { mcp: { enabled: false } } },
    });
    expect(tools).toEqual([]);
  });

  it("returns [] when skills.mcp is false (boolean)", async () => {
    const tools = await resolveMcpTools({
      workspaceDir: "/some/workspace",
      config: { skills: { mcp: false } },
    });
    expect(tools).toEqual([]);
  });

  it("returns [] when no Cursor MCP config (no servers)", async () => {
    const tools = await resolveMcpTools({
      workspaceDir: "/nonexistent/empty/workspace",
      config: {},
    });
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBe(0);
  });
});
