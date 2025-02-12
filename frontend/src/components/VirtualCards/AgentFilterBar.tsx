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
  selectedAgentName: string;
  onAgentNameChange: (name: string) => void;
  agentNames: string[];
  cardCount: number;
}

export function AgentFilterBar({
  selectedAgentName,
  onAgentNameChange,
  agentNames,
  cardCount,
}: AgentFilterBarProps) {
  const formatAgentName = (name: string) => {
    if (name === 'all') return 'All Agents';
    return name; // Agent names are already properly formatted by the developer
  };

  const handleChange = (event: SelectChangeEvent<string>) => {
    onAgentNameChange(event.target.value);
  };

  return (
    <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="agent-name-label">Agent Name</InputLabel>
        <Select
          labelId="agent-name-label"
          value={selectedAgentName}
          label="Agent Name"
          onChange={handleChange}
          startAdornment={<AgentIcon sx={{ ml: 1, mr: 1, color: 'action.active' }} />}
        >
          <MenuItem value="all">All Agents</MenuItem>
          {agentNames.map((name) => (
            <MenuItem key={name} value={name}>
              {formatAgentName(name)}
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
