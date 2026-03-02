FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# better-sqlite3 needs native build tools
RUN apt-get update && apt-get install -y python3 make g++ \
    && npm ci \
    && rm -rf /var/lib/apt/lists/*

FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_RC_URL=http://localhost:8080
ARG NEXT_PUBLIC_GATEWAY_URL=http://localhost:3100
ARG NEXT_PUBLIC_GATEWAY_API_KEY=rp-gateway-2026-secure-key
ENV NEXT_PUBLIC_RC_URL=${NEXT_PUBLIC_RC_URL}
ENV NEXT_PUBLIC_GATEWAY_URL=${NEXT_PUBLIC_GATEWAY_URL}
ENV NEXT_PUBLIC_GATEWAY_API_KEY=${NEXT_PUBLIC_GATEWAY_API_KEY}

RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Data directory for admin SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
