FROM node:20-alpine

# Prisma engine + healthcheck need OpenSSL and wget on Alpine/musl
RUN apk add --no-cache openssl libc6-compat wget

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "src/server.js"]

