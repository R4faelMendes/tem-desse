import { z } from 'zod'
import {
  commentSchema,
  postSchema,
  productSchema,
  workspaceSchema,
  type Intent,
} from '../domain/model'

const commentsPageSchema = z.object({
  data: z.array(commentSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0).max(100_000),
  }),
})

export function createApiRepository(fetcher: typeof fetch = (...args) => fetch(...args)) {
  async function request<T>(path: string, schema: z.ZodType<T>, options: RequestInit = {}) {
    try {
      const response = await fetcher(`/api/v1${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options.headers },
        signal: options.signal ?? AbortSignal.timeout(15_000),
      })
      if (!response.ok) throw new Error('API_REQUEST_FAILED')
      const result = schema.safeParse(await response.json())
      if (!result.success) throw new Error('API_RESPONSE_INVALID')
      return result.data
    } catch (error) {
      if (options.signal?.aborted) throw error
      throw new Error(
        options.method === 'PATCH'
          ? 'Não foi possível confirmar a gravação na API. Sua edição foi mantida. Tente novamente ou atualize os dados.'
          : 'Não foi possível carregar a API local. Confira se o servidor está iniciado e tente novamente.',
        { cause: error },
      )
    }
  }

  return {
    async load(signal?: AbortSignal) {
      const [products, posts, first] = await Promise.all([
        request('/products', z.object({ data: z.array(productSchema) }), { signal }),
        request('/posts', z.object({ data: z.array(postSchema) }), { signal }),
        request('/comments?page=1&pageSize=100', commentsPageSchema, { signal }),
      ])
      const comments = [...first.data]
      for (let page = 2; page <= first.pagination.totalPages; page++) {
        const next = await request(`/comments?page=${page}&pageSize=100`, commentsPageSchema, {
          signal,
        })
        if (next.pagination.page !== page || next.pagination.total !== first.pagination.total) {
          throw new Error(
            'Os dados mudaram durante a leitura. Atualize a API local para tentar novamente.',
          )
        }
        comments.push(...next.data)
      }
      const result = workspaceSchema.safeParse({
        version: 1,
        products: products.data,
        posts: posts.data,
        comments,
      })
      if (!result.success || comments.length !== first.pagination.total) {
        throw new Error(
          'A API retornou dados incompletos ou incompatíveis. Tente atualizar novamente.',
        )
      }
      return result.data
    },
    async classify(id: string, intent: Intent, resolved: boolean) {
      const result = await request(
        `/comments/${encodeURIComponent(id)}`,
        z.object({ data: commentSchema }),
        {
          method: 'PATCH',
          body: JSON.stringify({ intent, resolved }),
        },
      )
      if (result.data.id !== id)
        throw new Error(
          'A API retornou outro comentário. Atualize os dados antes de tentar novamente.',
        )
      return result.data
    },
    async associate(postId: string, productId: string | null) {
      const result = await request(
        `/posts/${encodeURIComponent(postId)}/product`,
        z.object({ data: postSchema }),
        {
          method: 'PATCH',
          body: JSON.stringify({ productId }),
        },
      )
      if (result.data.id !== postId)
        throw new Error(
          'A API retornou outra publicação. Atualize os dados antes de tentar novamente.',
        )
      return result.data
    },
  }
}
