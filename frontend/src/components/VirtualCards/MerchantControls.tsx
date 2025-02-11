import React, { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  TextField,
  Button,
  Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

interface MerchantControlsProps {
  allowed: string[];
  blocked: string[];
  merchantLimits: Record<string, number>;
  onUpdate: (
    allowed: string[],
    blocked: string[],
    limits: Record<string, number>
  ) => void;
}

export function MerchantControls({
  allowed,
  blocked,
  merchantLimits,
  onUpdate
}: MerchantControlsProps) {
  const [newAllowed, setNewAllowed] = useState('');
  const [newBlocked, setNewBlocked] = useState('');
  const [newMerchant, setNewMerchant] = useState('');
  const [newLimit, setNewLimit] = useState('');

  const handleAddAllowed = () => {
    if (!newAllowed) return;
    const updatedAllowed = [...allowed, newAllowed.trim()];
    onUpdate(updatedAllowed, blocked, merchantLimits);
    setNewAllowed('');
  };

  const handleAddBlocked = () => {
    if (!newBlocked) return;
    const updatedBlocked = [...blocked, newBlocked.trim()];
    onUpdate(allowed, updatedBlocked, merchantLimits);
    setNewBlocked('');
  };

  const handleAddLimit = () => {
    if (!newMerchant || !newLimit) return;
    const updatedLimits = {
      ...merchantLimits,
      [newMerchant.trim()]: Number(newLimit)
    };
    onUpdate(allowed, blocked, updatedLimits);
    setNewMerchant('');
    setNewLimit('');
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Merchant Controls
      </Typography>

      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Allowed Categories
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {allowed.map((category) => (
            <Chip
              key={category}
              label={category}
              onDelete={() => {
                const updatedAllowed = allowed.filter((c) => c !== category);
                onUpdate(updatedAllowed, blocked, merchantLimits);
              }}
            />
          ))}
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Add allowed category"
            value={newAllowed}
            onChange={(e) => setNewAllowed(e.target.value)}
            size="small"
          />
          <Button
            variant="contained"
            onClick={handleAddAllowed}
            disabled={!newAllowed}
          >
            <AddIcon /> Add
          </Button>
        </Stack>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom>
          Blocked Categories
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {blocked.map((category) => (
            <Chip
              key={category}
              label={category}
              color="error"
              onDelete={() => {
                const updatedBlocked = blocked.filter((c) => c !== category);
                onUpdate(allowed, updatedBlocked, merchantLimits);
              }}
            />
          ))}
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Add blocked category"
            value={newBlocked}
            onChange={(e) => setNewBlocked(e.target.value)}
            size="small"
          />
          <Button
            variant="contained"
            color="error"
            onClick={handleAddBlocked}
            disabled={!newBlocked}
          >
            <AddIcon /> Add
          </Button>
        </Stack>
      </Box>

      <Box>
        <Typography variant="subtitle1" gutterBottom>
          Merchant Spending Limits
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {Object.entries(merchantLimits).map(([merchant, limit]) => (
            <Chip
              key={merchant}
              label={`${merchant}: $${limit}`}
              color="warning"
              onDelete={() => {
                const { [merchant]: _, ...remainingLimits } = merchantLimits;
                onUpdate(allowed, blocked, remainingLimits);
              }}
            />
          ))}
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            label="Merchant Name"
            value={newMerchant}
            onChange={(e) => setNewMerchant(e.target.value)}
            size="small"
          />
          <TextField
            label="Limit ($)"
            type="number"
            value={newLimit}
            onChange={(e) => setNewLimit(e.target.value)}
            size="small"
            sx={{ width: 150 }}
          />
          <Button
            variant="contained"
            color="warning"
            onClick={handleAddLimit}
            disabled={!newMerchant || !newLimit}
          >
            <AddIcon /> Add Limit
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

export default MerchantControls;
