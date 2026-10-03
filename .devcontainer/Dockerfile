FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    curl \
    wget \
    ca-certificates \
    openssl \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@10.8.0

WORKDIR /workspace

COPY package*.json ./
COPY packages/backend/package*.json packages/backend/
COPY packages/frontend/package*.json packages/frontend/
COPY packages/shared/package*.json packages/shared/

RUN npm ci

COPY . .

RUN npm run db:generate

EXPOSE 3000 5173 5432 4566 8025

CMD ["sleep", "infinity"]