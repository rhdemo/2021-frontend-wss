#!/usr/bin/env bash
printf "\n\n######## infinispan dev container run in background ########\n"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
# Need to change into this dir since docker-compose searches cwd for yaml
cd $DIR
docker-compose down
docker-compose up --force-recreate --detach &

echo Waiting for Infinispan service start ...;
while ! curl --silent --output /dev/null --fail-early http://localhost:11222/rest/v2/server;
do
  printf "Waiting for Infinispan\n"
  sleep 1;
done;
echo Init data ...;

printf "\n\n######## Initializing Caches ########\n"
UUID="new-game-$(date +%s)"
DATE=$(date -u +"%FT%T.000Z")
GAME_CONFIG_JSON=$(cat 'game-config.json' |  tr -d "\n" | sed "s|<UUID/>|${UUID}|" | sed "s|<DATE/>|${DATE}|" )
echo $GAME_CONFIG_JSON
curl -X PUT -d "${GAME_CONFIG_JSON}" -H "Content-Type: application/json" "http://localhost:11222/rest/v2/caches/game/current-game"

printf "\n\n######## Cache Init Complete ########\n"
wait
