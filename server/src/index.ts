import { buildApp } from './app'
import { readConfig } from './config'

const config = readConfig()
const app = buildApp({ databasePath: config.databasePath, logger: true })
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.close().catch((error) => {
      app.log.error(error)
      process.exitCode = 1
    })
  })
}
try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  app.log.error(error)
  await app.close()
  process.exitCode = 1
}
