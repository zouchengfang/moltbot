# 部署 Moltbot 到 app1-server (10.0.55.131)

将 Moltbot 以 Docker 方式部署到内网 app1-server，应用根目录为宿主机 `/zouchengfang/moltbot`，除 DeepSeek / Qwen API 外走代理 `10.5.0.8:3128`。

## 前置

- 本机可 SSH 到 `root@10.0.55.131`（建议配置免密）
- 服务器已安装 Docker 与 Docker Compose

## 一键部署（在 moltbot 仓库根目录执行）

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

## 直接用 SSH 在服务器上执行脚本

代码已同步到服务器后，可用一条 SSH 命令在远程执行构建与启动：

```bash
ssh root@10.0.55.131 'cd /zouchengfang/moltbot && ./scripts/deploy-to-app1-server/remote.sh'
```

免密配置好后无需输入密码。

## 环境变量

- `REMOTE`：SSH 目标，默认 `root@10.0.55.131`
- `APP_ROOT`：服务器上应用根目录，默认 `/zouchengfang/moltbot`
- `NODES_CONFIG`：`nodes_config.yaml` 路径，若存在且本机有 `yq`，会从中解析 app1-server 的 IP 与路径

## 代理与 NO_PROXY

- 容器内设置 `HTTP_PROXY` / `HTTPS_PROXY` 为 `http://10.5.0.8:3128`
- `NO_PROXY` 包含（以下不走代理）：
  - DeepSeek / Qwen 相关：`api.deepseek.com`、`chat.qwen.ai`、`portal.qwen.ai`、`dashscope.aliyun.com`
  - 本地网段：`10.0.55.0/24`、`10.0.66.0/24`、`10.8.0.0/24`、`10.5.0.0/16`
  - 以 `.cn` 结尾的域名（`.cn`）

配置来自 `docker-compose.app1-server.yml` 与 `.env.app1-server.example`。

## 首次登录

1. 在服务器上若未设置 `CLAWDBOT_GATEWAY_TOKEN`，脚本会生成并写入 `.env`
2. 浏览器访问 `http://10.0.55.131:18789/`，在控制台设置中粘贴 Token
