FROM node:20-alpine AS base


FROM base AS builder
WORKDIR /app


COPY package.json yarn.lock ./


COPY packages ./packages
COPY apps/web ./apps/web


RUN yarn install --frozen-lockfile


WORKDIR /app/apps/web


RUN yarn build


FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PATH /app/node_modules/.bin:$PATH # Add root node_modules/.bin to PATH


COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/web

EXPOSE 3000

CMD ["yarn", "start"]
