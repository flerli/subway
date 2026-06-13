FROM node:22-alpine

WORKDIR /app

COPY package.json ./package.json
RUN npm install --omit=dev

COPY server.mjs ./server.mjs

ENV HOST=0.0.0.0
ENV PORT=8787

EXPOSE 8787

CMD ["npm", "start"]
