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
} from '@mui/material';
import {
  SmartToy as AgentIcon,
  Flight as FlightIcon,
  ShoppingCart as ShoppingIcon,
  Business as ProcurementIcon,
  Subscriptions as SubscriptionIcon,
} from '@mui/icons-material';

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

const AVAILABLE_AGENTS = [
  {
    id: 'aws_cost_manager',
    name: 'AWS Cost Manager',
    icon: ProcurementIcon,
    description: 'For managing AWS infrastructure costs and service payments',
    defaultLimit: 10000,
    metadata: {
      allowed_categories: ['CLOUD_SERVICES', 'SOFTWARE'],
      department: 'Engineering',
      requires_approval: true,
      approval_threshold: 5000
    }
  },
  {
    id: 'saas_subscription_manager',
    name: 'SaaS Subscription Manager',
    icon: SubscriptionIcon,
    description: 'For managing recurring software and service payments',
    defaultLimit: 2000,
    metadata: {
      recurring: true,
      billing_cycle: 'monthly',
      auto_suspend_on_overuse: true
    }
  }
];

export function AgentCardCreationForm({ formData, onChange, errors }: AgentCardCreationFormProps) {
  const selectedAgent = AVAILABLE_AGENTS.find(agent => agent.name === formData.agentName);

  const handleAgentNameChange = (name: string) => {
    const agent = AVAILABLE_AGENTS.find(a => a.name === name);
    if (agent) {
      onChange({
        agentName: name,
        spendLimit: agent.defaultLimit,
        metadata: agent.metadata
      });
    }
  };

  const getAgentSpecificFields = () => {
    if (!selectedAgent) return null;

    switch (selectedAgent.id) {
      case 'aws_cost_manager':
        return (
          <>
            <TextField
              label="Department"
              fullWidth
              value={formData.metadata.department || ''}
              onChange={(e) => onChange({
                metadata: { ...formData.metadata, department: e.target.value }
              })}
              placeholder="e.g., Engineering, DevOps"
            />
            <TextField
              label="Project Code"
              fullWidth
              value={formData.metadata.project_code || ''}
              onChange={(e) => onChange({
                metadata: { ...formData.metadata, project_code: e.target.value }
              })}
              placeholder="e.g., PROJ-123"
            />
          </>
        );

      case 'saas_subscription_manager':
        return (
          <>
            <TextField
              label="Service Name"
              fullWidth
              value={formData.metadata.service_name || ''}
              onChange={(e) => onChange({
                metadata: { ...formData.metadata, service_name: e.target.value }
              })}
              placeholder="e.g., Jira, Confluence"
            />
            <TextField
              label="Billing Cycle"
              select
              fullWidth
              value={formData.metadata.billing_cycle || 'monthly'}
              onChange={(e) => onChange({
                metadata: { ...formData.metadata, billing_cycle: e.target.value }
              })}
            >
              <MenuItem value="monthly">Monthly</MenuItem>
              <MenuItem value="quarterly">Quarterly</MenuItem>
              <MenuItem value="annual">Annual</MenuItem>
            </TextField>
          </>
        );
    }
  };

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
          {AVAILABLE_AGENTS.map((agent) => (
            <MenuItem key={agent.name} value={agent.name}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <agent.icon sx={{ mr: 1 }} />
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
            {selectedAgent.description}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(selectedAgent.metadata).map(([key, value]) => (
              <Chip
                key={key}
                label={`${key.replace(/_/g, ' ')}: ${value.toString()}`}
                size="small"
                variant="outlined"
              />
            ))}
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
        helperText={errors?.spendLimit}
      />

      {getAgentSpecificFields()}
    </Box>
  );
}
