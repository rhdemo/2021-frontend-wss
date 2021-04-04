import test from 'tape';
import { validators } from '../../src/payloads/jsonschema'

const {
  attack,
  bonus,
  validatePayload
} =  validators

test('payload: requires "type"', (t) => {
  validatePayload({})

  t.assert(validatePayload.errors)
  t.equal(validatePayload.errors && validatePayload.errors[0].message, "must have required property 'type'")
  t.end()
})

test('payload: "type" must be one of a set', (t) => {
  validatePayload({
    type: 'not a valid type',
    data: {}
  })

  t.assert(validatePayload.errors)
  t.equal(validatePayload.errors && validatePayload.errors[0].message, "must be equal to one of the allowed values")
  t.end()
})

test('payload: requires "data"', (t) => {
  validatePayload({
    type: 'attack'
  })

  t.assert(validatePayload.errors)
  t.equal(validatePayload.errors && validatePayload.errors[0].message, "must have required property 'data'")
  t.end()
})

test('ship-positions: requires ship keys', (t) => {
  validators['ship-positions']({})

  t.assert(validators['ship-positions'].errors)
  t.equal(validators['ship-positions'].errors && validators['ship-positions'].errors[0].message, "must have required property 'Carrier'")
  t.end()
})

test('ship-positions: ships require orientation', (t) => {
  validators['ship-positions']({
    'Carrier': {},
    'Destroyer': {},
    'Battleship': {},
    'Submarine': {}
  })

  t.assert(validators['ship-positions'].errors)
  t.equal(validators['ship-positions'].errors && validators['ship-positions'].errors[0].message, "must have required property 'orientation'")
  t.end()
})

test('ship-positions: ships require origin', (t) => {
  validators['ship-positions']({
    'Carrier': {
      orientation: 'vertical'
    },
    'Destroyer': {
      orientation: 'vertical'
    },
    'Battleship': {
      orientation: 'vertical'
    },
    'Submarine': {
      orientation: 'vertical'
    }
  })

  t.assert(validators['ship-positions'].errors)
  t.equal(validators['ship-positions'].errors && validators['ship-positions'].errors[0].message, "must have required property 'origin'")
  t.end()
})

test('ship-positions: orientation must be of valid type', (t) => {
  validators['ship-positions']({
    'Carrier': {
      orientation: 'nope',
      origin: [0, 0]
    },
    'Destroyer': {
      orientation: 'nope',
      origin: [0, 0]
    },
    'Battleship': {
      orientation: 'nope',
      origin: [0, 0]
    },
    'Submarine': {
      orientation: 'nope',
      origin: [0, 0]
    }
  })

  t.assert(validators['ship-positions'].errors)
  t.equal(validators['ship-positions'].errors && validators['ship-positions'].errors[0].message, "must be equal to one of the allowed values")
  t.end()
})

test('attack: should validate', (t) => {
  attack({
    origin: [0, 4]
  })
  t.assert(!attack.errors)
  t.end();
});

test('attack: requires "origin"', (t) => {
  attack({})

  t.assert(attack.errors)
  t.equal(attack.errors && attack.errors[0].message, "must have required property 'origin'")

  t.end();
});

test('attack: "origin" must be an array', (t) => {
  attack({
    origin: 'nope'
  })

  t.assert(attack.errors)
  t.equal(attack.errors && attack.errors[0].message, "must be array")

  t.end();
});

test('attack: "origin" cannot have numbers greater than 4', (t) => {
  attack({
    origin: [5, 0]
  })

  t.assert(attack.errors)
  t.equal(attack.errors && attack.errors[0].message, "must be <= 4")

  t.end();
});

test('bonus: requires "hits" key', (t) => {
  bonus({})
  t.assert(bonus.errors)
  t.equal(bonus.errors && bonus.errors[0].message, "must have required property 'hits'")
  t.end();
})

test('bonus: "hits" must be integer', (t) => {
  bonus({
    hits: 5.5
  })
  t.assert(bonus.errors)
  t.equal(bonus.errors && bonus.errors[0].message, "must be integer")
  t.end();
})

test('bonus: should pass validation', (t) => {
  bonus({
    hits: 5
  })
  t.assert(!bonus.errors)
  t.end();
})
