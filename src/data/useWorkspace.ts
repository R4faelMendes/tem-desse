import { useEffect, useRef, useState } from 'react'
import { associatePost, classifyComment, type Intent, type Workspace } from '../domain/model'
import { createDemo } from './demo'
import { loadWorkspace, saveWorkspace } from './storage'
import { createApiRepository } from './api'

export type DataSource = 'demo' | 'api'
export const SOURCE_KEY = 'tem-desse:source:v1'
const emptyWorkspace: Workspace = { version: 1, products: [], posts: [], comments: [] }
const api = createApiRepository()

export function useWorkspace() {
  const [initial] = useState(() => {
    try {
      return loadWorkspace(window.localStorage)
    } catch {
      return {
        workspace: createDemo(),
        warning: 'Armazenamento local indisponível. As alterações durarão apenas nesta sessão.',
      }
    }
  })
  const [source, setSource] = useState<DataSource>(() => {
    try {
      return localStorage.getItem(SOURCE_KEY) === 'api' ? 'api' : 'demo'
    } catch {
      return 'demo'
    }
  })
  const [demo, setDemo] = useState(initial.workspace)
  const [demoWarning, setDemoWarning] = useState(initial.warning)
  const [remote, setRemote] = useState(emptyWorkspace)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(source === 'api')
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState(0)
  const operation = useRef(false)

  useEffect(() => {
    if (source !== 'api') return
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    let active = true
    api
      .load(controller.signal)
      .then((workspace) => {
        if (active) setRemote(workspace)
      })
      .catch((reason) => {
        if (active)
          setError(
            controller.signal.aborted
              ? 'A API demorou para responder. Tente atualizar os dados novamente.'
              : reason instanceof Error
                ? reason.message
                : 'Não foi possível carregar a API local.',
          )
      })
      .finally(() => {
        clearTimeout(timeout)
        if (active) setLoading(false)
      })
    return () => {
      active = false
      clearTimeout(timeout)
      controller.abort()
    }
  }, [source, revision])

  function changeSource(next: DataSource) {
    if (operation.current || next === source) return
    setSource(next)
    setLoading(next === 'api')
    setError(null)
    try {
      localStorage.setItem(SOURCE_KEY, next)
    } catch {
      /* Preference lasts for this session. */
    }
  }

  function saveDemo(next: Workspace) {
    setDemo(next)
    let saved = false
    try {
      saved = saveWorkspace(localStorage, next)
    } catch {
      /* Keep the in-memory state. */
    }
    setDemoWarning(
      saved ? null : 'Alteração aplicada nesta sessão, mas não foi possível salvá-la no navegador.',
    )
  }

  async function mutate(action: () => Promise<void>) {
    if (operation.current || loading) return false
    operation.current = true
    setSaving(true)
    setError(null)
    try {
      await action()
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível salvar a alteração.')
      return false
    } finally {
      operation.current = false
      setSaving(false)
    }
  }

  return {
    source,
    changeSource,
    workspace: source === 'demo' ? demo : remote,
    loading,
    saving,
    error,
    warning: source === 'demo' ? demoWarning : null,
    reload: () => {
      if (!operation.current && source === 'api') {
        setLoading(true)
        setError(null)
        setRevision((value) => value + 1)
      }
    },
    resetDemo: () => {
      if (source === 'demo') saveDemo(createDemo())
    },
    saveComment: (id: string, intent: Intent, resolved: boolean) =>
      mutate(async () => {
        if (source === 'demo') saveDemo(classifyComment(demo, id, intent, resolved))
        else {
          const comment = await api.classify(id, intent, resolved)
          setRemote((current) => ({
            ...current,
            comments: current.comments.map((item) => (item.id === id ? comment : item)),
          }))
        }
      }),
    saveAssociation: (postId: string, productId: string | null) =>
      mutate(async () => {
        if (source === 'demo') saveDemo(associatePost(demo, postId, productId))
        else {
          const post = await api.associate(postId, productId)
          setRemote((current) => ({
            ...current,
            posts: current.posts.map((item) => (item.id === postId ? post : item)),
          }))
        }
      }),
  }
}
