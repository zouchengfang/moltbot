#!/usr/bin/env bash
# 在 131 服务器上执行：将当前目录初始化为 git 仓库并设置远程为 zouchengfang/moltbot，
# 便于之后直接 git pull 更新代码（rsync 部署时未同步 .git）。
#
# 在服务器上执行：
#   cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/git-init-remote.sh
set -euo pipefail

APP_ROOT="${APP_ROOT:-/zouchengfang/moltbot}"
REPO_URL="${MOLTBOT_GIT_REMOTE:-https://github.com/zouchengfang/moltbot.git}"
cd "$APP_ROOT"

# Avoid "dubious ownership" when repo dir is owned by different user (e.g. root on server)
git config --global --add safe.directory "$APP_ROOT" 2>/dev/null || true

if [[ -d .git ]]; then
  echo "==> .git already exists, only setting remote origin to $REPO_URL"
  git remote remove origin 2>/dev/null || true
  git remote add origin "$REPO_URL"
  git fetch origin
  git branch -M main 2>/dev/null || true
  git branch --set-upstream-to=origin/main main 2>/dev/null || true
  echo "Done. Run 'git pull' to update."
  exit 0
fi

echo "==> Initializing git and setting origin to $REPO_URL"
git init
git remote add origin "$REPO_URL"
git fetch origin
# If local main has no commits yet (unborn branch), checkout origin/main as main
if ! git rev-parse --verify main >/dev/null 2>&1; then
  git checkout -b main origin/main
else
  git branch -M main
  git reset --hard origin/main
fi
git branch --set-upstream-to=origin/main main 2>/dev/null || true
echo "Done. Run 'git pull' to update."
