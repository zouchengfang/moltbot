---
summary: "Docker 方式部署 Moltbot 网关（步骤与脚本说明）"
read_when:
  - 使用 Docker 或 Docker Compose 部署 Moltbot
  - 需要中文部署步骤与一键脚本说明
---

# Docker 部署步骤（中文）

本文说明如何使用 Docker 方式部署 Moltbot 网关，包括推荐的一键脚本与手动步骤。

## 前置要求

- 已安装 **Docker** 与 **Docker Compose v2**
- 磁盘空间足够（镜像与日志）

验证：

```bash
docker --version
docker compose version
```

## 方式一：一键部署（推荐）

在仓库根目录执行：

```bash
./docker-setup.sh
```

该脚本会依次：

1. 检查 Docker / Docker Compose
2. 创建配置与工作目录（默认 `~/.clawdbot`、`~/clawd`）
3. 若未设置则生成 `CLAWDBOT_GATEWAY_TOKEN` 并写入 `.env`
4. 构建镜像（默认 `moltbot:local`）
5. 交互式运行 **onboard** 向导（网关绑定、认证方式、Token、Tailscale 等）
6. 启动 **moltbot-gateway** 容器

完成后：

- 本机访问：`http://127.0.0.1:18789/`
- 远程访问：见下方 [远程访问](#远程访问) 小节
- 在控制台「设置」中粘贴脚本输出的 Token

### 常用环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| `CLAWDBOT_IMAGE` | 镜像名 | `moltbot:local` |
| `CLAWDBOT_CONFIG_DIR` | 配置目录 | `~/.clawdbot` |
| `CLAWDBOT_WORKSPACE_DIR` | 工作目录 | `~/clawd` |
| `CLAWDBOT_GATEWAY_PORT` | 网关端口 | `18789` |
| `CLAWDBOT_GATEWAY_BIND` | 绑定方式 | `lan`（容器内推荐） |
| `CLAWDBOT_GATEWAY_TOKEN` | 网关认证 Token | 未设置时由脚本生成 |
| `CLAWDBOT_DOCKER_APT_PACKAGES` | 构建时安装的 apt 包 | 空 |
| `CLAWDBOT_EXTRA_MOUNTS` | 额外挂载（逗号分隔） | 空 |
| `CLAWDBOT_HOME_VOLUME` | 持久化 `/home/node` 的命名卷 | 空 |

## 方式二：使用部署脚本（可选）

可从仓库任意位置执行 `scripts/docker-deploy.sh`（会切换到仓库根目录并调用 `docker-setup.sh`）：

```bash
# 首次或需要重新 onboard 时（完整流程）
./scripts/docker-deploy.sh

# 已有配置，仅构建并启动（跳过交互式 onboard）
SKIP_ONBOARD=1 ./scripts/docker-deploy.sh
```

也可在项目根目录直接设置 `SKIP_ONBOARD=1` 后执行 `./docker-setup.sh`，效果相同。

## 方式三：完全手动步骤

### 1. 构建镜像

```bash
docker build -t moltbot:local -f Dockerfile .
```

如需在镜像中预装系统包（如 ffmpeg）：

```bash
docker build --build-arg CLAWDBOT_DOCKER_APT_PACKAGES="ffmpeg" -t moltbot:local -f Dockerfile .
```

### 2. 准备目录与 Token

```bash
mkdir -p ~/.clawdbot ~/clawd
export CLAWDBOT_GATEWAY_TOKEN=$(openssl rand -hex 32)
echo "CLAWDBOT_GATEWAY_TOKEN=$CLAWDBOT_GATEWAY_TOKEN"
```

将 `CLAWDBOT_GATEWAY_TOKEN` 写入项目根目录 `.env`（或导出到当前 shell），供 compose 使用。

### 3. 首次配置（onboard）

```bash
export CLAWDBOT_CONFIG_DIR="${CLAWDBOT_CONFIG_DIR:-$HOME/.clawdbot}"
export CLAWDBOT_WORKSPACE_DIR="${CLAWDBOT_WORKSPACE_DIR:-$HOME/clawd}"
export CLAWDBOT_GATEWAY_PORT="${CLAWDBOT_GATEWAY_PORT:-18789}"
export CLAWDBOT_GATEWAY_BIND="${CLAWDBOT_GATEWAY_BIND:-lan}"
export CLAWDBOT_IMAGE="${CLAWDBOT_IMAGE:-moltbot:local}"

docker compose run --rm moltbot-cli onboard --no-install-daemon
```

按提示选择：绑定 `lan`、认证方式 `token`、填入上面的 Token、Tailscale 按需关闭、不安装系统 daemon。

### 4. 启动网关

```bash
docker compose up -d moltbot-gateway
```

### 5. 验证

- 访问：`http://127.0.0.1:18789/`（或你映射的端口）
- 健康检查（在宿主机执行）：

```bash
docker compose exec moltbot-gateway node dist/index.js health --token "$CLAWDBOT_GATEWAY_TOKEN"
```

## 常用操作

### 查看网关日志

```bash
docker compose logs -f moltbot-gateway
```

### 使用 CLI 容器执行命令

```bash
docker compose run --rm moltbot-cli <子命令> [参数]
```

例如：

- 登录 WhatsApp（扫码）：`docker compose run --rm moltbot-cli providers login`
- 添加 Telegram：`docker compose run --rm moltbot-cli providers add --provider telegram --token <token>`
- 查看通道状态：`docker compose run --rm moltbot-cli channels status`

### 停止与清理

```bash
docker compose down
# 仅删除容器，保留 ~/.clawdbot 与 ~/clawd 数据
```

## 远程访问

默认配置下网关已可在**同一局域网**内被其他设备访问（`CLAWDBOT_GATEWAY_BIND=lan` 且端口映射到主机所有网卡）。

### 同局域网内访问

1. 保持 `CLAWDBOT_GATEWAY_BIND=lan`（默认）。
2. 确保 `docker-compose.yml` 中端口为 `"${CLAWDBOT_GATEWAY_PORT:-18789}:18789"`（不写 `127.0.0.1:` 前缀），这样宿主机会在所有网卡上监听。
3. 在另一台设备浏览器打开：`http://<宿主机 IP>:18789/`（将 `<宿主机 IP>` 换成运行 Docker 的机器在内网的 IP）。
4. 若无法访问，检查宿主机防火墙是否放行 18789（及 18790，若使用 bridge）。

### 从公网访问（例如网关在 VPS）

**方案 A：SSH 隧道（推荐，无需暴露端口）**

在本地电脑执行，将 VPS 上的 18789 映射到本机：

```bash
ssh -L 18789:127.0.0.1:18789 user@<VPS 公网 IP>
```

保持该 SSH 连接，在本地浏览器打开 `http://127.0.0.1:18789/` 即可。无需在 VPS 上开放 18789 端口。

**方案 B：直接暴露端口**

1. 在 VPS 上端口映射保持为 `"18789:18789"`（或 `"0.0.0.0:18789:18789"`），确保网关容器对外监听。
2. 在云控制台/防火墙中放行 TCP 18789（及 18790 若需要）。
3. 使用 `http://<VPS 公网 IP>:18789/` 访问。  
   **安全建议**：公网暴露务必配合 TLS（反向代理如 Caddy/Nginx 做 HTTPS）和强 Token，参见 [Gateway 安全](/gateway/security)。

### 仅允许本机访问（禁止远程）

若希望只有本机能连，可在 `docker-compose.yml` 中把端口改为只绑定回环地址：

```yaml
ports:
  - "127.0.0.1:${CLAWDBOT_GATEWAY_PORT:-18789}:18789"
  - "127.0.0.1:${CLAWDBOT_BRIDGE_PORT:-18790}:18790"
```

## 生产/ VPS 部署提示

- 在 VPS 上建议将 `CLAWDBOT_CONFIG_DIR` / `CLAWDBOT_WORKSPACE_DIR` 设为持久化路径（如 `/root/.clawdbot`、`/root/clawd`），并对目录做 `chown 1000:1000`（与镜像内 node 用户一致）。
- 端口映射若只允许本机访问：使用 `"127.0.0.1:18789:18789"`，通过 SSH 隧道访问；若对外暴露需自行配置防火墙与 TLS。
- 更多细节见 [Hetzner (Docker VPS)](/platforms/hetzner) 与 [Docker（英文）](/install/docker)。

## 打包/部署时不走代理的地址

使用网络代理（如 HTTP_PROXY/HTTPS_PROXY）进行打包或部署时，以下地址应加入 **NO_PROXY**，不经过代理直连：

- **DeepSeek**：`api.deepseek.com`
- **Qwen 相关 API**：`chat.qwen.ai`、`portal.qwen.ai`、`dashscope.aliyun.com`

上述已写入 `scripts/deploy-to-app1-server` 的 `.env.app1-server.example` 与 `docker-compose.app1-server.yml` 的默认 NO_PROXY；其他部署场景请自行在环境或 Compose 中设置相同 NO_PROXY。

## 部署到 app1-server (10.0.55.131)

若将应用部署到内网 app1-server，应用根目录为宿主机 `/zouchengfang/moltbot`，且除 DeepSeek / Qwen API 外需走代理 `10.5.0.8:3128`，可使用专用配置与脚本：

1. **Compose 覆盖**：`docker-compose.app1-server.yml`（代理与 NO_PROXY、数据目录）
2. **环境示例**：`scripts/deploy-to-app1-server/.env.app1-server.example`
3. **一键部署**（在仓库根目录执行）：
   ```bash
   ./scripts/deploy-to-app1-server/deploy.sh
   ```
   会同步代码到 `10.0.55.131:/zouchengfang/moltbot`，在服务器上构建镜像并以 `docker compose -f docker-compose.yml -f docker-compose.app1-server.yml up -d` 启动网关。

详见 `scripts/deploy-to-app1-server/README.md`。

## 相关文档

- [Docker（英文详细）](/install/docker)
- [Hetzner VPS 部署](/platforms/hetzner)
- [Gateway 健康检查](/gateway/health)
