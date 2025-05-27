FROM node:20

WORKDIR /app

COPY agent/package*.json ./
RUN npm install

COPY agent/. .

CMD ["node", "agent.js"]