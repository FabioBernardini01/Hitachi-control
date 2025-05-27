# backend/Dockerfile
FROM node:20

# Aggiungi netcat
RUN apt-get update && apt-get install -y netcat-openbsd

# Imposta la working directory
WORKDIR /app

# Copia i file di configurazione
COPY package*.json ./

# Installa le dipendenze
RUN npm install

# Copia tutto il backend
COPY . .


EXPOSE 4000
# Rendi eseguibile lo script di attesa
RUN chmod +x wait-for-postgres.sh

# Avvia: aspetta il DB e poi parte il server
CMD ["./wait-for-postgres.sh", "node", "server.js"]
