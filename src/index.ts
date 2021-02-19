require('make-promises-safe');

import * as game from '@app/stores/game';
import startServer from '@app/server';
import log from '@app/log';
import { configureHeartbeat } from '@app/sockets';
import config, { NODE_ENV } from '@app/config';

async function main() {
  log.info(`bootstrapping game server in "${NODE_ENV}" mode`);
  log.trace('server config: %j', config);

  await game.POST();

  const app = await startServer();

  configureHeartbeat(app);
}

main();
