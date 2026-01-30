import type { MoltbotPluginApi } from "clawdbot/plugin-sdk";
import { emptyPluginConfigSchema } from "clawdbot/plugin-sdk";

import { wecomPlugin } from "./src/channel.js";

const plugin = {
  id: "wecom",
  name: "WeCom (企业微信)",
  description: "WeCom (企业微信) notification channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: MoltbotPluginApi) {
    api.registerChannel({ plugin: wecomPlugin });
  },
};

export default plugin;
