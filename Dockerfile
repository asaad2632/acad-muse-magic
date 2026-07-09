# Build stage — bun install + build. Only this stage needs bun; the nitro
# node-server output it produces is a fully self-contained bundle (no
# node_modules required at runtime), so the runtime stage is plain Node.
FROM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Runtime stage — matches the Node version this build was verified against
# locally (v24).
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]
