import { resolve } from 'node:path'
import { z } from 'zod'

const envSchema = z.object({
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_DATABASE_PATH: z.string().min(1).default('.data/tem-desse.sqlite'),
})

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.parse(env)
  return {
    port: parsed.API_PORT,
    databasePath: resolve(parsed.API_DATABASE_PATH),
    host: '127.0.0.1',
  }
}
