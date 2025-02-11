import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  InputAdornment,
} from '@mui/material';

interface CreateCardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (cardData: CardFormData) => void;
}

interface CardFormData {
  name: string;
  spendLimit: number;
}

export function CreateCardModal({ open, onClose, onSubmit }: CreateCardModalProps) {
  const [formData, setFormData] = useState<CardFormData>({
    name: '',
    spendLimit: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ name: '', spendLimit: 0 });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create Virtual Card</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Card Name"
              fullWidth
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., AWS Services"
            />
            <TextField
              label="Spend Limit"
              fullWidth
              required
              type="number"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              value={formData.spendLimit}
              onChange={(e) =>
                setFormData({ ...formData, spendLimit: Number(e.target.value) })
              }
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color="primary">
            Create Card
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
