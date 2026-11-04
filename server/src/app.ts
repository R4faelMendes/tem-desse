import Fastify from 'fastify'
import { z, ZodError } from 'zod'
import { filterComments, getDemand, intentSchema } from '../../src/domain/model'
import { WorkspaceRepository } from './repository'

const paramsSchema = z.object({ id: z.string().min(1).max(128) })
const classificationSchema = z
  .strictObject({ intent: intentSchema.optional(), resolved: z.boolean().optional() })
  .refine(
    (input) => input.intent !== undefined || input.resolved !== undefined,
    'Informe intenção ou estado de tratamento.',
  )
const associationSchema = z.strictObject({ productId: z.string().min(1).max(128).nullable() })
const commentsQuerySchema = z.strictObject({
  query: z.string().max(200).default(''),
  intent: z.union([intentSchema, z.literal('all')]).default('all'),
  productId: z.string().min(1).max(128).default('all'),
  onlyOpen: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .default('1')
    .transform(Number)
    .pipe(z.number().int().max(100_000)),
  pageSize: z
    .string()
    .regex(/^[1-9]\d*$/)
    .default('20')
    .transform(Number)
    .pipe(z.number().int().max(100)),
})

class ApiError extends Error {
  statusCode: number
  code: string
  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export function buildApp(options: { databasePath: string; logger?: boolean }) {
  const repository = new WorkspaceRepository(options.databasePath)
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 16 * 1024 })
  app.addHook('onClose', async () => {
    repository.close()
  })
  app.addHook('onSend', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store')
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados da requisição inválidos.',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
          requestId: request.id,
        },
      })
    }
    if (error instanceof ApiError) {
      return reply
        .status(error.statusCode)
        .send({ error: { code: error.code, message: error.message, requestId: request.id } })
    }
    const status =
      error instanceof Error && 'statusCode' in error && typeof error.statusCode === 'number'
        ? error.statusCode
        : 500
    if (status >= 400 && status < 500) {
      return reply.status(status).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Não foi possível processar a requisição.',
          requestId: request.id,
        },
      })
    }
    request.log.error({ err: error }, 'API request failed')
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Ocorreu um erro interno.',
        requestId: request.id,
      },
    })
  })
  app.setNotFoundHandler((request, reply) =>
    reply.status(404).send({
      error: { code: 'ROUTE_NOT_FOUND', message: 'Rota não encontrada.', requestId: request.id },
    }),
  )

  app.get('/health', async () => {
    repository.snapshot()
    return { status: 'ok', service: 'tem-desse-api' }
  })
  app.get('/api/v1/products', async () => ({ data: repository.snapshot().products }))
  app.get('/api/v1/posts', async () => ({ data: repository.snapshot().posts }))
  app.get('/api/v1/comments', async (request) => {
    const { page, pageSize, ...filters } = commentsQuerySchema.parse(request.query)
    const workspace = repository.snapshot()
    if (
      filters.productId !== 'all' &&
      !workspace.products.some((product) => product.id === filters.productId)
    ) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.')
    }
    const comments = filterComments(workspace, filters)
    return {
      data: comments.slice((page - 1) * pageSize, page * pageSize),
      pagination: {
        page,
        pageSize,
        total: comments.length,
        totalPages: Math.ceil(comments.length / pageSize),
      },
    }
  })
  app.patch('/api/v1/comments/:id', async (request) => {
    const { id } = paramsSchema.parse(request.params)
    const input = classificationSchema.parse(request.body)
    if (!repository.classify(id, input))
      throw new ApiError(404, 'COMMENT_NOT_FOUND', 'Comentário não encontrado.')
    return { data: repository.snapshot().comments.find((comment) => comment.id === id) }
  })
  app.patch('/api/v1/posts/:id/product', async (request) => {
    const { id } = paramsSchema.parse(request.params)
    const { productId } = associationSchema.parse(request.body)
    const workspace = repository.snapshot()
    if (!workspace.posts.some((post) => post.id === id))
      throw new ApiError(404, 'POST_NOT_FOUND', 'Publicação não encontrada.')
    if (productId !== null && !workspace.products.some((product) => product.id === productId)) {
      throw new ApiError(404, 'PRODUCT_NOT_FOUND', 'Produto não encontrado.')
    }
    repository.associate(id, productId)
    return { data: repository.snapshot().posts.find((post) => post.id === id) }
  })
  app.get('/api/v1/radar', async () => {
    const workspace = repository.snapshot()
    const demand = getDemand(workspace)
    return {
      data: {
        summary: {
          totalComments: workspace.comments.length,
          totalPosts: workspace.posts.length,
          signals: demand.reduce((sum, item) => sum + item.evidence.length, 0),
          unclassified: workspace.comments.filter((comment) => comment.intent === 'unclassified')
            .length,
          open: workspace.comments.filter((comment) => !comment.resolved).length,
        },
        demand,
      },
    }
  })
  return app
}
