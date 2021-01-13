import { InfinispanClient, ClientEvent, InfinispanNode } from 'infinispan';
import { DATAGRID_HOST, DATAGRID_HOTROD_PORT } from '../config';
import infinispan from 'infinispan';
import log from '../log';

type DataGridEventHandle = (
  client: InfinispanClient,
  event: ClientEvent,
  key: string
) => void;

async function getClient(
  nodes: InfinispanNode[],
  cacheName: string
): Promise<InfinispanClient> {
  const client = await infinispan.client(nodes, {
    cacheName
  });
  log.info(`connected to infinispan for "${cacheName}" cache`);

  const stats = await client.stats();
  log.info(`stats for "${cacheName}":\n`, JSON.stringify(stats, null, 2));

  return client;
}

export default async function getDataGridClientForCacheNamed(
  cacheName: string,
  eventHandler: DataGridEventHandle
): Promise<InfinispanClient> {
  log.info(`creating infinispan client for cache named "${cacheName}"`);

  const nodes = [
    {
      host: DATAGRID_HOST,
      port: DATAGRID_HOTROD_PORT
    }
  ];

  const client = await getClient(nodes, cacheName);

  const listenerId = await client.addListener('create', (key, version, id) =>
    eventHandler(client, 'create', key)
  );

  await client.addListener(
    'modify',
    (key) => eventHandler(client, 'modify', key),
    { listenerId }
  );
  await client.addListener(
    'remove',
    (key) => eventHandler(client, 'remove', key),
    { listenerId }
  );

  return client;
}
