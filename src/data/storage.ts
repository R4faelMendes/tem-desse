import { workspaceSchema, type Workspace } from '../domain/model'
import { createDemo } from './demo'

export const STORAGE_KEY = 'tem-desse:workspace:v1'
type StoragePort = Pick<Storage, 'getItem' | 'setItem'>

export function loadWorkspace(storage: StoragePort): {
  workspace: Workspace
  warning: string | null
} {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return { workspace: createDemo(), warning: null }
    const result = workspaceSchema.safeParse(JSON.parse(raw))
    if (result.success) return { workspace: result.data, warning: null }
  } catch {
    /* Um snapshot inválido ou storage bloqueado não impede a abertura. */
  }
  return {
    workspace: createDemo(),
    warning:
      'Não foi possível recuperar os dados locais. Uma demonstração foi carregada; o conteúdo anterior não foi alterado.',
  }
}
export function saveWorkspace(storage: StoragePort, workspace: Workspace): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(workspace))
    return true
  } catch {
    return false
  }
}
