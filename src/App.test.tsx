import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material'
import App from './App'
import { theme } from './theme'
import { loadWorkspace } from './data/storage'

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
