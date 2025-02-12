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
  onSubmit: (cardData: {
    name: string;
    spendLimit: number;
    customerId: string;
    agentName: string;
    metadata?: Record<string, any>;
  }) => void;
}

export function CreateCardModal({ open, onClose, onSubmit }: CreateCardModalProps) {
  const [formData, setFormData] = useState<AgentCardFormData>({
    name: '',
    spendLimit: 0,
    agentName: '',
    end_user_id: '',
    metadata: {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.agentName) newErrors.agentName = 'Agent name is required';
    if (!formData.end_user_id) newErrors.end_user_id = 'End user ID is required';
    if (formData.spendLimit <= 0) newErrors.spendLimit = 'Spend limit must be greater than 0';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Transform form data to API format
    const cardData = {
      name: formData.name,
      spendLimit: formData.spendLimit,
      customerId: formData.end_user_id,
      agentName: formData.agentName,
      metadata: formData.metadata
    };

    onSubmit(cardData);
    setFormData({
      name: '',
      spendLimit: 0,
      agentName: '',
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
