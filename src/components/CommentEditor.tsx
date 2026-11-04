import { useState } from 'react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Alert,
} from '@mui/material'
import { intentLabels, type Comment, type Intent } from '../domain/model'

export function CommentEditor({
  comment,
  onClose,
  onSave,
  saving = false,
  error,
}: {
  comment: Comment
  onClose: () => void
  onSave: (intent: Intent, resolved: boolean) => void
  saving?: boolean
  error?: string | null
}) {
  const [intent, setIntent] = useState(comment.intent)
  const [resolved, setResolved] = useState(comment.resolved)
  return (
    <Dialog
      open
      onClose={saving ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="classification-title"
    >
      <DialogTitle id="classification-title">Classificar comentário</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <div>
            <Typography variant="caption" color="text.secondary">
              @{comment.author}
            </Typography>
            <Typography sx={{ mt: 1 }}>“{comment.text}”</Typography>
          </div>
          <TextField
            select
            label="Intenção do comentário"
            value={intent}
            onChange={(event) => setIntent(event.target.value as Intent)}
            fullWidth
            disabled={saving}
          >
            {Object.entries(intentLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={resolved}
                disabled={saving}
                onChange={(event) => setResolved(event.target.checked)}
              />
            }
            label="Marcar como tratado"
          />
          <Typography variant="caption" color="text.secondary">
            Tratado é um controle interno. Nenhuma resposta é enviada ao Instagram.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" disabled={saving} onClick={() => onSave(intent, resolved)}>
          {saving ? 'Salvando…' : 'Salvar classificação'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
