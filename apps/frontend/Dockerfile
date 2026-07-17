ARG NODE_VERSION=14.21.3
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

# Force source-layer refresh when local frontend edits are made.
ARG FRONTEND_SOURCE_REV=20260717-news-fallback
RUN echo "$FRONTEND_SOURCE_REV"
COPY . .
RUN npm run build:ssr

FROM node:${NODE_VERSION}-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY package*.json ./
RUN npm install --legacy-peer-deps --only=production

COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./server.js

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "server.js"]
