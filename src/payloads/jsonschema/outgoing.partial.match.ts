export = {
  type: "object",
  properties: {
    uuid: {
      type: "string"
    },
    state: {
      properties: {
        phase: {
          type: "string"
        },
        activePlayer: {
          type: "string"
        }
      }
    },
    winner: {
      type: "string"
    }
  }
}
