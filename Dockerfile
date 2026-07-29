# Stage 1: Base image with pnpm
FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable pnpm && corepack install -g pnpm@10.18.0

# Stage 2: Install dependencies (workspace-aware)
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/

# Install all dependencies needed for building
RUN pnpm config set node-linker hoisted \
    && pnpm install --frozen-lockfile \
    --filter @rag-advisor-demo/shared \
    --filter @rag-advisor-demo/client \
    --filter @rag-advisor-demo/server

# Stage 3: Build the application
FROM deps AS builder

# Copy package sources after dependency installation. Build output and dependencies remain excluded
# by .dockerignore, while new source directories cannot silently fall out of the production build.
COPY packages/shared ./packages/shared
COPY packages/client ./packages/client
COPY packages/server ./packages/server

# Copy build config files
COPY tsconfig.base.json tsconfig.json ./

# CRITICAL: Accept build args in builder stage
ARG VITE_APP_ENV
ARG VITE_API_DOMAIN
ARG VITE_APP_DOMAIN

# Set as ENV for Vite build
ENV VITE_APP_ENV=$VITE_APP_ENV
ENV VITE_API_DOMAIN=$VITE_API_DOMAIN
ENV VITE_APP_DOMAIN=$VITE_APP_DOMAIN

# Build shared first (required dependency)
RUN pnpm --filter @rag-advisor-demo/shared build

# Build client and server in parallel (independent, faster)
RUN pnpm --parallel --filter @rag-advisor-demo/client --filter @rag-advisor-demo/server build

# Stage 4: Production image (minimal)
FROM base AS production
ENV NODE_ENV=production

# Declare ARGs again for production stage
ARG VITE_API_DOMAIN
ARG VITE_APP_DOMAIN

# Pass to runtime ENV
ENV VITE_API_DOMAIN=$VITE_API_DOMAIN
ENV VITE_APP_DOMAIN=$VITE_APP_DOMAIN

# Copy workspace config files
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/

# Install ONLY production dependencies
RUN pnpm config set node-linker hoisted \
    && pnpm install --prod --frozen-lockfile \
    --filter @rag-advisor-demo/shared \
    --filter @rag-advisor-demo/client \
    --filter @rag-advisor-demo/server

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/client/dist ./packages/client/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
RUN mkdir -p node_modules/@rag-advisor-demo \
    && ln -s ../../packages/shared node_modules/@rag-advisor-demo/shared \
    && mkdir -p /app/logs /app/public/assets /tmp/rag-advisor-demo/assets \
    && chown -R node:node /app/logs /app/public/assets /tmp/rag-advisor-demo

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/healthz').then((res) => process.exit(res.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "packages/server/dist/server.js"]
