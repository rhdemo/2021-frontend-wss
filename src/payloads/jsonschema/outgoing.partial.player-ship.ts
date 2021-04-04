export = {
  type: "object",
  properties: {
    origin: {
      type: "array",
      items: {
        type: "integer"
      }
    },
    orientation: {
      type: 'string'
    },
    sunk: {
      type: 'boolean'
    },
    type: {
      type: 'string'
    },
    cells: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          hit: {
            type: 'boolean'
          },
          origin: {
            type: 'array',
            items: {
              type: 'integer'
            }
          },
          type: {
            type: 'string'
          }
        }
      }
    }
  }
}
