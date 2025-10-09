FROM node:20-alpine

WORKDIR /usr/src/app

COPY apps/server/package.json ./
COPY apps/server/tsconfig.json ./

COPY apps/server/src ./src

RUN npm install --production=false

RUN npx tsc

EXPOSE 3000

CMD ["npm", "start"]
