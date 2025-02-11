import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';
import { AgentCardCreationForm, AgentCardFormData } from './AgentCardCreationForm';
import { SmartToy as AgentIcon } from '@mui/icons-material';

interface CreateCardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (cardData: CardFormData) => void;
}

interface CreateCardModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (cardData: AgentCardFormData) => void;
}

export function CreateCardModal({ open, onClose, onSubmit }: CreateCardModalProps) {
  const [formData, setFormData] = useState<AgentCardFormData>({
    name: '',
    spendLimit: 0,
    agent_type: '',
    end_user_id: '',
    metadata: {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.agent_type) newErrors.agent_type = 'Agent type is required';
    if (!formData.end_user_id) newErrors.end_user_id = 'End user ID is required';
    if (formData.spendLimit <= 0) newErrors.spendLimit = 'Spend limit must be greater than 0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
    setFormData({
      name: '',
      spendLimit: 0,
      agent_type: '',
      end_user_id: '',
      metadata: {}
    });
    setErrors({});
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <AgentIcon sx={{ mr: 1 }} />
            <Typography variant="h6">Create Agent Virtual Card</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <AgentCardCreationForm
              formData={formData}
              onChange={(updates) => setFormData({ ...formData, ...updates })}
              errors={errors}
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
