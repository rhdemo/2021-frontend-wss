export = {
  type: 'object',
  properties: {
    uuid: {
      // This is removed if it's an "opponent" key
      type: 'string'
    },
    isAi: {
      type: 'boolean'
    },
    username: {
      type: 'string'
    },
    match: {
      type: 'string'
    },
    board: require('./outgoing.partial.board'),
    attacks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ts: {
            type: 'number'
          },
          attack: {
            type: 'object',
            properties: {
              origin: {
                type: 'array',
                items: {
                  type: 'integer'
                }
              }
            }
          },
          result: require('./outgoing.partial.shot-result')
        }
      }
    }
  }
}
