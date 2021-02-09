DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

docker build -f Dockerfile.dev . -t summit-frontend-wss

docker run --rm --net=summit -p 3000:3000 -v "$(pwd)/src/:/usr/src/app/src/" -e DATA --name=summit-frontend-wss  summit-frontend-wss
# docker run --rm --net=infinispan-docker-compose_summit -p 3000:3000 -v "$(pwd)/src/:/usr/src/app/src/" -e DATA --name=summit-frontend-wss  summit-frontend-wss
