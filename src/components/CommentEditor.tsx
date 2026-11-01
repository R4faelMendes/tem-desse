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
} from '@mui/material'
import { intentLabels, type Comment, type Intent } from '../domain/model'

export function CommentEditor({
  comment,
  onClose,
  onSave,
}: {
  comment: Comment
  onClose: () => void
  onSave: (intent: Intent, resolved: boolean) => void
}) {
  const [intent, setIntent] = useState(comment.intent)
  const [resolved, setResolved] = useState(comment.resolved)
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="classification-title">
      <DialogTitle id="classification-title">Classificar comentário</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ pt: 1 }}>
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
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={() => onSave(intent, resolved)}>
          Salvar classificação
        </Button>
      </DialogActions>
    </Dialog>
  )
}
