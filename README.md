# 2021-frontend-wss

Simple WebSocket server that can be used for client development.

## Requirements

- Node.js v14.3
- npm 6.14

## Usage

### All Services in Dev Mode TDLR

First, get the 3 necessary services running:

```bash
git clone https://github.com/rhdemo/2021-frontend-wss
git clone https://github.com/rhdemo/2021-admin-hq
git clone https://github.com/rhdemo/2021-frontend-css-html

# Start the infinispan server and game websocket server
cd 2021-frontend-wss
./scripts/infinispan/infinispan-docker-compose/infinispan.start.sh
./scripts/node/node.start.sh

# Start the Admin HQ (in another terminal)
cd 2021-admin-hq
./scripts/node.start.sh

# Start the UI service (in another terminal)
cd 2021-frontend-css-html
npm i -g yarn
yarn install
yarn start
```

Open `http://localhost:3001` (the Admin UI), and click the *Play* button.

Next, open up `http://localhost:3002` in two separate browsers, or in a regular
and incognito/private browsing session - this allows you to play as two players
against each other on one machine!

### Controlling the WSS Server Game State

Use the [Admin HQ Web UI](https://github.com/rhdemo/2021-admin-hq) to change
the game state. You must select *Play* to make attacks in the game.

### Run in Dev Mode

Making changes to the TypeScript source code under the *src/* dir after
running the commands below will cause the Node.js server to automatically
restart with the new changes.

_NOTE: Both Infinispan and the Node.js run on a specific Docker network to facilitate communication. This is because Infinispan has some tricky networking behaviours to deal with when running in the Docker VM on macOS._

```
git clone https://github.com/rhdemo/2021-frontend-wss
cd 2021-frontend-wss

# Setup the inifispan server
./scripts/infinispan/infinispan-docker-compose/infinispan.start.sh

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

## Simulating a Player/Client

Refer to the *[client-sim/](client-sim/)* folder.

## Endpoints

### HTTP

* `GET /health` - Returns a 200 response with application health information

### WebSocket

* `/game` - Endpoint that game clients connect to.
