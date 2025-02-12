import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Alert,
  SelectChangeEvent,
  Autocomplete,
  Chip,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useAuth } from '../contexts/AuthContext';
import { agentsApi } from '../api/agents';

interface CreateAgentForm {
  name: string;
  description: string;
  type: string;
  daily_spend_limit: string;
  monthly_spend_limit: string;
  allowed_merchant_categories: string[];
  blocked_merchant_categories: string[];
}

const initialFormState: CreateAgentForm = {
  name: '',
  description: '',
  type: '',
  daily_spend_limit: '',
  monthly_spend_limit: '',
  allowed_merchant_categories: [],
  blocked_merchant_categories: [],
};

const MERCHANT_CATEGORIES = [
  'Retail',
  'Travel',
  'Software',
  'Dining',
  'Entertainment',
  'Office Supplies',
  'Electronics',
  'Marketing',
  'Advertising',
  'Utilities',
  'Insurance',
  'Professional Services',
];

export const CreateAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const [formData, setFormData] = useState<CreateAgentForm>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate form data
    if (!formData.name.trim()) {
      setError('Agent name is required');
      setLoading(false);
      return;
    }

    if (!formData.type) {
      setError('Agent type is required');
      setLoading(false);
      return;
    }

    const daily_limit = parseFloat(formData.daily_spend_limit);
    const monthly_limit = parseFloat(formData.monthly_spend_limit);

    if (isNaN(daily_limit) || daily_limit <= 0) {
      setError('Daily spend limit must be a positive number');
      setLoading(false);
      return;
    }

    if (isNaN(monthly_limit) || monthly_limit <= 0) {
      setError('Monthly spend limit must be a positive number');
      setLoading(false);
      return;
    }

    if (monthly_limit < daily_limit) {
      setError('Monthly spend limit must be greater than or equal to daily spend limit');
      setLoading(false);
      return;
    }

    try {
      const agent = await agentsApi.createAgent({
        name: formData.name.trim(),
        description: formData.description.trim(),
        type: formData.type,
        daily_spend_limit: daily_limit,
        monthly_spend_limit: monthly_limit,
        allowed_merchant_categories: formData.allowed_merchant_categories,
        blocked_merchant_categories: formData.blocked_merchant_categories,
      });

      navigate(`/agents/${agent.id}`);
    } catch (err) {
      console.error('Error creating agent:', err);
      setError(err instanceof Error ? err.message : 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  const handleTextChange = (field: keyof CreateAgentForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSelectChange = (field: keyof CreateAgentForm) => (
    e: SelectChangeEvent<string>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Create New Agent
        </Typography>
        <Typography color="text.secondary" paragraph>
          Configure a new AI agent with payment capabilities
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    required
                    fullWidth
                    label="Agent Name"
                    value={formData.name}
                    onChange={handleTextChange('name')}
                    helperText="Give your agent a descriptive name"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={formData.description}
                    onChange={handleTextChange('description')}
                    helperText="Describe the agent's purpose and responsibilities"
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Agent Type</InputLabel>
                    <Select
                      value={formData.type}
                      label="Agent Type"
                      onChange={handleSelectChange('type')}
                    >
                      <MenuItem value="subscription_manager">Subscription Manager</MenuItem>
                      <MenuItem value="procurement_agent">Procurement Agent</MenuItem>
                      <MenuItem value="travel_agent">Travel Agent</MenuItem>
                      <MenuItem value="expense_manager">Expense Manager</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Daily Spend Limit"
                    value={formData.daily_spend_limit}
                    onChange={handleTextChange('daily_spend_limit')}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    helperText="Maximum amount the agent can spend per day"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    fullWidth
                    type="number"
                    label="Monthly Spend Limit"
                    value={formData.monthly_spend_limit}
                    onChange={handleTextChange('monthly_spend_limit')}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    helperText="Maximum amount the agent can spend per month"
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Autocomplete
                    multiple
                    options={MERCHANT_CATEGORIES}
                    value={formData.allowed_merchant_categories}
                    onChange={(_, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        allowed_merchant_categories: newValue,
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Allowed Merchant Categories"
                        helperText="Categories the agent is allowed to spend in"
                      />
                    )}
                    renderTags={(tagValue, getTagProps) =>
                      tagValue.map((option, index) => {
                        const { key, ...otherProps } = getTagProps({ index });
                        return (
                          <Chip
                            key={key}
                            {...otherProps}
                            label={option}
                            color="success"
                            variant="outlined"
                          />
                        );
                      })
                    }
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Autocomplete
                    multiple
                    options={MERCHANT_CATEGORIES}
                    value={formData.blocked_merchant_categories}
                    onChange={(_, newValue) => {
                      setFormData(prev => ({
                        ...prev,
                        blocked_merchant_categories: newValue,
                      }));
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Blocked Merchant Categories"
                        helperText="Categories the agent is not allowed to spend in"
                      />
                    )}
                    renderTags={(tagValue, getTagProps) =>
                      tagValue.map((option, index) => {
                        const { key, ...otherProps } = getTagProps({ index });
                        return (
                          <Chip
                            key={key}
                            {...otherProps}
                            label={option}
                            color="error"
                            variant="outlined"
                          />
                        );
                      })
                    }
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/agents')}
                >
                  Cancel
                </Button>
                <LoadingButton
                  type="submit"
                  variant="contained"
                  loading={loading}
                >
                  Create Agent
                </LoadingButton>
              </Box>
            </CardContent>
          </Card>
        </form>
      </Box>
    </Container>
  );
}; 