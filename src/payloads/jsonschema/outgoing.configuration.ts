import base from './outgoing.base'

export = base(
  'configuration',
  {
    player: require('./outgoing.partial.player'),
    opponent: require('./outgoing.partial.player'),
    match: require('./outgoing.partial.match'),
    game: require('./outgoing.partial.game')
  }
)

