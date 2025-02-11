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
  agent_type: string;
  agent_instance_id?: string;
  end_user_id: string;
  metadata: Record<string, any>;
}

interface AgentCardCreationFormProps {
  formData: AgentCardFormData;
  onChange: (data: Partial<AgentCardFormData>) => void;
  errors?: Record<string, string>;
}

const AGENT_TYPES = [
  {
    id: 'shopping_assistant',
    name: 'Shopping Assistant',
    icon: ShoppingIcon,
    description: 'For personal shopping and e-commerce purchases',
    defaultLimit: 1000,
    metadata: {
      allowed_categories: ['retail', 'electronics', 'general_merchandise'],
      requires_verification: false
    }
  },
  {
    id: 'travel_agent',
    name: 'Travel Agent',
    icon: FlightIcon,
    description: 'For booking flights, hotels, and travel expenses',
    defaultLimit: 5000,
    metadata: {
      allowed_categories: ['airlines', 'hotels', 'car_rental'],
      requires_verification: true
    }
  },
  {
    id: 'procurement_agent',
    name: 'Procurement Agent',
    icon: ProcurementIcon,
    description: 'For business purchases and vendor payments',
    defaultLimit: 10000,
    metadata: {
      requires_approval: true,
      approval_threshold: 5000,
      department_tracking: true
    }
  },
  {
    id: 'subscription_manager',
    name: 'Subscription Manager',
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
  const selectedAgent = AGENT_TYPES.find(agent => agent.id === formData.agent_type);

  const handleAgentTypeChange = (type: string) => {
    const agent = AGENT_TYPES.find(a => a.id === type);
    if (agent) {
      onChange({
        agent_type: type,
        spendLimit: agent.defaultLimit,
        metadata: agent.metadata
      });
    }
  };

  const getAgentSpecificFields = () => {
    if (!selectedAgent) return null;

    switch (selectedAgent.id) {
      case 'shopping_assistant':
        return (
          <TextField
            label="Items to Purchase"
            fullWidth
            multiline
            rows={2}
            value={formData.metadata.items_in_cart || ''}
            onChange={(e) => onChange({
              metadata: { ...formData.metadata, items_in_cart: e.target.value }
            })}
            placeholder="List items to be purchased"
          />
        );

      case 'travel_agent':
        return (
          <>
            <TextField
              label="Trip ID"
              fullWidth
              value={formData.metadata.trip_id || ''}
              onChange={(e) => onChange({
                metadata: { ...formData.metadata, trip_id: e.target.value }
              })}
            />
            <TextField
              label="Travel Dates"
              fullWidth
              value={formData.metadata.travel_dates || ''}
              onChange={(e) => onChange({
                metadata: { ...formData.metadata, travel_dates: e.target.value }
              })}
              placeholder="e.g., Dec 10-15"
            />
          </>
        );

      case 'procurement_agent':
        return (
          <>
            <TextField
              label="Department"
              fullWidth
              value={formData.metadata.department || ''}
              onChange={(e) => onChange({
                metadata: { ...formData.metadata, department: e.target.value }
              })}
            />
            <TextField
              label="Purchase Order Number"
              fullWidth
              value={formData.metadata.po_number || ''}
              onChange={(e) => onChange({
                metadata: { ...formData.metadata, po_number: e.target.value }
              })}
            />
          </>
        );

      case 'subscription_manager':
        return (
          <>
            <TextField
              label="Service Name"
              fullWidth
              value={formData.metadata.service_name || ''}
              onChange={(e) => onChange({
                metadata: { ...formData.metadata, service_name: e.target.value }
              })}
            />
            <TextField
              label="Number of Licenses"
              type="number"
              fullWidth
              value={formData.metadata.license_count || ''}
              onChange={(e) => onChange({
                metadata: { ...formData.metadata, license_count: Number(e.target.value) }
              })}
            />
          </>
        );
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <FormControl fullWidth error={!!errors?.agent_type}>
        <InputLabel>Agent Type</InputLabel>
        <Select
          value={formData.agent_type}
          onChange={(e) => handleAgentTypeChange(e.target.value)}
          startAdornment={
            selectedAgent && (
              <InputAdornment position="start">
                <AgentIcon />
              </InputAdornment>
            )
          }
        >
          {AGENT_TYPES.map((agent) => (
            <MenuItem key={agent.id} value={agent.id}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <agent.icon sx={{ mr: 1 }} />
                {agent.name}
              </Box>
            </MenuItem>
          ))}
        </Select>
        {errors?.agent_type && (
          <FormHelperText>{errors.agent_type}</FormHelperText>
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
