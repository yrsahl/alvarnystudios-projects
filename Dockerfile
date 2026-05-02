FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS dev-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY . .
COPY --from=dev-deps /app/node_modules ./node_modules
RUN pnpm run build

FROM base AS prod-deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
CMD ["node_modules/.bin/react-router-serve", "./build/server/index.js"]
