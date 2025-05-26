FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 503
EXPOSE 504
EXPOSE 505
EXPOSE 506

# Usa la variabile SERVER_FILE per decidere quale server avviare

CMD ["sh", "-c", "node $SERVER_FILE"]