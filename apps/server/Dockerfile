# Build context is the repo root: docker build -f apps/server/Dockerfile .
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH
RUN corepack enable

FROM base AS build
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @droid247/server...
RUN pnpm --filter @droid247/server run build
RUN pnpm --filter @droid247/server deploy --prod --legacy /out

FROM node:22-alpine AS runtime
ENV NODE_ENV=production PORT=8787
WORKDIR /app
COPY --from=build /out/package.json ./
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /repo/apps/server/dist ./dist
USER node
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1
CMD ["node", "dist/index.js"]
