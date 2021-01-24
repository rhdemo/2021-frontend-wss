'use strict'

const socketPromise = require('./wss.ship-positions')
const clearModule = require('clear-module');
const attack = require('../payloads/incoming/client.attack.json')

/**
 * This function waits for a ship positions to be locked, then attempts an
 * attack.
 * @type Promise<WebSocket>
 */
module.exports = new Promise(async (resolve, reject) => {
  const sock = await socketPromise

  sock.on('message', async (msg) => {
    msg = JSON.parse(msg)

    if (msg.type === 'configuration' && msg.data?.match?.ready && msg.data.game.state === 'active') {
      console.log(`match is ready. sending attack from player ${msg.data.player.uuid}`)
      sock.send(JSON.stringify(attack))
      attackSent = true
    }

    if (msg.type.includes('attack')) {
      console.log('attack response:')
      console.log(JSON.stringify(msg, null, 2))
    }
  })
})
