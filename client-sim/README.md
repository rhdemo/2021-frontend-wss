# Client Simulation

The scripts in this folder can be run to simulate a client.

_NOTE: The success of a script depends on the game state. For example, an attempt to set ship positions when the game is in the "active" state will fail. The game state can be modified using the [Admin HQ](https://github.com/rhdemo/2021-admin-hq)._

## Usage

Run them using Node.js. A description of each script follows.

```bash
# install node modules if you haven't already done so
npm install

# execute the script
node $THE_SCRIPT
```

### Connect Script

This will connect and receive a new player configuration.

### Ship Positions

Runs the connect script, then attempts to lock ship positions.

_NOTE: This will receive an error response if the game state is not set to "lobby" via [Admin HQ](https://github.com/rhdemo/2021-admin-hq)._

### Attack Script

Runs the ship positions script, then attempts to send an attack. Will only send
an attack when `match.ready=true`. Run the `wss.connect.js` script in a second
terminal if this condition is not met automatically.  Once you see
`match.ready=true` set the game to "active" using the
[Admin HQ](https://github.com/rhdemo/2021-admin-hq).
