FROM node:12
WORKDIR /usr/src/playly-backend

COPY package*.json ./
RUN npm install

COPY . .

CMD [ "node", "server.js" ]

