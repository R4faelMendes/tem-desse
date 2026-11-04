import { randomUUID } from 'node:crypto'
import { existsSync, unlinkSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app'
import { WorkspaceRepository } from '../src/repository'
import { readConfig } from '../src/config'

const apps = new Set<ReturnType<typeof buildApp>>()
const databasePaths: string[] = []

function createDatabase(seed = true) {
  const path = resolve('.data', `test-${randomUUID()}.sqlite`)
  databasePaths.push(path)
  const repository = new WorkspaceRepository(path)
  try {
    if (seed) repository.seedDemo()
  } finally {
    repository.close()
  }
  return path
}
function openApp(databasePath = createDatabase()) {
  const app = buildApp({ databasePath })
  apps.add(app)
  return app
}
afterEach(async () => {
  for (const app of apps) await app.close()
  apps.clear()
  for (const path of databasePaths.splice(0)) if (existsSync(path)) unlinkSync(path)
})

describe('API v1', () => {
  it('inicia com banco vazio e não semeia exemplos automaticamente', async () => {
    const app = openApp(createDatabase(false))
    expect((await app.inject('/health')).json()).toEqual({ status: 'ok', service: 'tem-desse-api' })
    expect((await app.inject('/api/v1/products')).json()).toEqual({ data: [] })
    const radar = (await app.inject('/api/v1/radar')).json()
    expect(radar.data.summary).toMatchObject({ totalComments: 0, totalPosts: 0, signals: 0 })
    expect(radar.data.demand).toEqual([])
  })
  it('lista catálogo e publicações associados, sem depender de serviços externos', async () => {
    const app = openApp()
    const products = await app.inject('/api/v1/products')
    const posts = await app.inject('/api/v1/posts')
    expect(products.statusCode).toBe(200)
    expect(products.json().data).toHaveLength(3)
    expect(posts.json().data).toHaveLength(4)
    expect(posts.json().data[0]).toMatchObject({ id: 'post-1', productId: 'linen' })
    expect(products.headers['cache-control']).toBe('no-store')
  })
  it('combina filtros, pagina resultados e retorna metadados corretos', async () => {
    const app = openApp()
    const response = await app.inject(
      '/api/v1/comments?productId=linen&intent=restock&onlyOpen=true&pageSize=2&page=2',
    )
    expect(response.statusCode).toBe(200)
    expect(response.json().pagination).toEqual({ page: 2, pageSize: 2, total: 3, totalPages: 2 })
    expect(response.json().data.map((comment: { id: string }) => comment.id)).toEqual(['c10'])
    const search = await app.inject('/api/v1/comments?query=REPOSICAO')
    expect(search.json().data.map((comment: { id: string }) => comment.id)).toEqual(['c3'])
    expect((await app.inject('/api/v1/comments?page=100')).json().data).toEqual([])
  })
  it.each([
    'page=0',
    'page=-1',
    'page=1.5',
    'page=NaN',
    'pageSize=101',
    'onlyOpen=yes',
    'onlyOpen=1',
    'intent=invalid',
    'unexpected=true',
    'page=1&page=2',
  ])('rejeita query inválida sem coerção silenciosa: %s', async (query) => {
    const response = await openApp().inject(`/api/v1/comments?${query}`)
    expect(response.statusCode).toBe(400)
    expect(response.json().error.code).toBe('VALIDATION_ERROR')
  })
  it('classifica, recalcula evidências e preserva o estado após reabrir o banco', async () => {
    const path = createDatabase()
    const app = openApp(path)
    const changed = await app.inject({
      method: 'PATCH',
      url: '/api/v1/comments/c7',
      payload: { intent: 'restock', resolved: true },
    })
    expect(changed.statusCode).toBe(200)
    expect(changed.json().data).toMatchObject({ id: 'c7', intent: 'restock', resolved: true })
    const radar = (await app.inject('/api/v1/radar')).json().data
    expect(radar.summary).toMatchObject({ signals: 7, unclassified: 2, open: 9 })
    expect(
      radar.demand.find((item: { product: { id: string } }) => item.product.id === 'bag')
        .evidence[0].id,
    ).toBe('c7')
    await app.close()
    apps.delete(app)
    const reopened = openApp(path)
    const restored = (await reopened.inject('/api/v1/comments?productId=bag&intent=restock')).json()
      .data
    expect(restored).toHaveLength(1)
    expect(restored[0]).toMatchObject({ id: 'c7', intent: 'restock', resolved: true })
  })
  it('uma alteração parcial preserva o campo omitido e aceita false explicitamente', async () => {
    const app = openApp()
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/comments/c6',
      payload: { resolved: false },
    })
    expect(response.json().data).toMatchObject({ intent: 'price', resolved: false })
    const reclassified = await app.inject({
      method: 'PATCH',
      url: '/api/v1/comments/c6',
      payload: { intent: 'other' },
    })
    expect(reclassified.json().data).toMatchObject({ intent: 'other', resolved: false })
  })
  it.each([
    {},
    { intent: 'invalid' },
    { resolved: 'false' },
    { resolved: null },
    { intent: 'restock', author: 'edited' },
  ])('rejeita corpo inválido sem persistir mudanças: %j', async (payload) => {
    const app = openApp()
    const response = await app.inject({ method: 'PATCH', url: '/api/v1/comments/c7', payload })
    expect(response.statusCode).toBe(400)
    const original = (await app.inject('/api/v1/comments?productId=bag'))
      .json()
      .data.find((comment: { id: string }) => comment.id === 'c7')
    expect(original.intent).toBe('unclassified')
  })
  it('transfere e remove a associação de um post mantendo os comentários', async () => {
    const app = openApp()
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/posts/post-1/product',
      payload: { productId: 'bag' },
    })
    expect(response.json().data.productId).toBe('bag')
    let radar = (await app.inject('/api/v1/radar')).json().data
    expect(radar.demand[0].product.id).toBe('bag')
    expect(radar.demand[0].evidence).toHaveLength(4)
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/posts/post-1/product',
      payload: { productId: null },
    })
    radar = (await app.inject('/api/v1/radar')).json().data
    expect(radar.summary).toMatchObject({ totalComments: 12, signals: 2 })
  })
  it('retorna 404 para recursos inexistentes e não altera associações inválidas', async () => {
    const app = openApp()
    const cases = [
      {
        method: 'PATCH' as const,
        url: '/api/v1/comments/missing',
        payload: { resolved: true },
        code: 'COMMENT_NOT_FOUND',
      },
      {
        method: 'PATCH' as const,
        url: '/api/v1/posts/missing/product',
        payload: { productId: null },
        code: 'POST_NOT_FOUND',
      },
      {
        method: 'PATCH' as const,
        url: '/api/v1/posts/post-1/product',
        payload: { productId: 'missing' },
        code: 'PRODUCT_NOT_FOUND',
      },
    ]
    for (const { code, ...request } of cases) {
      const response = await app.inject(request)
      expect(response.statusCode).toBe(404)
      expect(response.json().error.code).toBe(code)
    }
    expect((await app.inject('/api/v1/posts')).json().data[0].productId).toBe('linen')
    expect((await app.inject('/api/v1/comments?productId=missing')).statusCode).toBe(404)
    expect((await app.inject('/missing')).json().error.code).toBe('ROUTE_NOT_FOUND')
  })
  it('trata JSON malformado e corpos grandes com o mesmo contrato de erro', async () => {
    const app = openApp()
    const malformed = await app.inject({
      method: 'PATCH',
      url: '/api/v1/comments/c7',
      headers: { 'content-type': 'application/json' },
      payload: '{invalid',
    })
    expect(malformed.statusCode).toBe(400)
    expect(malformed.json().error).toMatchObject({
      code: 'INVALID_REQUEST',
      requestId: expect.any(String),
    })
    const large = await app.inject({
      method: 'PATCH',
      url: '/api/v1/comments/c7',
      payload: { intent: 'restock', extra: 'x'.repeat(20_000) },
    })
    expect(large.statusCode).toBe(413)
  })
  it('a carga de demonstração recusa um banco preenchido e mantém as alterações', () => {
    const path = createDatabase()
    const repository = new WorkspaceRepository(path)
    try {
      repository.classify('c7', { intent: 'restock' })
      expect(() => repository.seedDemo()).toThrow('já contém dados')
      expect(repository.snapshot().comments.find((comment) => comment.id === 'c7')?.intent).toBe(
        'restock',
      )
    } finally {
      repository.close()
    }
  })
  it('valida a porta e fixa o servidor local no loopback', () => {
    expect(readConfig({}).host).toBe('127.0.0.1')
    expect(() => readConfig({ API_PORT: 'abc' })).toThrow()
    expect(() => readConfig({ API_PORT: '65536' })).toThrow()
  })
})
