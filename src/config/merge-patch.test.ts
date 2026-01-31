import { describe, expect, it } from "vitest";
import {
  applyMergePatch,
  CONTROL_UI_READONLY_PREFIXES,
  stripProtectedPaths,
} from "./merge-patch.js";

describe("applyMergePatch", () => {
  it("merges patch into base", () => {
    const base = { a: 1, b: { x: 10 } };
    const patch = { b: { y: 20 } };
    expect(applyMergePatch(base, patch)).toEqual({ a: 1, b: { x: 10, y: 20 } });
  });

  it("removes key when patch value is null", () => {
    const base = { a: 1, b: 2 };
    const patch = { b: null };
    expect(applyMergePatch(base, patch)).toEqual({ a: 1 });
  });
});

describe("stripProtectedPaths", () => {
  it("strips gateway.controlUi.allowInsecureAuth", () => {
    const obj = {
      gateway: {
        controlUi: {
          allowInsecureAuth: true,
          basePath: "/moltbot",
        },
      },
    };
    const stripped = stripProtectedPaths(obj) as typeof obj;
    expect(stripped.gateway?.controlUi?.allowInsecureAuth).toBeUndefined();
    expect(stripped.gateway?.controlUi?.basePath).toBe("/moltbot");
  });

  it("strips agents.defaults.model", () => {
    const obj = {
      agents: {
        defaults: {
          model: { primary: "openai/gpt-4", fallbacks: [] },
          workspace: "~/clawd",
        },
      },
    };
    const stripped = stripProtectedPaths(obj) as typeof obj;
    expect(stripped.agents?.defaults?.model).toBeUndefined();
    expect(stripped.agents?.defaults?.workspace).toBe("~/clawd");
  });

  it("strips auth section", () => {
    const obj = { auth: { profiles: { x: {} } }, channels: {} };
    const stripped = stripProtectedPaths(obj) as typeof obj;
    expect(stripped.auth).toBeUndefined();
    expect(stripped.channels).toEqual({});
  });

  it("strips models section", () => {
    const obj = { models: { providers: {} }, logging: {} };
    const stripped = stripProtectedPaths(obj) as typeof obj;
    expect(stripped.models).toBeUndefined();
    expect(stripped.logging).toEqual({});
  });
});
