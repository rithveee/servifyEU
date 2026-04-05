FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app

FROM base AS builder
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/shared-utils/package.json ./packages/shared-utils/
COPY apps/ai-agent/package.json ./apps/ai-agent/

RUN pnpm install --frozen-lockfile

COPY packages/ ./packages/
COPY apps/ai-agent/ ./apps/ai-agent/

RUN pnpm --filter @servify/database db:generate
RUN pnpm --filter @servify/ai-agent build

FROM node:20-alpine AS runner
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 agent
WORKDIR /app

COPY --from=builder --chown=agent:nodejs /app/apps/ai-agent/dist ./dist
COPY --from=builder --chown=agent:nodejs /app/apps/ai-agent/knowledge-base ./knowledge-base
COPY --from=builder --chown=agent:nodejs /app/node_modules ./node_modules

USER agent
EXPOSE 3004
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
