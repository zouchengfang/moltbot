# 部署 Moltbot 到 app1-server (10.0.55.131)

将 Moltbot 以 Docker 方式部署到内网 app1-server，应用根目录为宿主机 `/zouchengfang/moltbot`，除 DeepSeek / Qwen API 外走代理 `10.5.0.8:3128`。

## 前置

- 本机可 SSH 到 `root@10.0.55.131`（建议配置免密）
- 服务器已安装 Docker 与 Docker Compose

## 完整重新打包部署（推荐）

在 moltbot 仓库根目录执行，会：**同步代码 → 在服务器上重新构建镜像 → 强制重建并启动网关**：

```bash
./scripts/deploy-to-app1-server/full-redeploy.sh
```

等价于先 `deploy.sh sync` 再 `deploy.sh remote`；`remote.sh` 内使用 `docker compose up -d --force-recreate moltbot-gateway`，保证用新镜像重建容器。

## 一键部署（首次或常规）

```bash
./scripts/deploy-to-app1-server/deploy.sh
```

会依次：同步代码到 `10.0.55.131:/zouchengfang/moltbot` → 在服务器上创建目录、生成/使用 `.env`、构建镜像、启动网关。

## 仅同步代码

```bash
./scripts/deploy-to-app1-server/deploy.sh sync
```

## 仅在服务器上构建并启动（代码已存在）

```bash
./scripts/deploy-to-app1-server/deploy.sh remote
```

## 在 131 服务器上直接执行（重新打包部署）

已在服务器上（如 `git pull` 后）时，只做**重新构建 + 强制重建并启动**，不创建 .env/目录：

```bash
# 在 131 上执行
cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/redeploy-on-server.sh
```

或本机 SSH 执行：

```bash
ssh root@10.0.55.131 'cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/redeploy-on-server.sh'
```

与 `remote.sh` 区别：`redeploy-on-server.sh` 不创建目录、不生成 .env，假定已部署过，仅 build + up --force-recreate。

## 直接用 SSH 在服务器上执行脚本（首次或完整）

代码已同步到服务器后，可用一条 SSH 命令在远程执行**完整**构建与启动（含目录、.env、build、启动）：

```bash
ssh root@10.0.55.131 'cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/remote.sh'
```

免密配置好后无需输入密码。

## 环境变量

- `REMOTE`：SSH 目标，默认 `root@10.0.55.131`
- `APP_ROOT`：服务器上应用根目录，默认 `/zouchengfang/moltbot`
- `NODES_CONFIG`：`nodes_config.yaml` 路径，若存在且本机有 `yq`，会从中解析 app1-server 的 IP 与路径

## 国内镜像（打包加速）

在 131 上构建时，脚本默认使用中国境内镜像以加速拉取：

- **Node 基础镜像**：`docker.1ms.run/library/node:22-bookworm`（1ms Docker Hub 镜像，无需认证）
- **npm/pnpm 源**：`https://registry.npmmirror.com`（npmmirror 淘宝源）

`remote.sh` 与 `redeploy-on-server.sh` 默认 `USE_CHINA_MIRROR=1`。若使用海外环境构建或当前国内镜像不可用，可关闭国内镜像（改走代理拉取 Docker Hub）：

```bash
USE_CHINA_MIRROR=0 ./scripts/deploy-to-app1-server/redeploy-on-server.sh
```

**手动构建时使用国内镜像：**

```bash
cd /zouchengfang/moltbot
docker build -t moltbot:local -f Dockerfile . \
  --build-arg NODE_IMAGE=docker.1ms.run/library/node:22-bookworm \
  --build-arg PNPM_REGISTRY=https://registry.npmmirror.com
docker compose -f docker-compose.yml -f docker-compose.app1-server.yml up -d --force-recreate moltbot-gateway
```

## 代理与 NO_PROXY

**构建时代理**：若在执行脚本前已设置 `http_proxy`/`https_proxy`（如 Jenkins 在 SSH 中 `export http_proxy=...`），`redeploy-on-server.sh` 会将其作为 Docker 构建参数传入，镜像内 `pnpm install` / `pnpm ui:install`（含从 GitHub 下载 matrix-sdk-crypto 等）会走代理，可避免直连超时（如 `socket hang up`）。

打包/运行时，**以下地址不使用网络代理**（已写入 NO_PROXY）：

- **DeepSeek**：`api.deepseek.com`
- **Qwen API**：`chat.qwen.ai`、`portal.qwen.ai`、`dashscope.aliyun.com`

此外 NO_PROXY 还包含本地网段与 `.cn`，便于直连内网与国内域名。

- 容器内设置 `HTTP_PROXY` / `HTTPS_PROXY` 为 `http://10.5.0.8:3128`
- `NO_PROXY` 完整默认值：`api.deepseek.com,chat.qwen.ai,portal.qwen.ai,dashscope.aliyun.com,10.0.55.0/24,10.0.66.0/24,10.8.0.0/24,10.5.0.0/16,.cn`

配置来自 `docker-compose.app1-server.yml` 与 `.env.app1-server.example`。详见 [Docker 部署（中文）](/install/docker-deploy-zh#打包部署时不走代理的地址)。

## 首次登录

1. 在服务器上若未设置 `CLAWDBOT_GATEWAY_TOKEN`，脚本会生成并写入 `.env`
2. 浏览器访问 `http://10.0.55.131:18789/`，在控制台设置中粘贴 Token
