import { z } from 'zod'

export const intentLabels = {
  unclassified: 'Não classificado',
  restock: 'Reposição',
  variation: 'Cor ou tamanho',
  shipping: 'Entrega',
  price: 'Preço',
  other: 'Outro',
} as const
export const intentSchema = z.enum([
  'unclassified',
  'restock',
  'variation',
  'shipping',
  'price',
  'other',
])
export type Intent = z.infer<typeof intentSchema>

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  collection: z.string(),
  color: z.string(),
})
export const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  productId: z.string().nullable(),
  kind: z.enum(['Reel', 'Carrossel', 'Foto']),
})
export const commentSchema = z.object({
  id: z.string(),
  postId: z.string(),
  author: z.string(),
  text: z.string(),
  intent: intentSchema,
  resolved: z.boolean(),
})

export const workspaceSchema = z
  .object({
    version: z.literal(1),
    products: z.array(productSchema),
    posts: z.array(postSchema),
    comments: z.array(commentSchema),
  })
  .superRefine((workspace, ctx) => {
    const productIds = new Set(workspace.products.map((item) => item.id))
    const postIds = new Set(workspace.posts.map((item) => item.id))
    const commentIds = new Set(workspace.comments.map((item) => item.id))
    if (
      productIds.size !== workspace.products.length ||
      postIds.size !== workspace.posts.length ||
      commentIds.size !== workspace.comments.length
    ) {
      ctx.addIssue({ code: 'custom', message: 'IDs duplicados.' })
    }
    if (
      workspace.posts.some((post) => post.productId !== null && !productIds.has(post.productId)) ||
      workspace.comments.some((comment) => !postIds.has(comment.postId))
    ) {
      ctx.addIssue({ code: 'custom', message: 'Associação inexistente.' })
    }
  })
export type Workspace = z.infer<typeof workspaceSchema>
export type Comment = Workspace['comments'][number]

export function classifyComment(
  workspace: Workspace,
  id: string,
  intent: Intent,
  resolved: boolean,
): Workspace {
  return {
    ...workspace,
    comments: workspace.comments.map((comment) =>
      comment.id === id ? { ...comment, intent, resolved } : comment,
    ),
  }
}
export function associatePost(
  workspace: Workspace,
  postId: string,
  productId: string | null,
): Workspace {
  if (productId !== null && !workspace.products.some((product) => product.id === productId))
    return workspace
  return {
    ...workspace,
    posts: workspace.posts.map((post) => (post.id === postId ? { ...post, productId } : post)),
  }
}
export function getProductId(workspace: Workspace, comment: Comment) {
  return workspace.posts.find((post) => post.id === comment.postId)?.productId ?? null
}
export function getDemand(workspace: Workspace) {
  return workspace.products
    .map((product) => {
      const evidence = workspace.comments.filter(
        (comment) =>
          getProductId(workspace, comment) === product.id &&
          ['restock', 'variation'].includes(comment.intent),
      )
      return {
        product,
        evidence,
        restock: evidence.filter((comment) => comment.intent === 'restock').length,
        variation: evidence.filter((comment) => comment.intent === 'variation').length,
      }
    })
    .sort(
      (a, b) =>
        b.evidence.length - a.evidence.length ||
        a.product.name.localeCompare(b.product.name, 'pt-BR'),
    )
}
export function filterComments(
  workspace: Workspace,
  filters: { query: string; intent: Intent | 'all'; productId: string; onlyOpen: boolean },
) {
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
  const query = normalize(filters.query.trim())
  return workspace.comments.filter(
    (comment) =>
      (filters.intent === 'all' || comment.intent === filters.intent) &&
      (filters.productId === 'all' || getProductId(workspace, comment) === filters.productId) &&
      (!filters.onlyOpen || !comment.resolved) &&
      (!query || normalize(`${comment.author} ${comment.text}`).includes(query)),
  )
}
