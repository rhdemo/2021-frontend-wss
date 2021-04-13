#!/usr/bin/env bash
printf "\n\n######## game-server build ########\n"

IMAGE_REPOSITORY=${IMAGE_REPOSITORY:-quay.io/redhatdemo/2021-game-server:latest}

rm -rf node_modules/
rm -rf build/

s2i build -e HUSKY_SKIP_HOOKS=1 -c . registry.access.redhat.com/ubi8/nodejs-14 ${IMAGE_REPOSITORY}
