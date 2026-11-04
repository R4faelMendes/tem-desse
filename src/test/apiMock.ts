import { vi } from 'vitest'
import { createDemo } from '../data/demo'
import { associatePost, classifyComment, type Workspace } from '../domain/model'

export function mockApi(initial: Workspace = createDemo()) {
  let workspace = structuredClone(initial)
  let failWrites = false
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = new URL(String(input), 'http://localhost')
    const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status })
    if (init?.method === 'PATCH') {
      if (failWrites) return respond({ error: { message: 'Unavailable' } }, 503)
      const payload = JSON.parse(String(init.body))
      const parts = url.pathname.split('/')
      const id = decodeURIComponent(parts[4] ?? '')
      if (parts[3] === 'comments') {
        workspace = classifyComment(workspace, id, payload.intent, payload.resolved)
        return respond({ data: workspace.comments.find((comment) => comment.id === id) })
      }
      workspace = associatePost(workspace, id, payload.productId)
      return respond({ data: workspace.posts.find((post) => post.id === id) })
    }
    if (url.pathname.endsWith('/products')) return respond({ data: workspace.products })
    if (url.pathname.endsWith('/posts')) return respond({ data: workspace.posts })
    const page = Number(url.searchParams.get('page') ?? 1)
    return respond({
      data: workspace.comments.slice((page - 1) * 100, page * 100),
      pagination: {
        page,
        pageSize: 100,
        total: workspace.comments.length,
        totalPages: Math.ceil(workspace.comments.length / 100),
      },
    })
  })
  return {
    fetcher,
    snapshot: () => structuredClone(workspace),
    failWrites: () => {
      failWrites = true
    },
  }
}
