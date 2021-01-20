'use strict'

const WebSocket = require('ws')
const payload = require('../payloads/client.connect.json')

/**
 * This provides a setup harness for any future WebSocket test scripts.
 *
 * It performs initial connection, then makes the socket available via
 * a resolved Promise.
 *
 * @type Promise<WebSocket>
 */
module.exports = new Promise((resolve, reject) => {
  console.log('connecting to wss, use "ctrl+c" to quit the program')
  const sock = new WebSocket('ws://localhost:3000/game')

  sock.on('open', () => {
    console.log('connected to wss. sending initial "connection" request')
    sock.send(JSON.stringify(payload))
  })

  sock.on('message', (message) => {
    const data = JSON.parse(message)
    console.log('received payload from wss:')
    console.log(JSON.stringify(data, null, 2))

    resolve(sock)
  })

  sock.on('error', (e) => reject(e))
})
