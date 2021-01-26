'use strict'

/**
 * An example of the payload that is sent to the ML service after a player has
 * sent an attack to the game server, and the server has processed it.
 *
 * In this example both players have positioned their ships in exactly the
 * same way - a highly unlikely scenario.
 */
module.exports = {
  "type": "attack",
  "attack": {
    // Contains the attack details.
    // The "by" field indicates which player is attacking.
    "by": "ofqZ-h9CZa8lSSe36cR4O",
    "type": "2x1",
    "origin": [
      0,
      0
    ],
    "orientation": "horizontal"
  },
  "results": [
    // First shot of this 2x1 attack is a hit
    {
      "origin": [
        0,
        0
      ],
      "hit": true
    },
    // Second shot is also a hit, and it was the hit that
    // destroyed the opponent submarine!
    {
      "origin": [
        1,
        0
      ],
      "hit": true,
      "destroyed": true,
      "type": "Submarine"
    }
  ],
  "playerA": {
    "username": "Phantom Hawk",
    "attacks": [],
    "uuid": "B6nymRtY093ueMBh6iOeI",
    "score": 0,
    "board": {
      // Notice that the submarine cells' "hit" values are true now
      "Submarine": {
        "origin": [
          0,
          0
        ],
        "orientation": "horizontal",
        "type": "Submarine",
        "cells": [
          {
            "hit": true,
            "origin": [
              0,
              0
            ]
          },
          {
            "hit": true,
            "origin": [
              1,
              0
            ]
          }
        ]
      }
    }
  },
  "playerB": {
    "board": {
      "valid": true,
      "positions": {
        "Submarine": {
          "origin": [
            0,
            0
          ],
          "orientation": "horizontal",
          "type": "Submarine",
          "cells": [
            {
              "hit": false,
              "origin": [
                0,
                0
              ]
            },
            {
              "hit": false,
              "origin": [
                1,
                0
              ]
            }
          ]
        },
        "Destroyer": {
          "origin": [
            2,
            1
          ],
          "orientation": "horizontal",
          "type": "Destroyer",
          "cells": [
            {
              "hit": false,
              "origin": [
                2,
                1
              ]
            },
            {
              "hit": false,
              "origin": [
                3,
                1
              ]
            },
            {
              "hit": false,
              "origin": [
                4,
                1
              ]
            }
          ]
        },
        "Battleship": {
          "origin": [
            0,
            1
          ],
          "orientation": "vertical",
          "type": "Battleship",
          "cells": [
            {
              "hit": false,
              "origin": [
                0,
                1
              ]
            },
            {
              "hit": false,
              "origin": [
                0,
                2
              ]
            },
            {
              "hit": false,
              "origin": [
                0,
                3
              ]
            },
            {
              "hit": false,
              "origin": [
                0,
                4
              ]
            }
          ]
        }
      }
    },
    "username": "Cyan Dinosaur",
    "score": 0,
    "match": "Ee-LZN411H-eyaUmX0OaS",
    "attacks": [
      {
        "attack": {
          "type": "2x1",
          "origin": [
            0,
            0
          ],
          "orientation": "horizontal"
        },
        "results": [
          {
            "origin": [
              0,
              0
            ],
            "hit": true
          },
          {
            "origin": [
              1,
              0
            ],
            "hit": true,
            "destroyed": true,
            "type": "Submarine"
          }
        ]
      }
    ],
    "uuid": "ofqZ-h9CZa8lSSe36cR4O"
  },
  "match": {
    "uuid": "Ee-LZN411H-eyaUmX0OaS",
    "ready": true,
    "playerA": "B6nymRtY093ueMBh6iOeI",
    "playerB": "ofqZ-h9CZa8lSSe36cR4O",
    "activePlayer": "B6nymRtY093ueMBh6iOeI"
  }
}
