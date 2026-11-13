# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN addgroup -S app && adduser -S app -G app \
  && chmod +x ./docker-entrypoint.sh \
  && mkdir -p storage/reports \
  && chown -R app:app /app

USER app

ENV PORT=3000
EXPOSE ${PORT}

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
