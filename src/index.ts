import * as players from './players'
import startServer from './server'
import log from './log'

require('make-promises-safe')

async function main () {
  log.info('bootstrapping game server')
  await players.initialise()
  await startServer()
}

main()
