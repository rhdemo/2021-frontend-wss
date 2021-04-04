
/**
 * Creates a standard format JSON Schema including our "sequence" key
 * @param {String} type
 * @param {Object} properties
 * @returns {Object}
 */
export default function (type: string, properties: unknown) {
  return {
    $schema: "http://json-schema.org/draft-07/schema",
    type: "object",
    properties: {
      type: {
        type: "string",
        const: type
      },
      sequence: {
        type: 'integer'
      },
      data: {
        type: "object",
        properties
      }
    }
  }
}
