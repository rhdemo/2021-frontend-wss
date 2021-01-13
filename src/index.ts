import * as game from './game';
import startServer from './server';
import log from './log';
import { configureHeartbeat } from './sockets';

require('make-promises-safe');

async function main() {
  log.info('bootstrapping game server');

  await game.POST();

  const app = await startServer();

  configureHeartbeat(app);
}

main();
