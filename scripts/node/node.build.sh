#!/usr/bin/env bash
printf "\n\n######## frontend wss build ########\n"

IMAGE_REPOSITORY=${WSS_SERVER_IMAGE_REPOSITORY:-quay.io/redhatdemo/2021-frontend-wss:latest}
SOURCE_REPOSITORY_URL=${SOURCE_REPOSITORY_URL:-git@github.com:rhdemo/2021-frontend-wss.git}
SOURCE_REPOSITORY_REF=${SOURCE_REPOSITORY_REF:-master}

echo "Building ${IMAGE_REPOSITORY} from ${SOURCE_REPOSITORY_URL} on ${SOURCE_REPOSITORY_REF}"

s2i build ${SOURCE_REPOSITORY_URL} --ref ${SOURCE_REPOSITORY_REF} ubi8/nodejs-12 ${IMAGE_REPOSITORY}
