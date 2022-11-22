FROM node:lts-slim as builder
WORKDIR /app/
ADD tsconfig.json /app/
ADD package.json /app/
ADD yarn.lock /app/

RUN yarn

ADD src /app/src
RUN yarn build

RUN rm -rf node_modules
RUN yarn install --prod

FROM node:lts-slim as runner
ENV NODE_ENV prod
USER 1000
EXPOSE 3000
WORKDIR /app/

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/build/ /app/

CMD ["node", "index.js"]
