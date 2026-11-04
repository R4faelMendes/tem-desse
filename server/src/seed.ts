import { readConfig } from './config'
import { WorkspaceRepository } from './repository'

const repository = new WorkspaceRepository(readConfig().databasePath)
try {
  repository.seedDemo()
  console.log('Demonstração inserida: 3 produtos, 4 publicações e 12 comentários fictícios.')
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Falha ao inserir a demonstração.')
  process.exitCode = 1
} finally {
  repository.close()
}
