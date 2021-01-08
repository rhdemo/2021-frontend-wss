# 2021-frontend-wss

Simple WebSocket server that can be used for client development.

## Requirements

- Node.js v14.3
- npm 6.14

## Usage

### Run in Dev Mode

Making changes to the TypeScript source code under the *src/* dir after
running the commands below will cause the Node.js server to automatically
restart with the new changes.

_NOTE: Both Infinispan and the Node.js run on a specific Docker network to facilitate communication. This is because Infinispan has some tricky networking behaviours to deal with when running in the Docker VM on macOS._

```
git clone https://github.com/rhdemo/2021-frontend-wss
cd 2021-frontend-wss

# Setup the inifispan server
./scripts/infinispan/infinispan.start.sh

# Start the node server with live reload
./scripts/node/node.start.sh
```

### Run in Production Mode

```
git clone https://github.com/rhdemo/2021-frontend-wss
cd 2021-frontend-wss

npm install
npm build
npm start
```

## Endpoints

### HTTP

* `GET /health` - Returns a 200 response with application health information

### WebSocket

* `/game` - Endpoint that game clients connect to.
