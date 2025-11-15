# Stage 1: Build the Angular application
ARG NODE_VERSION=16.20.2
FROM node:${NODE_VERSION}-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install to tolerate lock mismatch)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application with legacy OpenSSL support for Node 16
ENV NODE_OPTIONS=--openssl-legacy-provider
RUN npm run build \
 && mkdir -p prerender \
 && BACKEND_URL=${BACKEND_URL:-http://host.docker.internal:8099} npm run prerender || echo "Prerender failed or backend unavailable, continuing with fallback"

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy built application from build stage
COPY --from=build /app/dist/id-card-app /usr/share/nginx/html
## Copy prerendered snapshots if generated (script will run in build stage next)
COPY --from=build /app/prerender /usr/share/nginx/html/prerender

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy service worker if it exists (optional)
COPY sw.js /usr/share/nginx/html/sw.js

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
