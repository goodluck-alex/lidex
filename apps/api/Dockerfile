FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package*.json ./
RUN npm ci

FROM deps AS build
COPY prisma ./prisma
COPY nest-cli.json tsconfig*.json ./
COPY src ./src
RUN npx prisma generate && npm run build && npm prune --omit=dev

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache dumb-init openssl && addgroup -S lidex && adduser -S lidex -G lidex
COPY --from=build --chown=lidex:lidex /app/node_modules ./node_modules
COPY --from=build --chown=lidex:lidex /app/dist ./dist
COPY --from=build --chown=lidex:lidex /app/prisma ./prisma
COPY --from=build --chown=lidex:lidex /app/package.json ./package.json
USER lidex
EXPOSE 3000
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
