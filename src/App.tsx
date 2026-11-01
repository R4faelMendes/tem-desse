import { useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Snackbar,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import ArrowForward from '@mui/icons-material/ArrowForward'
import ArrowOutward from '@mui/icons-material/ArrowOutward'
import ChatBubbleOutlined from '@mui/icons-material/ChatBubbleOutlined'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import DashboardOutlined from '@mui/icons-material/DashboardOutlined'
import FilterAltOutlined from '@mui/icons-material/FilterAltOutlined'
import Instagram from '@mui/icons-material/Instagram'
import Inventory2Outlined from '@mui/icons-material/Inventory2Outlined'
import LocalFloristOutlined from '@mui/icons-material/LocalFloristOutlined'
import Refresh from '@mui/icons-material/Refresh'
import Search from '@mui/icons-material/Search'
import TrendingUp from '@mui/icons-material/TrendingUp'
import {
  associatePost,
  classifyComment,
  filterComments,
  getDemand,
  getProductId,
  intentLabels,
  type Comment,
  type Intent,
  type Workspace,
} from './domain/model'
import { createDemo } from './data/demo'
import { loadWorkspace, saveWorkspace } from './data/storage'
import { CommentEditor } from './components/CommentEditor'

type Page = 'radar' | 'comments' | 'products'
const intentColors: Record<Intent, string> = {
  unclassified: '#fff0d4',
  restock: '#e6efe4',
  variation: '#ece9f6',
  shipping: '#e7eff6',
  price: '#f6e7df',
  other: '#f0f1ed',
}

function IntentChip({ intent }: { intent: Intent }) {
  return (
    <Chip
      size="small"
      label={intentLabels[intent]}
      sx={{ bgcolor: intentColors[intent], color: '#36443a' }}
    />
  )
}

export default function App() {
  const [initial] = useState(() => {
    try {
      return loadWorkspace(window.localStorage)
    } catch {
      return {
        workspace: createDemo(),
        warning:
          'O armazenamento local está indisponível. As alterações durarão apenas nesta sessão.',
      }
    }
  })
  const [workspace, setWorkspace] = useState(initial.workspace)
  const [warning, setWarning] = useState(initial.warning)
  const [page, setPage] = useState<Page>('radar')
  const [query, setQuery] = useState('')
  const [intent, setIntent] = useState<Intent | 'all'>('all')
  const [productId, setProductId] = useState('all')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [editing, setEditing] = useState<Comment | null>(null)
  const [notice, setNotice] = useState('')
  const [resetOpen, setResetOpen] = useState(false)
  const demand = getDemand(workspace)
  const pending = workspace.comments.filter((comment) => comment.intent === 'unclassified').length
  const open = workspace.comments.filter((comment) => !comment.resolved).length
  const demandCount = demand.reduce((sum, item) => sum + item.evidence.length, 0)
  const comments = filterComments(workspace, { query, intent, productId, onlyOpen })

  function update(next: Workspace, message: string) {
    setWorkspace(next)
    let saved = false
    try {
      saved = saveWorkspace(window.localStorage, next)
    } catch {
      /* Storage may be disabled. */
    }
    setWarning(
      saved ? null : 'Alteração aplicada nesta sessão, mas não foi possível salvá-la no navegador.',
    )
    setNotice(message)
  }
  function showComments(product = 'all', category: Intent | 'all' = 'all') {
    setProductId(product)
    setIntent(category)
    setQuery('')
    setOnlyOpen(false)
    setPage('comments')
  }
  const nav = [
    { id: 'radar' as const, label: 'Visão geral', icon: <DashboardOutlined fontSize="small" /> },
    {
      id: 'comments' as const,
      label: 'Comentários',
      icon: <ChatBubbleOutlined fontSize="small" />,
    },
    {
      id: 'products' as const,
      label: 'Produtos e posts',
      icon: <Inventory2Outlined fontSize="small" />,
    },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(event) => {
            event.preventDefault()
            setPage('radar')
          }}
          aria-label="Tem desse? Início"
        >
          <span className="brand-mark">
            <ChatBubbleOutlined />
          </span>
          <span>
            tem desse<span className="brand-question">?</span>
          </span>
        </a>
        <div className="workspace-label">ESPAÇO DA LOJA</div>
        <Paper variant="outlined" className="store-card">
          <Avatar sx={{ bgcolor: '#e8eee4', color: 'primary.main', width: 36, height: 36 }}>
            <LocalFloristOutlined fontSize="small" />
          </Avatar>
          <div>
            <strong>Ateliê Flora</strong>
            <span>Loja de demonstração</span>
          </div>
        </Paper>
        <nav aria-label="Navegação principal">
          {nav.map((item) => (
            <Button
              key={item.id}
              startIcon={item.icon}
              onClick={() => (item.id === 'comments' ? showComments() : setPage(item.id))}
              className={`nav-button ${page === item.id ? 'active' : ''}`}
              aria-current={page === item.id ? 'page' : undefined}
            >
              {item.label}
              {item.id === 'comments' && <span className="nav-count">{pending}</span>}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Instagram fontSize="small" />
          <Typography variant="body2">Feito para ouvir seu público.</Typography>
          <Typography variant="caption" color="text.secondary">
            Interesse que vira decisão.
          </Typography>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Ateliê Flora <span>/</span> {nav.find((item) => item.id === page)?.label}
          </span>
          <Chip
            size="small"
            variant="outlined"
            label="Demonstração"
            icon={<span className="status-dot" />}
          />
          <Avatar
            sx={{ width: 32, height: 32, bgcolor: '#ece9e1', color: '#665c46', fontSize: 12 }}
          >
            AF
          </Avatar>
        </header>
        <main className="main-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">MENOS ACHISMO, MAIS ESCUTA</div>
              <Typography variant="h4" component="h1">
                {page === 'radar'
                  ? 'Seu público está dando pistas.'
                  : page === 'comments'
                    ? 'Toda conversa tem uma pista.'
                    : 'Do post ao produto.'}
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                {page === 'radar'
                  ? 'Descubra o que as pessoas procuram nos comentários da sua loja.'
                  : page === 'comments'
                    ? 'Leia, classifique e organize os interesses de quem acompanha sua marca.'
                    : 'Associe as publicações para entender quais produtos despertam interesse.'}
              </Typography>
            </div>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => setResetOpen(true)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Restaurar demo
            </Button>
          </div>
          <Alert
            severity="info"
            icon={<Instagram fontSize="small" />}
            sx={{
              mb: 3,
              bgcolor: '#edf1e9',
              color: '#425742',
              '& .MuiAlert-icon': { color: '#54704e' },
            }}
          >
            Você está explorando dados fictícios. A conexão com o Instagram será adicionada em uma
            próxima etapa.
          </Alert>
          {warning && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              {warning}
            </Alert>
          )}

          {page === 'radar' && (
            <>
              <section className="metric-grid" aria-label="Resumo da loja">
                {[
                  {
                    label: 'Comentários na análise',
                    value: workspace.comments.length,
                    note: `${workspace.posts.length} publicações de demonstração`,
                    icon: <ChatBubbleOutlined />,
                  },
                  {
                    label: 'Sinais de interesse',
                    value: demandCount,
                    note: 'Pedidos de reposição e variação',
                    icon: <TrendingUp />,
                  },
                  {
                    label: 'Para classificar',
                    value: pending,
                    note: 'Sua próxima oportunidade de escuta',
                    icon: <FilterAltOutlined />,
                  },
                  {
                    label: 'Ainda não tratados',
                    value: open,
                    note: 'Controle interno de acompanhamento',
                    icon: <CheckCircleOutlined />,
                  },
                ].map((metric, index) => (
                  <Paper
                    key={metric.label}
                    variant="outlined"
                    className={`metric-card ${index === 1 ? 'metric-featured' : ''}`}
                  >
                    <div className="metric-top">
                      <span>{metric.label}</span>
                      {metric.icon}
                    </div>
                    <div className="metric-value">{metric.value.toString().padStart(2, '0')}</div>
                    <div className="metric-note">{metric.note}</div>
                  </Paper>
                ))}
              </section>

              <div className="radar-grid">
                <Paper component="section" variant="outlined" className="panel">
                  <div className="panel-heading">
                    <div>
                      <Typography component="h2" variant="h6">
                        O que seu público procura
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Produtos com pedidos de reposição ou novas variações.
                      </Typography>
                    </div>
                    <Chip label="Por comentários" size="small" variant="outlined" />
                  </div>
                  <div className="demand-list">
                    {demand.map((item, index) => (
                      <button
                        key={item.product.id}
                        className="demand-row"
                        onClick={() => showComments(item.product.id)}
                        aria-label={`Ver comentários de ${item.product.name}`}
                      >
                        <span className="ranking-number">0{index + 1}</span>
                        <span className="product-swatch" style={{ background: item.product.color }}>
                          <Inventory2Outlined />
                        </span>
                        <span className="demand-details">
                          <strong>{item.product.name}</strong>
                          <span>
                            {item.restock} reposição · {item.variation} cor ou tamanho
                          </span>
                          <LinearProgress
                            variant="determinate"
                            value={demandCount ? (item.evidence.length / demandCount) * 100 : 0}
                            aria-label={`Participação de ${item.product.name} nos sinais de interesse`}
                            sx={{ mt: 1.2, height: 5, borderRadius: 4, bgcolor: '#eef1e9' }}
                          />
                        </span>
                        <span className="demand-total">
                          {item.evidence.length}
                          <small>comentários</small>
                        </span>
                        <ArrowOutward fontSize="small" />
                      </button>
                    ))}
                  </div>
                  <div className="panel-footnote">
                    Sinais de interesse representam comentários classificados, não vendas ou
                    compradores únicos.
                  </div>
                </Paper>
                <Paper component="section" variant="outlined" className="panel next-step">
                  <span className="small-icon">
                    <FilterAltOutlined />
                  </span>
                  <div className="eyebrow">SUA PRÓXIMA AÇÃO</div>
                  <Typography component="h2" variant="h5" sx={{ mt: 1 }}>
                    {pending
                      ? `${pending} comentários ainda podem revelar algo.`
                      : 'Tudo classificado. Boa escuta!'}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2, lineHeight: 1.8 }}
                  >
                    A classificação manual mantém você no controle. Separe pedidos de reposição,
                    dúvidas e novas ideias para sua loja.
                  </Typography>
                  <Button
                    fullWidth
                    variant="contained"
                    endIcon={<ArrowForward />}
                    sx={{ mt: 3 }}
                    onClick={() => showComments('all', 'unclassified')}
                  >
                    Classificar comentários
                  </Button>
                </Paper>
              </div>
              <Paper component="section" variant="outlined" className="panel" sx={{ mt: 3 }}>
                <div className="panel-heading">
                  <div>
                    <Typography component="h2" variant="h6">
                      A voz de quem acompanha
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Os comentários por trás das decisões.
                    </Typography>
                  </div>
                  <Button endIcon={<ArrowForward />} onClick={() => showComments()}>
                    Ver todos
                  </Button>
                </div>
                <div className="quote-grid">
                  {workspace.comments
                    .filter(
                      (comment) => comment.intent === 'restock' || comment.intent === 'variation',
                    )
                    .slice(0, 3)
                    .map((comment) => (
                      <button
                        className="quote-card"
                        key={comment.id}
                        onClick={() => setEditing(comment)}
                      >
                        <IntentChip intent={comment.intent} />
                        <p>“{comment.text}”</p>
                        <span>@{comment.author}</span>
                      </button>
                    ))}
                </div>
              </Paper>
            </>
          )}

          {page === 'comments' && (
            <Paper component="section" variant="outlined" className="panel">
              <div className="panel-heading">
                <div>
                  <Typography component="h2" variant="h6">
                    Caixa de comentários
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {comments.length} de {workspace.comments.length} comentários
                  </Typography>
                </div>
                <FormControlLabel
                  control={
                    <Switch
                      checked={onlyOpen}
                      onChange={(event) => setOnlyOpen(event.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="body2">Só não tratados</Typography>}
                />
              </div>
              <div className="filters">
                <TextField
                  size="small"
                  label="Buscar comentário ou autor"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <Search sx={{ color: 'text.secondary', mr: 1 }} fontSize="small" />
                      ),
                    },
                  }}
                />
                <TextField
                  select
                  size="small"
                  label="Intenção"
                  value={intent}
                  onChange={(event) => setIntent(event.target.value as Intent | 'all')}
                >
                  <MenuItem value="all">Todas as intenções</MenuItem>
                  {Object.entries(intentLabels).map(([key, label]) => (
                    <MenuItem key={key} value={key}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  size="small"
                  label="Produto"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                >
                  <MenuItem value="all">Todos os produtos</MenuItem>
                  {workspace.products.map((product) => (
                    <MenuItem key={product.id} value={product.id}>
                      {product.name}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
              <div className="comment-list">
                {comments.map((comment) => {
                  const post = workspace.posts.find((item) => item.id === comment.postId)
                  const product = workspace.products.find(
                    (item) => item.id === getProductId(workspace, comment),
                  )
                  return (
                    <article className="comment-row" key={comment.id}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: '#edf0e8',
                          color: '#5c6b58',
                          fontSize: 13,
                        }}
                      >
                        {comment.author.slice(0, 2).toUpperCase()}
                      </Avatar>
                      <div className="comment-body">
                        <div className="comment-meta">
                          <strong>@{comment.author}</strong>
                          <span>{comment.resolved ? 'Tratado' : 'Não tratado'}</span>
                        </div>
                        <p>{comment.text}</p>
                        <div className="comment-context">
                          <IntentChip intent={comment.intent} />
                          <span>
                            {product?.name ?? 'Produto não associado'} · {post?.kind}
                          </span>
                        </div>
                        <Typography variant="caption" color="text.secondary">
                          Publicação: {post?.title}
                        </Typography>
                      </div>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setEditing(comment)}
                        aria-label={`Classificar comentário de ${comment.author}`}
                      >
                        Classificar
                      </Button>
                    </article>
                  )
                })}
              </div>
              {comments.length === 0 && (
                <div className="empty-state">
                  <Search sx={{ fontSize: 36, color: 'text.secondary' }} />
                  <Typography variant="h6" sx={{ mt: 1 }}>
                    Nenhum comentário encontrado
                  </Typography>
                  <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
                    Experimente outra busca ou remova os filtros.
                  </Typography>
                  <Button sx={{ mt: 2 }} onClick={() => showComments()}>
                    Limpar filtros
                  </Button>
                </div>
              )}
            </Paper>
          )}

          {page === 'products' && (
            <>
              <div className="product-grid">
                {workspace.products.map((product) => (
                  <Paper key={product.id} variant="outlined" className="product-card">
                    <div className="product-visual" style={{ background: product.color }}>
                      <Inventory2Outlined sx={{ fontSize: 48, opacity: 0.6 }} />
                      <span>{product.collection}</span>
                    </div>
                    <div className="product-card-body">
                      <Typography variant="h6">{product.name}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        {workspace.posts.filter((post) => post.productId === product.id).length}{' '}
                        publicações associadas
                      </Typography>
                      <Button
                        sx={{ mt: 1, px: 0 }}
                        endIcon={<ArrowForward />}
                        onClick={() => showComments(product.id)}
                      >
                        Explorar comentários
                      </Button>
                    </div>
                  </Paper>
                ))}
              </div>
              <Paper component="section" variant="outlined" className="panel" sx={{ mt: 3 }}>
                <div className="panel-heading">
                  <div>
                    <Typography component="h2" variant="h6">
                      Publicações e associações
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      Alterar o produto atualiza o radar e os filtros automaticamente.
                    </Typography>
                  </div>
                </div>
                {workspace.posts.map((post) => (
                  <div key={post.id} className="post-row">
                    <Box className="post-icon">
                      <Instagram />
                    </Box>
                    <div className="post-description">
                      <Typography sx={{ fontWeight: 600 }} variant="body2">
                        {post.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {post.kind} ·{' '}
                        {workspace.comments.filter((comment) => comment.postId === post.id).length}{' '}
                        comentários
                      </Typography>
                    </div>
                    <TextField
                      select
                      size="small"
                      label={`Produto de ${post.title}`}
                      value={post.productId ?? ''}
                      onChange={(event) =>
                        update(
                          associatePost(workspace, post.id, event.target.value || null),
                          'Associação atualizada.',
                        )
                      }
                      sx={{ minWidth: { sm: 240 }, width: { xs: '100%', sm: 260 } }}
                    >
                      <MenuItem value="">Não associado</MenuItem>
                      {workspace.products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </div>
                ))}
              </Paper>
            </>
          )}
          <footer className="footer">
            <span>
              tem desse? <span className="footer-separator">/</span> Escutar também é estratégia.
            </span>
            <span>Dados fictícios · Salvos neste navegador</span>
          </footer>
        </main>
      </div>
      {editing && (
        <CommentEditor
          key={editing.id}
          comment={editing}
          onClose={() => setEditing(null)}
          onSave={(category, resolved) => {
            update(
              classifyComment(workspace, editing.id, category, resolved),
              'Classificação salva. O radar foi atualizado.',
            )
            setEditing(null)
          }}
        />
      )}
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)} aria-labelledby="reset-title">
        <DialogTitle id="reset-title">Restaurar os dados de demonstração?</DialogTitle>
        <DialogContent>
          Suas classificações e associações locais serão substituídas pelos exemplos iniciais.
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setResetOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() => {
              update(createDemo(), 'Demonstração restaurada.')
              setResetOpen(false)
              setEditing(null)
            }}
          >
            Restaurar
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={4500}
        onClose={() => setNotice('')}
        message={notice}
      />
    </div>
  )
}
