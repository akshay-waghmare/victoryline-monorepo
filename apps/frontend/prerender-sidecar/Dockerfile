# Simple sidecar Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy sidecar code
COPY ./prerender-sidecar/package.json ./
RUN npm install --only=production
COPY ./prerender-sidecar/server.js ./

# Copy the prerender script from frontend scripts
COPY ./scripts ./scripts

# Expose health/trigger port
EXPOSE 9100

ENV PORT=9100 \
    PRERENDER_INTERVAL_MINUTES=3 \
    BACKEND_URL=http://backend:8099 \
    PRERENDER_OUT_DIR=/shared-html/prerender

CMD ["node", "server.js"]
