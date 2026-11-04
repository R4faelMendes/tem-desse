import { describe, expect, it, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material'
import App from './App'
import { theme } from './theme'
import { loadWorkspace } from './data/storage'
import { createDemo } from './data/demo'
import { STORAGE_KEY } from './data/storage'
import { SOURCE_KEY } from './data/useWorkspace'
import { mockApi } from './test/apiMock'

function renderApp() {
  return render(
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>,
  )
}

describe('Fluxo de classificação', () => {
  it('classifica um comentário pendente e mantém a alteração após reabrir', async () => {
    const user = userEvent.setup()
    const view = renderApp()
    await user.click(screen.getByRole('button', { name: 'Classificar comentários' }))
    await user.click(screen.getByRole('button', { name: 'Classificar comentário de joao.exemplo' }))
    const dialog = screen.getByRole('dialog', { name: 'Classificar comentário' })
    await user.click(within(dialog).getByRole('combobox', { name: 'Intenção do comentário' }))
    await user.click(await screen.findByRole('option', { name: 'Reposição' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'Marcar como tratado' }))
    await user.click(within(dialog).getByRole('button', { name: 'Salvar classificação' }))
    const saved = loadWorkspace(localStorage).workspace.comments.find(
      (comment) => comment.id === 'c7',
    )
    expect(saved).toMatchObject({ intent: 'restock', resolved: true })
    expect(
      screen.queryByRole('button', { name: 'Classificar comentário de joao.exemplo' }),
    ).not.toBeInTheDocument()
    view.unmount()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Ver comentários de Bolsa Alma' }))
    await user.click(screen.getByRole('button', { name: 'Classificar comentário de joao.exemplo' }))
    expect(screen.getByRole('checkbox', { name: 'Marcar como tratado' })).toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Intenção do comentário' })).toHaveTextContent(
      'Reposição',
    )
  })
  it('permite cancelar a edição sem alterar os dados e exibe busca vazia', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: 'Ver comentários de Camisa Linho' }))
    await user.click(
      screen.getByRole('button', { name: 'Classificar comentário de marina.exemplo' }),
    )
    await user.click(screen.getByRole('checkbox', { name: 'Marcar como tratado' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(
      loadWorkspace(localStorage).workspace.comments.find((comment) => comment.id === 'c1')
        ?.resolved,
    ).toBe(false)
    await user.type(
      screen.getByRole('textbox', { name: 'Buscar comentário ou autor' }),
      'inexistente',
    )
    expect(screen.getByText('Nenhum comentário encontrado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    expect(screen.getByText('12 de 12 comentários')).toBeInTheDocument()
  })
})

describe('Interface conectada à API', () => {
  it('grava na API, reabre os dados e preserva a demonstração do navegador', async () => {
    const mock = mockApi()
    vi.stubGlobal('fetch', mock.fetcher)
    localStorage.setItem(SOURCE_KEY, 'api')
    localStorage.setItem(STORAGE_KEY, JSON.stringify(createDemo()))
    const user = userEvent.setup()
    const view = renderApp()
    await waitFor(() =>
      expect(
        screen.queryByRole('progressbar', { name: 'Carregando dados da API' }),
      ).not.toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: 'Classificar comentários' }))
    await user.click(screen.getByRole('button', { name: 'Classificar comentário de joao.exemplo' }))
    await user.click(screen.getByRole('combobox', { name: 'Intenção do comentário' }))
    await user.click(await screen.findByRole('option', { name: 'Reposição' }))
    await user.click(screen.getByRole('button', { name: 'Salvar classificação' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mock.snapshot().comments.find((comment) => comment.id === 'c7')?.intent).toBe('restock')
    expect(loadWorkspace(localStorage).workspace).toEqual(createDemo())
    view.unmount()
    renderApp()
    await waitFor(() =>
      expect(
        screen.queryByRole('progressbar', { name: 'Carregando dados da API' }),
      ).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('combobox', { name: 'Origem dos dados' })).toHaveTextContent(
      'API local',
    )
    await user.click(screen.getByRole('button', { name: 'Ver comentários de Bolsa Alma' }))
    await user.click(screen.getByRole('button', { name: 'Classificar comentário de joao.exemplo' }))
    expect(screen.getByRole('combobox', { name: 'Intenção do comentário' })).toHaveTextContent(
      'Reposição',
    )
  })
  it('mantém o editor e a seleção quando a gravação falha, sem anunciar sucesso', async () => {
    const mock = mockApi()
    vi.stubGlobal('fetch', mock.fetcher)
    localStorage.setItem(SOURCE_KEY, 'api')
    const user = userEvent.setup()
    renderApp()
    await waitFor(() =>
      expect(
        screen.queryByRole('progressbar', { name: 'Carregando dados da API' }),
      ).not.toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: 'Classificar comentários' }))
    await user.click(screen.getByRole('button', { name: 'Classificar comentário de joao.exemplo' }))
    await user.click(screen.getByRole('combobox', { name: 'Intenção do comentário' }))
    await user.click(await screen.findByRole('option', { name: 'Reposição' }))
    mock.failWrites()
    await user.click(screen.getByRole('button', { name: 'Salvar classificação' }))
    expect(await screen.findByText(/Não foi possível confirmar a gravação/)).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Intenção do comentário' })).toHaveTextContent(
      'Reposição',
    )
    expect(
      screen.queryByText('Classificação salva. O radar foi atualizado.'),
    ).not.toBeInTheDocument()
    expect(mock.snapshot().comments.find((comment) => comment.id === 'c7')?.intent).toBe(
      'unclassified',
    )
  })
  it('permite voltar à demonstração quando a API está indisponível', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    localStorage.setItem(SOURCE_KEY, 'api')
    const user = userEvent.setup()
    renderApp()
    expect(await screen.findByText(/Não foi possível carregar a API local/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Ver comentários de Camisa Linho' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'Origem dos dados' }))
    await user.click(await screen.findByRole('option', { name: 'Demonstração' }))
    expect(
      screen.getByRole('button', { name: 'Ver comentários de Camisa Linho' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Não foi possível carregar a API local/)).not.toBeInTheDocument()
  })
})
