import { Server } from 'http';

export function getWsAddressFromServer(server: Server): string {
  const addr = server.address();

  if (typeof addr === 'string') {
    return addr;
  } else {
    return `${addr?.address}:${addr?.port}`;
  }
}
