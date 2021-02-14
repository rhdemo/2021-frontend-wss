import * as game from './game';
import startServer from './server';
import log from './log';
import { configureHeartbeat } from './sockets';
import { NODE_ENV } from './config';

require('make-promises-safe');

async function main() {
  log.info(`bootstrapping game server in "${NODE_ENV}" mode`);

  await game.POST();

  const app = await startServer();

  configureHeartbeat(app);
}

main();
