#!/usr/bin/env bash
# Docker 部署入口：从仓库根目录执行 docker-setup.sh。
# 用法:
#   ./scripts/docker-deploy.sh           # 完整流程：构建 + onboard + 启动
#   SKIP_ONBOARD=1 ./scripts/docker-deploy.sh   # 已有配置时：仅构建 + 启动
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f "$ROOT_DIR/docker-setup.sh" ]]; then
  echo "Not found: docker-setup.sh (run from moltbot repo root)" >&2
  exit 1
fi

exec ./docker-setup.sh
