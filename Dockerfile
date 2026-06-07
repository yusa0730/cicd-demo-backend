FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npm run codegen

FROM deps AS build
COPY tsconfig.json tsconfig.build.json tsconfig.seed.json nest-cli.json ./
COPY src ./src
RUN npm run build && npx tsc -p tsconfig.seed.json

FROM public.ecr.aws/docker/library/node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npm run codegen

COPY --from=build /app/dist ./dist

CMD ["npm", "run", "start:prod"]
