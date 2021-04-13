import base from './outgoing.base'

export = base(
  'attack-result',
  {
    attacker: {
      type: 'string'
    },
    game: require('./outgoing.partial.game'),
    result: require('./outgoing.partial.shot-result'),
    match: require('./outgoing.partial.match'),
    opponent: require('./outgoing.partial.player'),
    player: require('./outgoing.partial.player'),
  }
)

