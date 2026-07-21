# --- Build stage ---
FROM node:22-slim AS builder
WORKDIR /app
# better-sqlite3 compiles a native addon; needs a toolchain + python at build.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_PATH=/data/app.sqlite

# Next standalone output + static assets + migrations (needed at boot).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle

# Persist the single-file SQLite database on a mounted volume.
RUN mkdir -p /data
VOLUME /data

EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
