/**
 * UI locale and translations. Supports English (en) and Simplified Chinese (zh-CN).
 */

export type Locale = "en" | "zh-CN";

const MESSAGES: Record<string, { en: string; "zh-CN": string }> = {
  "nav.group.chat": { en: "Chat", "zh-CN": "对话" },
  "nav.group.control": { en: "Control", "zh-CN": "控制台" },
  "nav.group.agent": { en: "Agent", "zh-CN": "代理" },
  "nav.group.settings": { en: "Settings", "zh-CN": "设置" },
  "nav.group.resources": { en: "Resources", "zh-CN": "资源" },
  "nav.title.chat": { en: "Chat", "zh-CN": "对话" },
  "nav.title.overview": { en: "Overview", "zh-CN": "概览" },
  "nav.title.channels": { en: "Channels", "zh-CN": "渠道" },
  "nav.title.instances": { en: "Instances", "zh-CN": "实例" },
  "nav.title.sessions": { en: "Sessions", "zh-CN": "会话" },
  "nav.title.cron": { en: "Cron Jobs", "zh-CN": "定时任务" },
  "nav.title.skills": { en: "Skills", "zh-CN": "技能" },
  "nav.title.nodes": { en: "Nodes", "zh-CN": "节点" },
  "nav.title.config": { en: "Config", "zh-CN": "配置" },
  "nav.title.debug": { en: "Debug", "zh-CN": "调试" },
  "nav.title.logs": { en: "Logs", "zh-CN": "日志" },
  "nav.title.control": { en: "Control", "zh-CN": "控制" },
  "nav.subtitle.chat": {
    en: "Direct gateway chat session for quick interventions.",
    "zh-CN": "网关对话，快速干预。",
  },
  "nav.subtitle.overview": {
    en: "Gateway status, entry points, and a fast health read.",
    "zh-CN": "网关状态、入口与健康概览。",
  },
  "nav.subtitle.channels": {
    en: "Manage channels and settings.",
    "zh-CN": "管理渠道与设置。",
  },
  "nav.subtitle.instances": {
    en: "Presence beacons from connected clients and nodes.",
    "zh-CN": "已连接客户端与节点的在线状态。",
  },
  "nav.subtitle.sessions": {
    en: "Inspect active sessions and adjust per-session defaults.",
    "zh-CN": "查看活跃会话并调整每会话默认值。",
  },
  "nav.subtitle.cron": {
    en: "Schedule wakeups and recurring agent runs.",
    "zh-CN": "安排唤醒与定期代理运行。",
  },
  "nav.subtitle.skills": {
    en: "Manage skill availability and API key injection.",
    "zh-CN": "管理技能可用性与 API 密钥注入。",
  },
  "nav.subtitle.nodes": {
    en: "Paired devices, capabilities, and command exposure.",
    "zh-CN": "配对设备、能力与命令暴露。",
  },
  "nav.subtitle.config": {
    en: "Edit ~/.clawdbot/moltbot.json safely.",
    "zh-CN": "安全编辑 ~/.clawdbot/moltbot.json。",
  },
  "nav.subtitle.debug": {
    en: "Gateway snapshots, events, and manual RPC calls.",
    "zh-CN": "网关快照、事件与手动 RPC 调用。",
  },
  "nav.subtitle.logs": {
    en: "Live tail of the gateway file logs.",
    "zh-CN": "网关文件日志实时输出。",
  },
  "nav.subtitle.control": { en: "", "zh-CN": "" },
  "topbar.health": { en: "Health", "zh-CN": "状态" },
  "topbar.ok": { en: "OK", "zh-CN": "正常" },
  "topbar.offline": { en: "Offline", "zh-CN": "离线" },
  "topbar.docs": { en: "Docs", "zh-CN": "文档" },
  "settings.language": { en: "Language", "zh-CN": "语言" },
  "settings.language.en": { en: "English", "zh-CN": "English" },
  "settings.language.zh-CN": { en: "简体中文", "zh-CN": "简体中文" },
  "settings.gatewayUrl": { en: "Gateway URL", "zh-CN": "网关地址" },
  "settings.token": { en: "Token", "zh-CN": "令牌" },
  "settings.sessionKey": { en: "Session key", "zh-CN": "会话键" },
  "settings.connect": { en: "Connect", "zh-CN": "连接" },
  "settings.refresh": { en: "Refresh", "zh-CN": "刷新" },
  "config.title": { en: "Settings", "zh-CN": "设置" },
  "config.searchPlaceholder": { en: "Search settings...", "zh-CN": "搜索设置..." },
  "config.allSettings": { en: "All Settings", "zh-CN": "全部设置" },
};

const GROUP_LABEL_TO_KEY: Record<string, string> = {
  Chat: "chat",
  Control: "control",
  Agent: "agent",
  Settings: "settings",
  Resources: "resources",
};

export function t(key: string, locale: Locale): string {
  const msg = MESSAGES[key];
  if (!msg) return key;
  return msg[locale] ?? msg.en ?? key;
}

export function navGroupLabel(groupLabel: string, locale: Locale): string {
  const key = GROUP_LABEL_TO_KEY[groupLabel];
  if (!key) return groupLabel;
  return t(`nav.group.${key}`, locale);
}

export const LOCALES: Locale[] = ["en", "zh-CN"];
export const DEFAULT_LOCALE: Locale = "en";
