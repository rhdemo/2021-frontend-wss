'use strict'

const socketPromise = require('./wss.connect')
const shipPostionPayload = require('../payloads/incoming/client.pieces.locked.json')

socketPromise
  .then((sock) => {
    console.log('sending locked ship positiond data')
    sock.send(JSON.stringify(shipPostionPayload))
  })
  .catch((e) => {
    console.log(`${__filename} failed with error:`, e)
    process.exit(1)
  })
