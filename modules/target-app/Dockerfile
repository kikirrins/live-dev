FROM node:20-alpine AS base
RUN npm install -g pnpm@9.12.0

# ---- deps ----
FROM base AS deps
WORKDIR /repo
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./
COPY packages/target-app/package.json ./packages/target-app/
# stub other packages so pnpm workspace resolves
COPY packages/overlay/package.json ./packages/overlay/
COPY packages/bridge/package.json ./packages/bridge/
COPY packages/livedev-next/package.json ./packages/livedev-next/
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM deps AS builder
WORKDIR /repo
COPY packages/target-app ./packages/target-app
COPY packages/overlay ./packages/overlay
COPY packages/livedev-next ./packages/livedev-next
# build overlay → packages/livedev-next/assets/livedev-overlay.js
RUN pnpm --filter overlay build
# copy overlay into target-app/public for the Next.js build
RUN cp packages/livedev-next/assets/livedev-overlay.js packages/target-app/public/livedev-overlay.js
# then build Next.js with overlay enabled
ENV NEXT_PUBLIC_LIVEDEV_ENABLED=true
RUN pnpm --filter target-app build

# ---- runner ----
FROM node:20-alpine AS runner
RUN npm install -g pnpm@9.12.0
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=16000

COPY --from=builder /repo/packages/target-app/.next/standalone ./
COPY --from=builder /repo/packages/target-app/.next/static ./packages/target-app/.next/static
COPY --from=builder /repo/packages/target-app/public ./packages/target-app/public

EXPOSE 16000
CMD ["node", "packages/target-app/server.js"]
