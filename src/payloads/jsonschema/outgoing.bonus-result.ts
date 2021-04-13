import base from './outgoing.base'

export = base(
  'bonus-result',
  {
    game: require('./outgoing.partial.game'),
    match: require('./outgoing.partial.match'),
    opponent: require('./outgoing.partial.player'),
    player: require('./outgoing.partial.player')
  }
)
