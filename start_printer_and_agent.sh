#!/bin/bash
set -e

# 1. Copia il file .env nelle sottocartelle
cp .env agent/.env
cp .env modbus-server/.env

# 2. Avvia i 4 modbus server in Docker (usando --network host)
for i in 1 2 3 4; do
  PORT=$(grep "MODBUS_${i}_PORT" .env | cut -d '=' -f2 | tr -d '\r\n ')
  SERVER_FILE="modbus_server_${i}.js"
  echo "Avvio modbus-server-$i su 0.0.0.0:$PORT (Docker, bridge network, porta pubblicata)"
  docker build -t modbus-server-$i ./modbus-server
  docker rm -f modbus$i 2>/dev/null || true
  docker run -d \
    -p $PORT:$PORT \
    -e MODBUS_SERVERHOST_${i}=0.0.0.0 \
    -e MODBUS_${i}_PORT=$PORT \
    -e SERVER_FILE=$SERVER_FILE \
    --name modbus$i \
    modbus-server-$i
done

# 3. Leggi quanti agent avviare
HOW_MANY_AGENTS=$(grep HOW_MANY_AGENTS .env | cut -d '=' -f2 | tr -d '\r\n ')

# 4. Avvia gli agent in Docker (puoi usare la rete bridge di default)
for ((i=1; i<=HOW_MANY_AGENTS; i++)); do
  AGENT_USERNAME=$(grep "AGENT${i}_USERNAME" .env | cut -d '=' -f2 | tr -d '\r\n ')
  AGENT_PASSWORD=$(grep "AGENT${i}_PASSWORD" .env | cut -d '=' -f2 | tr -d '\r\n ')
  docker build -t hitachi-agent-$i ./agent
  docker rm -f agent$i 2>/dev/null || true
  docker run -d \
    --env AGENT_USERNAME="$AGENT_USERNAME" \
    --env AGENT_PASSWORD="$AGENT_PASSWORD" \
    --env-file agent/.env \
    --name agent$i \
    hitachi-agent-$i
done

echo "Tutti i modbus server (in Docker, host network) e agent (in Docker) sono stati avviati!"