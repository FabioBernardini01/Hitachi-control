#!/bin/bash

# filepath: /home/fabio/hitachi-control/start.sh

# Funzione per verificare se un comando è disponibile
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Funzione per verificare se il backend è pronto
wait_for_backend() {
  # Porta su cui il backend dovrebbe essere in ascolto (modifica se necessario)
  BACKEND_PORT=4000
  echo "🌐 Attendo che il backend sia pronto sulla porta $BACKEND_PORT..."

  # Esegui un loop finché il backend non è pronto
  until nc -z localhost $BACKEND_PORT; do
    echo "❌ Backend non pronto, riprovo tra 2 secondi..."
    sleep 2
  done

  echo "✅ Backend pronto!"
}

# Imposta la directory di lavoro al percorso dello script
BASE_DIR="/home/fabio/hitachi-control"
cd "$BASE_DIR" || { echo "❌ Directory $BASE_DIR non trovata!"; exit 1; }

# Avvia il backend in una nuova finestra del terminale
gnome-terminal -- bash -c "cd $BASE_DIR && docker compose up --build; exec bash"



wait_for_backend

sleep 5

# Genera il docker-compose-agents.yml in base alle aziende nel DB
echo "🛠️ Generazione dei servizi agent in base alle aziende registrate..."
cd "$BASE_DIR/agent" && node generateAgentsCompose.js
cd "$BASE_DIR"

# Avvia gli agent in una nuova finestra del terminale
if command_exists gnome-terminal; then
  echo "🚀 Avvio degli agent in una nuova finestra del terminale..."
  gnome-terminal -- bash -c "cd $BASE_DIR && docker compose -f docker-compose-agents.yml up --build; exec bash"
else
  echo "⚠️ gnome-terminal non trovato. Avvia manualmente gli agent con:"
  echo "cd $BASE_DIR && docker compose -f docker-compose-agents.yml up --build"
fi

# Verifica se gnome-terminal è disponibile
if command_exists gnome-terminal; then
  # Attendi che il backend sia pronto prima di avviare il frontend
  wait_for_backend

  # Avvia il frontend in una nuova finestra del terminale
  echo "🚀 Avvio del frontend in una nuova finestra del terminale..."
  gnome-terminal -- bash -c "cd $BASE_DIR/frontend && npm start; exec bash"
else
  echo "⚠️ gnome-terminal non trovato. Avvia manualmente il frontend con i seguenti comandi:"
  echo "cd $BASE_DIR/frontend && npm start"
fi

echo "✅ Tutto pronto! I container sono in esecuzione e il frontend dovrebbe essere avviato."

