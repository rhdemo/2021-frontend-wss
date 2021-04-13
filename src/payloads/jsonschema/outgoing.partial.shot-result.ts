export = {
  type: "object",
  properties: {
    ts: {
      type: "integer"
    },
    destroyed: {
      type: 'boolean'
    },
    hit: {
      type: "boolean"
    },
    type: {
      type: 'string'
    },
    origin: {
      type: "array",
      items: {
        type: "integer",
        minimum: 0,
        maximum: 4
      },
      minItems: 2,
      maxItems: 2
    }
  }
}
