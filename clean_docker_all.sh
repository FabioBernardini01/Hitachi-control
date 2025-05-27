#!/bin/bash
# filepath: /home/fabio/hitachi-control/clean_docker_all.sh

echo "⚠️  ATTENZIONE: Questo script eliminerà TUTTI i container, immagini, volumi e reti Docker non di default!"
read -p "Sei sicuro di voler continuare? (y/N): " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Annullato."
  exit 1
fi

echo "Stopping all containers..."
docker stop $(docker ps -aq) 2>/dev/null

echo "Removing all containers..."
docker rm $(docker ps -aq) 2>/dev/null

echo "Removing all images..."
docker rmi -f $(docker images -aq) 2>/dev/null

echo "Removing all networks (except default)..."
docker network prune -f

echo "Removing all volumes..."
docker volume prune -f

echo "Final prune (system prune)..."
docker system prune -a --volumes -f

echo "✅ Docker pulito!"