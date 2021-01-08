'use strict'

const WebSocket = require('ws')
const payload = require('../payloads/client.connect.json')

console.log('connecting to wss')
const sock = new WebSocket('ws://localhost:3000/game')

sock.on('open', () => {
  console.log('connected to wss. sending initial "connection" request')
  sock.send(JSON.stringify(payload))
})

sock.on('message', (message) => {
  console.log('received response from wss:')
  console.log(JSON.stringify(JSON.parse(message), null, 2))
  sock.close()
})
