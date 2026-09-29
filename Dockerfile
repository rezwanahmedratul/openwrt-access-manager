# ==============================================================================
# OpenWrt Access Manager - Production Multi-Stage Dockerfile
# ==============================================================================

# Stage 1: Build
FROM node:20-slim AS builder
WORKDIR /app

# Cache dependencies
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --ignore-optional

# Copy source code
COPY . .

# Build-time environment variables for Next.js public bundles
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Increase heap to prevent OOM during bundling
RUN NODE_OPTIONS="--max-old-space-size=2048" npm run build

# Stage 2: Minimal Production Runtime
FROM node:20-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# Copy static assets and standalone bundle
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy externalized ioredis + its hoisted dependencies into standalone runtime
COPY --from=builder /app/node_modules/ioredis ./node_modules/ioredis
COPY --from=builder /app/node_modules/@ioredis ./node_modules/@ioredis
COPY --from=builder /app/node_modules/denque ./node_modules/denque
COPY --from=builder /app/node_modules/redis-errors ./node_modules/redis-errors
COPY --from=builder /app/node_modules/standard-as-callback ./node_modules/standard-as-callback
COPY --from=builder /app/node_modules/cluster-key-slot ./node_modules/cluster-key-slot

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
