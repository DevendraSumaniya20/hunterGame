# Game server image (shared + server workspaces only; the app is not part of it).
FROM node:26-slim

WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
RUN npm ci

COPY shared shared
COPY server server

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/hunt.db \
    TRUST_PROXY=1
EXPOSE 3000

WORKDIR /app/server
# DEBUG is intentionally not set: /debug/rooms would expose every player's position.
CMD ["npx", "tsx", "src/index.ts"]
