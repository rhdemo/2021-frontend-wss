#!/usr/bin/env bash

printf "\n\n######## Initializing Caches ########\n"

HOST=$(ip a | grep -m 1 global | awk '{print$2}' | sed 's|/.*||')
/opt/infinispan/bin/cli.sh -c "http://${HOST}:11222" --file=/config/batch

UUID="new-game-$(date +%s)"
DATE=$(date -u +"%FT%T.000Z")
GAME_CONFIG_JSON=$(cat '/config/game-config.json' |  tr -d "\n" | sed "s|<UUID/>|${UUID}|" | sed "s|<DATE/>|${DATE}|" )
curl -X POST -d "${GAME_CONFIG_JSON}" -H application/json "http://${HOST}:11222/rest/game/current-game"

printf "\n\n######## Cache Init Complete ########\n"
