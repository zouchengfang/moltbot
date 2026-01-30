#!/usr/bin/env bash
# 完整重新打包部署：同步代码到 app1-server，在服务器上重新构建镜像并强制重建、启动网关。
# 在 moltbot 仓库根目录执行: ./scripts/deploy-to-app1-server/full-redeploy.sh
#
# 环境变量: REMOTE, APP_ROOT, NODES_CONFIG（同 deploy.sh）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

"$SCRIPT_DIR/deploy.sh" sync
"$SCRIPT_DIR/deploy.sh" remote
