#!/usr/bin/env bash
printf "\n\n######## infinispan dev container run in background ########\n"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

docker rm -f infinispan
docker network create --driver bridge summit
docker run --name=infinispan --net=summit -d --rm -v ${DIR}/config:/config:z -e CONFIG_PATH="/config/server.yaml" infinispan/server:10.1.1.Final

while [ -z "$(docker logs infinispan 2>&1 | grep -i 'final started')" ]; do
    printf "Waiting for Infinispan\n"
    sleep 3
done
docker exec -it infinispan /config/init.sh

trap "docker stop infinispan" INT
wait
