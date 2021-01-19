#!/usr/bin/env bash
printf "\n\n######## frontend wss push ########\n"

IMAGE_REPOSITORY=${WSS_SERVER_IMAGE_REPOSITORY:-quay.io/redhatdemo/2021-frontend-wss:latest}

echo "Pushing ${IMAGE_REPOSITORY}"
docker push ${IMAGE_REPOSITORY}
