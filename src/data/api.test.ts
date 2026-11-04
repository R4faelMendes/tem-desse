import { describe, expect, it, vi } from 'vitest'
import { createApiRepository } from './api'
import { createDemo } from './demo'
import { mockApi } from '../test/apiMock'

describe('Repositório HTTP', () => {
  it('carrega todas as páginas e mantém os comentários vinculados aos produtos', async () => {
    const workspace = createDemo()
    workspace.comments = Array.from({ length: 121 }, (_, index) => ({
      ...workspace.comments[0]!,
      id: `comment-${index}`,
    }))
    const mock = mockApi(workspace)
    const loaded = await createApiRepository(mock.fetcher).load()
    expect(loaded.comments).toHaveLength(121)
    expect(loaded).toEqual(workspace)
    expect(mock.fetcher).toHaveBeenCalledWith(
      '/api/v1/comments?page=2&pageSize=100',
      expect.any(Object),
    )
  })
  it('não transforma erro HTTP ou resposta inválida em demonstração', async () => {
    const unavailable = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('offline', { status: 503 }))
    await expect(createApiRepository(unavailable).load()).rejects.toThrow(
      'Não foi possível carregar',
    )
    const invalid = vi.fn<typeof fetch>(async () => new Response('{}'))
    await expect(createApiRepository(invalid).load()).rejects.toThrow('Não foi possível carregar')
  })
  it('envia a classificação e desassociação como PATCH, sem perder false ou null', async () => {
    const mock = mockApi()
    const repository = createApiRepository(mock.fetcher)
    expect(await repository.classify('c6', 'price', false)).toMatchObject({
      intent: 'price',
      resolved: false,
    })
    expect(await repository.associate('post-1', null)).toMatchObject({ productId: null })
    expect(mock.fetcher).toHaveBeenCalledWith(
      '/api/v1/posts/post-1/product',
      expect.objectContaining({ method: 'PATCH', body: '{"productId":null}' }),
    )
  })
  it('recusa snapshots cuja quantidade de comentários difere da paginação', async () => {
    const mock = mockApi()
    const fetcher: typeof fetch = async (input, init) => {
      const response = await mock.fetcher(input, init)
      if (!String(input).includes('/comments?')) return response
      const body = await response.json()
      body.data.pop()
      return new Response(JSON.stringify(body))
    }
    await expect(createApiRepository(fetcher).load()).rejects.toThrow('incompletos')
  })
})
