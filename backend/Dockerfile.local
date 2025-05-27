FROM node:20

# Aggiungi netcat (nc) al container
RUN apt-get update && apt-get install -y netcat-openbsd

# Imposta la working directory
WORKDIR /app

# Copia i file necessari
COPY backend/package*.json ./

# Installa le dipendenze
RUN npm install



# Copia tutto il progetto
COPY backend/. .

COPY backend/insert-companies.cjs ./
COPY backend/insert-users.cjs ./
COPY backend/insert-printers.cjs ./


# Copia lo script di attesa e rendilo eseguibile
COPY backend/wait-for-postgres.sh .
RUN chmod +x wait-for-postgres.sh

# Comando di avvio: aspetta il DB e poi lancia il server
CMD ["./wait-for-postgres.sh", "node", "server.js"]

