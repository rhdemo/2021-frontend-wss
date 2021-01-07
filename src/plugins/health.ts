import { FastifyPluginCallback } from 'fastify'
import fp from 'fastify-plugin'
import { uptime } from 'process'
import humanize from "humanize-duration"

export interface HealthPluginOptions {
  version: string
}

const healthPlugin: FastifyPluginCallback<HealthPluginOptions> = (server, options, done) => {
  server.route({
    method: 'GET',
    url: '/health',
    handler: async () => {
      return {
        connectedClients: server.websocketServer.clients.size,
        status: 'ok',
        uptime: humanize(uptime() * 1000),
        serverTs: new Date().toJSON(),
        version: options.version
      }
    }
  })

  done()
}

export default fp(healthPlugin)
