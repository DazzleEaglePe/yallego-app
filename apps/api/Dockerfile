# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/config-eslint/package.json packages/config-eslint/package.json
COPY packages/config-typescript/package.json packages/config-typescript/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/parsers/package.json packages/parsers/package.json

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY apps/api apps/api
COPY packages/config-eslint packages/config-eslint
COPY packages/config-typescript packages/config-typescript
COPY packages/contracts packages/contracts
COPY packages/parsers packages/parsers

RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    DATABASE_URL=postgresql://build:build@localhost:5432/build \
      pnpm --filter @yallego/api db:generate \
    && pnpm --filter @yallego/api... build \
    && pnpm --filter @yallego/api deploy --prod /opt/yallego-api \
    && build_modules="$(dirname "$(dirname "$(realpath apps/api/node_modules/@prisma/client)")")" \
    && deployed_modules="$(dirname "$(dirname "$(realpath /opt/yallego-api/node_modules/@prisma/client)")")" \
    && cp -R "$build_modules/.prisma/." "$deployed_modules/.prisma/"

# Tarea efímera de migración. Se mantiene separada del runtime para que la API
# final no incluya la CLI ni las dependencias de desarrollo de Prisma.
FROM build AS migrations

ENV NODE_ENV=production

WORKDIR /workspace/apps/api

USER node

ENTRYPOINT ["node", "node_modules/prisma/build/index.js", "migrate", "deploy", "--schema=prisma/schema.prisma"]

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3001

RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates dumb-init openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build --chown=node:node /opt/yallego-api ./

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3001) + '/v1/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/main.js"]
