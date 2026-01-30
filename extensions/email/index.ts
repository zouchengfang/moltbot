import type { MoltbotPluginApi } from "clawdbot/plugin-sdk";
import { emptyPluginConfigSchema } from "clawdbot/plugin-sdk";

import { emailPlugin } from "./src/channel.js";

const plugin = {
  id: "email",
  name: "Email",
  description: "Email notification channel plugin (SMTP)",
  configSchema: emptyPluginConfigSchema(),
  register(api: MoltbotPluginApi) {
    api.registerChannel({ plugin: emailPlugin });
  },
};

export default plugin;
