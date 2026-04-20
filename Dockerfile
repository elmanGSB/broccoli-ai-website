# Stage 1: build static site with bun
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Dependency layer first for cache
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# PUBLIC_* vars are baked into static HTML at build time (Astro SSG)
# These are NOT runtime env vars — they become string literals in dist/
ARG PUBLIC_BROCCOLI_API=https://jumpersapp.com
ARG PUBLIC_FORMSPREE_URL=https://formspree.io/f/mdayavqr
ARG PUBLIC_CAL_URL=https://cal.com/elman/free-ai-consultation

ENV PUBLIC_BROCCOLI_API=$PUBLIC_BROCCOLI_API \
    PUBLIC_FORMSPREE_URL=$PUBLIC_FORMSPREE_URL \
    PUBLIC_CAL_URL=$PUBLIC_CAL_URL

RUN bun run build

# Stage 2: serve with nginx
# nginx:alpine entrypoint auto-runs envsubst on /etc/nginx/templates/*.template
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
