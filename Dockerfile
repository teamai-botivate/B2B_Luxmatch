# syntax=docker/dockerfile:1.7

FROM node:20.18.1-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.33.2
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ar-engine/package.json packages/ar-engine/package.json
COPY packages/cloudinary/package.json packages/cloudinary/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/embeddings/package.json packages/embeddings/package.json
COPY packages/intelligence/package.json packages/intelligence/package.json
COPY packages/qdrant/package.json packages/qdrant/package.json
COPY packages/tenant/package.json packages/tenant/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

FROM base AS builder
ARG LM_PIN_COOKIE_SECRET
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY
ARG CLOUDINARY_API_KEY
ARG CLOUDINARY_API_SECRET
ARG CLOUDINARY_CLOUD_NAME
ARG QDRANT_URL
ARG QDRANT_API_KEY
ARG SHOP_JEWELLER_ID
ENV LM_PIN_COOKIE_SECRET=$LM_PIN_COOKIE_SECRET \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY \
    CLOUDINARY_API_KEY=$CLOUDINARY_API_KEY \
    CLOUDINARY_API_SECRET=$CLOUDINARY_API_SECRET \
    CLOUDINARY_CLOUD_NAME=$CLOUDINARY_CLOUD_NAME \
    QDRANT_URL=$QDRANT_URL \
    QDRANT_API_KEY=$QDRANT_API_KEY \
    SHOP_JEWELLER_ID=$SHOP_JEWELLER_ID
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages ./packages
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @luxematch/web build

FROM node:20.18.1-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.33.2
WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages

EXPOSE 3000
CMD ["sh", "-c", "pnpm --filter @luxematch/web exec next start -H 0.0.0.0 -p ${PORT:-3000}"]
