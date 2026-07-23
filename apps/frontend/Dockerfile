# syntax=docker/dockerfile:1.7
# node-sass 4.13 is part of this Angular 7 toolchain and supports Node 12's
# ABI. Node 14 Alpine falls back to a missing native build toolchain, making
# every cold Docker build slow and unreliable.
ARG NODE_VERSION=12.22.12

# Keep dependency installation in a layer that changes only when the lockfile
# changes. The npm cache mount prevents repeated registry downloads if Docker
# needs to rebuild that layer after an interrupted build.
FROM node:${NODE_VERSION}-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --no-audit --prefer-offline

FROM dependencies AS build
COPY . .
RUN npm run build:ssr

FROM node:${NODE_VERSION}-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps --only=production --no-audit --prefer-offline

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "server.js"]
