FROM node:16.8-buster
WORKDIR /bot
CMD ["node", "dist/main.js", "--enable-source-maps"]
COPY package*.json ./
COPY tsconfig.json ./
RUN npm install
COPY src src
RUN npm run build
COPY config.toml ./
