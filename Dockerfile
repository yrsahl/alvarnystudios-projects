FROM node:20-alpine AS base
RUN npm install -g pnpm

FROM base AS dev-deps
COPY . /app
WORKDIR /app
RUN pnpm install

FROM base AS prod-deps
COPY ./package.json pnpm-lock.yaml /app/
WORKDIR /app
RUN pnpm install --prod

FROM base AS build
COPY . /app/
COPY --from=dev-deps /app/node_modules /app/node_modules
WORKDIR /app
RUN pnpm run build

FROM base
COPY ./package.json pnpm-lock.yaml /app/
COPY --from=prod-deps /app/node_modules /app/node_modules
COPY --from=build /app/build /app/build
WORKDIR /app
EXPOSE 3000
CMD ["pnpm", "run", "start"]
