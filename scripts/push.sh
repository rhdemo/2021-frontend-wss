#!/usr/bin/env bash
printf "\n\n######## phone-server push ########\n"

IMAGE_REPOSITORY=${PHONE_SERVER_IMAGE_REPOSITORY:-quay.io/redhatdemo/2021-game-server:latest}

echo "Pushing ${IMAGE_REPOSITORY}"
docker push ${IMAGE_REPOSITORY}
