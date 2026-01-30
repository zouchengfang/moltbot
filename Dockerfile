# Base image (override for China: NODE_IMAGE=docker.1ms.run/library/node:22-bookworm)
# Build with BuildKit for cache mounts: DOCKER_BUILDKIT=1 docker build ...
ARG NODE_IMAGE=node:22-bookworm
FROM ${NODE_IMAGE}

# Optional proxy for build (e.g. Jenkins export http_proxy; pass via --build-arg)
ARG HTTP_PROXY=
ARG HTTPS_PROXY=
ARG NO_PROXY=
ENV HTTP_PROXY=${HTTP_PROXY} HTTPS_PROXY=${HTTPS_PROXY} NO_PROXY=${NO_PROXY}
ENV http_proxy=${HTTP_PROXY} https_proxy=${HTTPS_PROXY} no_proxy=${NO_PROXY}

# Install Bun (required for build scripts)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

RUN corepack enable

WORKDIR /app

ARG CLAWDBOT_DOCKER_APT_PACKAGES=""
RUN if [ -n "$CLAWDBOT_DOCKER_APT_PACKAGES" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends $CLAWDBOT_DOCKER_APT_PACKAGES && \
      apt-get clean && \
      rm -rf /var/lib/apt/lists/* /var/cache/apt/archives/*; \
    fi

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY ui/package.json ./ui/package.json
COPY patches ./patches
COPY scripts ./scripts

# npm/pnpm registry (override for China: PNPM_REGISTRY=https://registry.npmmirror.com)
ARG PNPM_REGISTRY=
RUN if [ -n "$PNPM_REGISTRY" ]; then echo "registry=$PNPM_REGISTRY" >> .npmrc; fi

# Cache pnpm store so dependencies are not re-downloaded when only source changes (BuildKit required)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .
# Re-apply registry after COPY so ui:install/ui:build use same mirror (COPY overwrites .npmrc)
ARG PNPM_REGISTRY=
RUN if [ -n "$PNPM_REGISTRY" ]; then echo "registry=$PNPM_REGISTRY" >> .npmrc; fi
RUN CLAWDBOT_A2UI_SKIP_MISSING=1 pnpm build
# Force pnpm for UI build (Bun may fail on ARM/Synology architectures)
ENV CLAWDBOT_PREFER_PNPM=1
# Reuse same pnpm store cache so ui:install does not re-download (only links)
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm ui:install
RUN pnpm ui:build

ENV NODE_ENV=production

# Security hardening: Run as non-root user
# The node:22-bookworm image includes a 'node' user (uid 1000)
# This reduces the attack surface by preventing container escape via root privileges
USER node

CMD ["node", "dist/index.js"]
