FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Provide dummy env vars at build time so Next.js doesn't inline undefined
ENV NCB_INSTANCE=build_placeholder
ENV NCB_SECRET_KEY=build_placeholder
ENV NCB_DATA_URL=https://openapi.nocodebackend.com
ENV NCB_AUTH_URL=https://app.nocodebackend.com/api/user-auth
ENV NEXT_PUBLIC_APP_URL=https://transcriber.tolqa.com
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
