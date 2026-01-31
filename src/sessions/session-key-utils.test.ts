import { describe, expect, it } from "vitest";

import {
  parseAgentSessionKey,
  parseChannelAccountFromSessionKey,
  resolveThreadParentSessionKey,
} from "./session-key-utils.js";

describe("parseChannelAccountFromSessionKey", () => {
  it("returns empty for non-agent or short keys", () => {
    expect(parseChannelAccountFromSessionKey(undefined)).toEqual({});
    expect(parseChannelAccountFromSessionKey("")).toEqual({});
    expect(parseChannelAccountFromSessionKey("main")).toEqual({});
    expect(parseChannelAccountFromSessionKey("agent:main")).toEqual({});
  });

  it("returns empty for agent:main:main", () => {
    expect(parseChannelAccountFromSessionKey("agent:main:main")).toEqual({});
  });

  it("returns channel and accountId for per-account-channel-peer dm keys", () => {
    expect(parseChannelAccountFromSessionKey("agent:main:telegram:bot1:dm:123")).toEqual({
      channel: "telegram",
      accountId: "bot1",
    });
    expect(parseChannelAccountFromSessionKey("agent:main:telegram:default:dm:456")).toEqual({
      channel: "telegram",
      accountId: "default",
    });
    expect(parseChannelAccountFromSessionKey("agent:alpha:whatsapp:wa1:dm:s1")).toEqual({
      channel: "whatsapp",
      accountId: "wa1",
    });
  });

  it("returns channel and default accountId when account not in key", () => {
    expect(parseChannelAccountFromSessionKey("agent:main:telegram:dm:123")).toEqual({
      channel: "telegram",
      accountId: "default",
    });
    expect(parseChannelAccountFromSessionKey("agent:main:slack:channel:c1:thread:123")).toEqual({
      channel: "slack",
      accountId: "default",
    });
    expect(parseChannelAccountFromSessionKey("agent:main:discord:channel:c1")).toEqual({
      channel: "discord",
      accountId: "default",
    });
  });
});

describe("parseAgentSessionKey", () => {
  it("parses agent and rest", () => {
    const r = parseAgentSessionKey("agent:main:telegram:bot1:dm:123");
    expect(r).toEqual({ agentId: "main", rest: "telegram:bot1:dm:123" });
  });
});

describe("resolveThreadParentSessionKey", () => {
  it("strips thread suffix", () => {
    expect(resolveThreadParentSessionKey("agent:main:slack:channel:c1:thread:123")).toBe(
      "agent:main:slack:channel:c1",
    );
  });
});
