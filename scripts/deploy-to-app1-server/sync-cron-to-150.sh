#!/usr/bin/env bash
# 从参考主机（如 10.5.0.8 或 131）同步 moltbot 定时任务到 150。
# 定时任务存储在 Gateway 的 .clawdbot/cron/jobs.json，同步后需重启 150 的 gateway 使任务生效。
#
# 用法（在能 SSH 到 SOURCE 与 150 的本机执行）：
#   SOURCE_HOST=root@10.5.0.8 ./scripts/deploy-to-app1-server/sync-cron-to-150.sh
#   SOURCE_HOST=root@10.0.55.131 ./scripts/deploy-to-app1-server/sync-cron-to-150.sh
#
# 环境变量：
#   SOURCE_HOST      参考主机（默认 root@10.5.0.8）
#   SOURCE_CRON_PATH 参考主机上 cron jobs.json 的绝对路径（默认见下）
#                     10.5.0.8 使用 /root/.openclaw/cron/jobs.json，131/150 使用 APP_ROOT/.clawdbot/cron/jobs.json
#   TARGET_HOST      目标主机 150（默认 root@10.0.55.150）
#   APP_ROOT         150 上应用根目录，目标路径为 APP_ROOT/.clawdbot/cron/jobs.json（默认 /zouchengfang/moltbot）
#   RESTART          同步后是否重启 150 的 gateway（默认 1，设 0 不重启）
set -euo pipefail

SOURCE_HOST="${SOURCE_HOST:-root@10.5.0.8}"
TARGET_HOST="${TARGET_HOST:-root@10.0.55.150}"
APP_ROOT="${APP_ROOT:-/zouchengfang/moltbot}"
RESTART="${RESTART:-1}"
# 10.5.0.8 上 moltbot 用 .openclaw 目录，其余用 APP_ROOT/.clawdbot
SOURCE_CRON_PATH="${SOURCE_CRON_PATH:-}"
if [[ -z "$SOURCE_CRON_PATH" ]]; then
  if [[ "$SOURCE_HOST" == *"10.5.0.8"* ]]; then
    SOURCE_CRON_PATH="/root/.openclaw/cron/jobs.json"
  else
    SOURCE_CRON_PATH="${APP_ROOT}/.clawdbot/cron/jobs.json"
  fi
fi
TARGET_CRON_JSON="${APP_ROOT}/.clawdbot/cron/jobs.json"

echo "==> Syncing cron from ${SOURCE_HOST} to ${TARGET_HOST}"
echo "    Source: ${SOURCE_CRON_PATH}"
echo "    Target: ${TARGET_CRON_JSON}"

# 从参考主机拉取 jobs.json，写入 150
ssh -o StrictHostKeyChecking=accept-new "${SOURCE_HOST}" "cat '${SOURCE_CRON_PATH}' 2>/dev/null || echo '{\"version\":1,\"jobs\":[]}'" \
  | ssh -o StrictHostKeyChecking=accept-new "${TARGET_HOST}" "mkdir -p $(dirname "${TARGET_CRON_JSON}") && cat > '${TARGET_CRON_JSON}'"

echo "    Done: ${TARGET_CRON_JSON} on ${TARGET_HOST}"

if [[ "${RESTART}" == "1" ]]; then
  echo "==> Restarting moltbot-gateway on ${TARGET_HOST}"
  ssh -o StrictHostKeyChecking=accept-new "${TARGET_HOST}" "cd ${APP_ROOT} && docker compose -f docker-compose.yml -f docker-compose.app1-server.yml restart moltbot-gateway 2>/dev/null || true"
  echo "    Gateway restarted."
fi

echo "==> Cron sync complete."
