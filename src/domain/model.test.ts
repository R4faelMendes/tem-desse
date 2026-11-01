import { describe, expect, it } from 'vitest'
import { createDemo } from '../data/demo'
import { associatePost, classifyComment, filterComments, getDemand, workspaceSchema } from './model'

describe('Radar de demanda', () => {
  it('conta apenas reposição e variação, preservando as evidências', () => {
    const result = getDemand(createDemo())
    expect(result.map((item) => [item.product.id, item.evidence.length])).toEqual([
      ['linen', 4],
      ['dress', 2],
      ['bag', 0],
    ])
    expect(result[0]?.evidence.map((comment) => comment.id)).toEqual(['c1', 'c3', 'c5', 'c10'])
  })
  it('reclassificar altera o ranking sem duplicar o comentário nem modificar o original', () => {
    const before = createDemo()
    const after = classifyComment(before, 'c7', 'restock', false)
    expect(getDemand(after).find((item) => item.product.id === 'bag')?.restock).toBe(1)
    expect(after.comments).toHaveLength(before.comments.length)
    expect(before.comments.find((comment) => comment.id === 'c7')?.intent).toBe('unclassified')
    const reversed = classifyComment(after, 'c7', 'other', true)
    expect(getDemand(reversed).find((item) => item.product.id === 'bag')?.evidence).toHaveLength(0)
  })
  it('tratar um comentário não apaga o sinal de interesse histórico', () => {
    expect(
      getDemand(classifyComment(createDemo(), 'c1', 'restock', true))[0]?.evidence,
    ).toHaveLength(4)
  })
  it('reassociar um post transfere todos os seus sinais para o produto correto', () => {
    const after = associatePost(createDemo(), 'post-1', 'bag')
    expect(getDemand(after)[0]?.product.id).toBe('bag')
    expect(getDemand(after)[0]?.evidence).toHaveLength(4)
    expect(getDemand(after).find((item) => item.product.id === 'linen')?.evidence).toHaveLength(0)
  })
  it('um post sem produto conserva comentários, mas não entra no ranking', () => {
    const after = associatePost(createDemo(), 'post-1', null)
    expect(after.comments).toHaveLength(12)
    expect(getDemand(after).reduce((sum, item) => sum + item.evidence.length, 0)).toBe(2)
  })
  it('rejeita produtos inexistentes e snapshots com referências inválidas', () => {
    const before = createDemo()
    expect(associatePost(before, 'post-1', 'missing')).toBe(before)
    before.posts[0]!.productId = 'missing'
    expect(workspaceSchema.safeParse(before).success).toBe(false)
  })
  it('combina busca sem acento, produto, intenção e estado de tratamento', () => {
    const result = filterComments(createDemo(), {
      query: 'REPOSICAO',
      productId: 'linen',
      intent: 'restock',
      onlyOpen: true,
    })
    expect(result.map((comment) => comment.id)).toEqual(['c3'])
    expect(
      filterComments(createDemo(), {
        query: 'carol',
        productId: 'all',
        intent: 'all',
        onlyOpen: true,
      }),
    ).toHaveLength(0)
  })
  it('um conjunto vazio produz um ranking vazio', () => {
    expect(getDemand({ version: 1, products: [], posts: [], comments: [] })).toEqual([])
  })
})
