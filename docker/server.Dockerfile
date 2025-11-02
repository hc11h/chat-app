FROM node:20-alpine AS base


FROM base AS builder
WORKDIR /app


COPY package.json yarn.lock ./ 


COPY packages ./packages
COPY apps/server ./apps/server


RUN yarn install --frozen-lockfile


WORKDIR /app/apps/server


RUN yarn build


FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PATH /app/node_modules/.bin:$PATH # Add root node_modules/.bin to PATH


COPY --from=builder /app/apps/server ./apps/server
COPY --from=builder /app/node_modules ./node_modules

WORKDIR /app/apps/server

EXPOSE 4000

CMD ["node", "dist/index.js"]
