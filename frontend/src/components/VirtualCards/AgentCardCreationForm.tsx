import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  InputAdornment,
  FormHelperText,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  SmartToy as AgentIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { agentsApi } from '../../api/agents';

export interface AgentCardFormData {
  name: string;
  spendLimit: number;
  agentName: string;
  agent_instance_id?: string;
  end_user_id: string;
  metadata: Record<string, any>;
}

interface AgentCardCreationFormProps {
  formData: AgentCardFormData;
  onChange: (data: Partial<AgentCardFormData>) => void;
  errors?: Record<string, string>;
}

export function AgentCardCreationForm({ formData, onChange, errors }: AgentCardCreationFormProps) {
  // Fetch available agents
  const { data: agents = [], isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAgents,
    select: (data) => data.filter(agent => agent.status === 'active'), // Only show active agents
  });

  const selectedAgent = agents.find(agent => agent.name === formData.agentName);

  const handleAgentNameChange = (name: string) => {
    const agent = agents.find(a => a.name === name);
    if (agent) {
      onChange({
        agentName: name,
        spendLimit: agent.daily_spend_limit, // Use the agent's configured spend limit
        metadata: {
          agent_type: agent.type,
          department: 'Default', // This could be customizable
          requires_approval: agent.risk_level === 'high' || agent.risk_level === 'critical',
        }
      });
    }
  };

  const getAgentSpecificFields = () => {
    if (!selectedAgent) return null;

    return (
      <>
        <TextField
          label="Department"
          fullWidth
          value={formData.metadata.department || ''}
          onChange={(e) => onChange({
            metadata: { ...formData.metadata, department: e.target.value }
          })}
          placeholder="e.g., Engineering, Sales"
        />
        {selectedAgent.risk_level === 'high' || selectedAgent.risk_level === 'critical' ? (
          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            <Typography variant="body2" color="warning.main">
              This agent has a {selectedAgent.risk_level} risk level and may require additional approval.
            </Typography>
          </Box>
        ) : null}
      </>
    );
  };

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return (
      <Typography color="error">
        Error loading agents: {error instanceof Error ? error.message : 'Unknown error'}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl fullWidth error={!!errors?.agentName}>
        <InputLabel>Agent Name</InputLabel>
        <Select
          value={formData.agentName}
          onChange={(e) => handleAgentNameChange(e.target.value)}
          startAdornment={
            selectedAgent && (
              <InputAdornment position="start">
                <AgentIcon />
              </InputAdornment>
            )
          }
        >
          {agents.map((agent) => (
            <MenuItem key={agent.id} value={agent.name}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <AgentIcon sx={{ mr: 1 }} />
                {agent.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
        {errors?.agentName && (
          <FormHelperText>{errors.agentName}</FormHelperText>
        )}
      </FormControl>

      {selectedAgent && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Type: {selectedAgent.type}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`Daily Limit: $${selectedAgent.daily_spend_limit.toLocaleString()}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`Monthly Limit: $${selectedAgent.monthly_spend_limit.toLocaleString()}`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`Risk Level: ${selectedAgent.risk_level}`}
              size="small"
              variant="outlined"
              color={selectedAgent.risk_level === 'high' || selectedAgent.risk_level === 'critical' ? 'error' : 'default'}
            />
          </Box>
        </Box>
      )}

      <TextField
        label="Card Name"
        fullWidth
        required
        value={formData.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={selectedAgent ? `${selectedAgent.name} Card` : 'Card Name'}
        error={!!errors?.name}
        helperText={errors?.name}
      />

      <TextField
        label="End User ID"
        fullWidth
        required
        value={formData.end_user_id}
        onChange={(e) => onChange({ end_user_id: e.target.value })}
        error={!!errors?.end_user_id}
        helperText={errors?.end_user_id}
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
        onChange={(e) => onChange({ spendLimit: Number(e.target.value) })}
        error={!!errors?.spendLimit}
        helperText={errors?.spendLimit || (selectedAgent && `Daily limit for this agent: $${selectedAgent.daily_spend_limit.toLocaleString()}`)}
      />

      {getAgentSpecificFields()}
    </Box>
  );
}
