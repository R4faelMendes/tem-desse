import { createTheme } from '@mui/material/styles'
import { ptBR } from '@mui/material/locale'

export const theme = createTheme(
  {
    palette: {
      primary: { main: '#345e4a', dark: '#244433', contrastText: '#fff' },
      secondary: { main: '#b85835' },
      background: { default: '#f6f7f3', paper: '#fff' },
      text: { primary: '#243b30', secondary: '#677269' },
      divider: '#e4e9e1',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-1.2px' },
      h5: { fontWeight: 700, letterSpacing: '-0.7px' },
      h6: { fontWeight: 650, fontSize: '1.05rem' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 9 } },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { outlined: { borderColor: '#e4e9e1' } },
      },
      MuiChip: { styleOverrides: { root: { fontWeight: 500, fontSize: 12 } } },
      MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: '#fff', fontSize: 14 } } },
    },
  },
  ptBR,
)
