import { describe, expect, it } from 'vitest'
import { createDemo } from './demo'
import { loadWorkspace, saveWorkspace, STORAGE_KEY } from './storage'

describe('Persistência local', () => {
  it('carrega a demonstração na primeira visita e recupera uma alteração salva', () => {
    expect(loadWorkspace(localStorage).workspace).toEqual(createDemo())
    const workspace = createDemo()
    workspace.comments[0]!.resolved = true
    expect(saveWorkspace(localStorage, workspace)).toBe(true)
    expect(loadWorkspace(localStorage)).toEqual({ workspace, warning: null })
  })
  it('não sobrescreve dados corrompidos durante a leitura', () => {
    localStorage.setItem(STORAGE_KEY, '{invalid')
    expect(loadWorkspace(localStorage).warning).not.toBeNull()
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{invalid')
  })
  it('rejeita versões desconhecidas e rótulos não suportados', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...createDemo(), version: 99 }))
    expect(loadWorkspace(localStorage).warning).not.toBeNull()
    const workspace = createDemo()
    const invalid = { ...workspace, comments: [{ ...workspace.comments[0], intent: 'invalid' }] }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invalid))
    expect(loadWorkspace(localStorage).warning).not.toBeNull()
  })
  it('informa indisponibilidade ou quota excedida sem derrubar a aplicação', () => {
    const unavailable = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(loadWorkspace(unavailable).warning).not.toBeNull()
    expect(saveWorkspace(unavailable, createDemo())).toBe(false)
  })
})
