export = {
  properties: {
    valid: {
      type: 'boolean'
    },
    positions: {
      type: 'object',
      properties: {
        Carrier: require('./outgoing.partial.player-ship'),
        Battleship: require('./outgoing.partial.player-ship'),
        Submarine: require('./outgoing.partial.player-ship'),
        Destroyer: require('./outgoing.partial.player-ship')
      }
    },
  }
}
