import React from 'react';
import {
  Box,
  Chip,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
} from '@mui/material';
import { SmartToy as AgentIcon } from '@mui/icons-material';

interface AgentFilterBarProps {
  selectedAgentType: string;
  onAgentTypeChange: (type: string) => void;
  agentTypes: string[];
  cardCount: number;
}

export function AgentFilterBar({
  selectedAgentType,
  onAgentTypeChange,
  agentTypes,
  cardCount,
}: AgentFilterBarProps) {
  const formatAgentType = (type: string) => {
    if (type === 'all') return 'All Agents';
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const handleChange = (event: SelectChangeEvent<string>) => {
    onAgentTypeChange(event.target.value);
  };

  return (
    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="agent-type-label">Agent Type</InputLabel>
        <Select
          labelId="agent-type-label"
          value={selectedAgentType}
          label="Agent Type"
          onChange={handleChange}
          startAdornment={<AgentIcon sx={{ ml: 1, mr: 1, color: 'action.active' }} />}
        >
          <MenuItem value="all">All Agents</MenuItem>
          {agentTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {formatAgentType(type)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <Chip
        label={`${cardCount} ${cardCount === 1 ? 'Card' : 'Cards'}`}
        color="primary"
        variant="outlined"
        size="small"
      />
    </Box>
  );
}
