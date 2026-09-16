FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/ packages/
COPY apps/server/prisma/ apps/server/prisma/
RUN npm ci && npm run db:generate
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["sh", "-c", "npm run db:migrate && npx tsx apps/server/src/index.ts"]
