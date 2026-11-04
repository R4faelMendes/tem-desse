import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { createDemo } from '../../src/data/demo'
import { workspaceSchema, type Intent, type Workspace } from '../../src/domain/model'

const migration = `
  CREATE TABLE products (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    collection TEXT NOT NULL,
    color TEXT NOT NULL
  ) STRICT;
  CREATE TABLE posts (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('Reel', 'Carrossel', 'Foto'))
  ) STRICT;
  CREATE TABLE comments (
    id TEXT PRIMARY KEY NOT NULL,
    post_id TEXT NOT NULL REFERENCES posts(id),
    author TEXT NOT NULL,
    text TEXT NOT NULL,
    intent TEXT NOT NULL CHECK (intent IN ('unclassified', 'restock', 'variation', 'shipping', 'price', 'other')),
    resolved INTEGER NOT NULL CHECK (resolved IN (0, 1))
  ) STRICT;
  CREATE INDEX comments_post_id ON comments(post_id);
  CREATE INDEX posts_product_id ON posts(product_id);
  PRAGMA user_version = 1;
`

export class WorkspaceRepository {
  private db: DatabaseSync

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(resolve(path)), { recursive: true })
    this.db = new DatabaseSync(path, { timeout: 3000 })
    try {
      this.db.exec('PRAGMA foreign_keys = ON;')
      this.db.exec('BEGIN IMMEDIATE;')
      const version = this.db.prepare('PRAGMA user_version').get()?.user_version
      if (version === 0) this.db.exec(migration)
      else if (version !== 1) throw new Error('Versão do banco não suportada. Migração necessária.')
      this.db.exec('COMMIT;')
    } catch (error) {
      if (this.db.isTransaction) this.db.exec('ROLLBACK;')
      this.db.close()
      throw error
    }
  }

  snapshot(): Workspace {
    const result = workspaceSchema.safeParse({
      version: 1,
      products: this.db
        .prepare('SELECT id, name, collection, color FROM products ORDER BY rowid')
        .all(),
      posts: this.db
        .prepare('SELECT id, title, product_id AS productId, kind FROM posts ORDER BY rowid')
        .all(),
      comments: this.db
        .prepare(
          'SELECT id, post_id AS postId, author, text, intent, resolved FROM comments ORDER BY rowid',
        )
        .all()
        .map((row) => ({ ...row, resolved: row.resolved === 1 })),
    })
    if (!result.success)
      throw new Error('Os dados do banco não correspondem ao modelo esperado.', {
        cause: result.error,
      })
    return result.data
  }

  classify(id: string, input: { intent?: Intent; resolved?: boolean }) {
    const result = this.db
      .prepare(
        'UPDATE comments SET intent = COALESCE(?, intent), resolved = COALESCE(?, resolved) WHERE id = ?',
      )
      .run(input.intent ?? null, input.resolved === undefined ? null : Number(input.resolved), id)
    return Number(result.changes) > 0
  }

  associate(postId: string, productId: string | null) {
    // The database also enforces the product foreign key.
    return (
      Number(
        this.db.prepare('UPDATE posts SET product_id = ? WHERE id = ?').run(productId, postId)
          .changes,
      ) > 0
    )
  }

  seedDemo() {
    const workspace = createDemo()
    this.db.exec('BEGIN IMMEDIATE;')
    try {
      const count = this.db
        .prepare(
          'SELECT (SELECT COUNT(*) FROM products) + (SELECT COUNT(*) FROM posts) + (SELECT COUNT(*) FROM comments) AS total',
        )
        .get()?.total
      if (count !== 0)
        throw new Error('O banco já contém dados. A demonstração não foi inserida nem sobrescrita.')
      const productInsert = this.db.prepare(
        'INSERT INTO products (id, name, collection, color) VALUES (?, ?, ?, ?)',
      )
      const postInsert = this.db.prepare(
        'INSERT INTO posts (id, title, product_id, kind) VALUES (?, ?, ?, ?)',
      )
      const commentInsert = this.db.prepare(
        'INSERT INTO comments (id, post_id, author, text, intent, resolved) VALUES (?, ?, ?, ?, ?, ?)',
      )
      for (const product of workspace.products)
        productInsert.run(product.id, product.name, product.collection, product.color)
      for (const post of workspace.posts)
        postInsert.run(post.id, post.title, post.productId, post.kind)
      for (const comment of workspace.comments)
        commentInsert.run(
          comment.id,
          comment.postId,
          comment.author,
          comment.text,
          comment.intent,
          Number(comment.resolved),
        )
      this.db.exec('COMMIT;')
    } catch (error) {
      this.db.exec('ROLLBACK;')
      throw error
    }
  }

  close() {
    this.db.close()
  }
}
