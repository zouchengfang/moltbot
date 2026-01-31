import { beforeEach, describe, expect, it } from "vitest";

import { prependSystemEvents } from "../auto-reply/reply/session-updates.js";
import type { MoltbotConfig } from "../config/config.js";
import { resolveMainSessionKey } from "../config/sessions.js";
import {
  clearSystemEvents,
  enqueueSystemEvent,
  peekSystemEvents,
  resetSystemEventsForTest,
} from "./system-events.js";

const cfg = {} as unknown as MoltbotConfig;
const mainKey = resolveMainSessionKey(cfg);

describe("system events (session routing)", () => {
  beforeEach(() => {
    resetSystemEventsForTest();
  });

  it("does not leak session-scoped events into main", async () => {
    enqueueSystemEvent("Discord reaction added: ✅", {
      sessionKey: "discord:group:123",
      contextKey: "discord:reaction:added:msg:user:✅",
    });

    expect(peekSystemEvents(mainKey)).toEqual([]);
    expect(peekSystemEvents("discord:group:123")).toEqual(["Discord reaction added: ✅"]);

    const main = await prependSystemEvents({
      cfg,
      sessionKey: mainKey,
      isMainSession: true,
      isNewSession: false,
      prefixedBodyBase: "hello",
    });
    expect(main).toBe("hello");
    expect(peekSystemEvents("discord:group:123")).toEqual(["Discord reaction added: ✅"]);

    const discord = await prependSystemEvents({
      cfg,
      sessionKey: "discord:group:123",
      isMainSession: false,
      isNewSession: false,
      prefixedBodyBase: "hi",
    });
    expect(discord).toMatch(/^System: \[[^\]]+\] Discord reaction added: ✅\n\nhi$/);
    expect(peekSystemEvents("discord:group:123")).toEqual([]);
  });

  it("requires an explicit session key", () => {
    expect(() => enqueueSystemEvent("Node: Mac Studio", { sessionKey: " " })).toThrow("sessionKey");
  });

  it("clearSystemEvents purges queue and returns count", () => {
    enqueueSystemEvent("a", { sessionKey: "test:clear" });
    enqueueSystemEvent("b", { sessionKey: "test:clear" });
    expect(peekSystemEvents("test:clear")).toEqual(["a", "b"]);
    const cleared = clearSystemEvents("test:clear");
    expect(cleared).toBe(2);
    expect(peekSystemEvents("test:clear")).toEqual([]);
    expect(clearSystemEvents("test:clear")).toBe(0);
  });
});
