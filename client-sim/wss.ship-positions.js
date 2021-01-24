'use strict'

const WebSocket = require('ws')
const socketPromise = require('./wss.connect')
const shipPostionPayload = require('../payloads/incoming/client.pieces.locked.json')


/**
 * This function waits for a socket to connect and receive an initial
 * connection response before attempting to lock ship positions.
 * @type Promise<WebSocket>
 */
module.exports = new Promise(async (resolve, reject) => {
  const sock = await socketPromise

  console.log('sending locked ship positiond data')
  sock.send(JSON.stringify(shipPostionPayload))
  sock.on('message', (data) => {
    const response = JSON.parse(data)

    if (response.type === 'configuration' && response.data.player?.board?.valid) {
      console.log('received response with confirmation that ship placement was validated')
    }
  })

  // Resolve immediately so dependant modules can listen for configuration
  resolve(sock)
})
