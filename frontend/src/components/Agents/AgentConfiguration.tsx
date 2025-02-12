import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  FormHelperText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  openai_assistant_id: string;
  daily_spend_limit: number;
  allowed_merchant_categories: string[];
  blocked_merchant_categories: string[];
  allowed_merchants: string[];
  blocked_merchants: string[];
  required_permissions: string[];
  risk_threshold: number;
  notification_settings: {
    email: boolean;
    slack: boolean;
    webhook_url?: string;
  };
}

export const AgentConfiguration: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [config, setConfig] = useState<AgentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addCategoryDialogOpen, setAddCategoryDialogOpen] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryType, setCategoryType] = useState<'allowed' | 'blocked'>('allowed');

  useEffect(() => {
    fetchAgentConfig();
  }, [id]);

  const fetchAgentConfig = async () => {
    try {
      const response = await fetch(`/api/v1/agents/${id}/config`);
      const data = await response.json();
      setConfig(data);
      setError(null);
    } catch (err) {
      setError('Failed to load agent configuration');
      console.error('Error fetching agent config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    try {
      const response = await fetch(`/api/v1/agents/${id}/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) throw new Error('Failed to save configuration');

      setSuccess('Configuration saved successfully');
      setError(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save configuration');
      console.error('Error saving config:', err);
    }
  };

  const handleAddCategory = () => {
    if (!config || !newCategory) return;

    const updatedConfig = { ...config };
    if (categoryType === 'allowed') {
      updatedConfig.allowed_merchant_categories = [
        ...updatedConfig.allowed_merchant_categories,
        newCategory,
      ];
    } else {
      updatedConfig.blocked_merchant_categories = [
        ...updatedConfig.blocked_merchant_categories,
        newCategory,
      ];
    }

    setConfig(updatedConfig);
    setNewCategory('');
    setAddCategoryDialogOpen(false);
  };

  const handleRemoveCategory = (category: string, type: 'allowed' | 'blocked') => {
    if (!config) return;

    const updatedConfig = { ...config };
    if (type === 'allowed') {
      updatedConfig.allowed_merchant_categories = updatedConfig.allowed_merchant_categories.filter(
        (c) => c !== category
      );
    } else {
      updatedConfig.blocked_merchant_categories = updatedConfig.blocked_merchant_categories.filter(
        (c) => c !== category
      );
    }

    setConfig(updatedConfig);
  };

  if (loading) return <Typography>Loading configuration...</Typography>;
  if (!config) return <Typography color="error">Configuration not found</Typography>;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Basic Configuration
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Agent Name"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="OpenAI Assistant ID"
                value={config.openai_assistant_id}
                onChange={(e) =>
                  setConfig({ ...config, openai_assistant_id: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Description"
                value={config.description}
                onChange={(e) =>
                  setConfig({ ...config, description: e.target.value })
                }
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Daily Spend Limit"
                value={config.daily_spend_limit}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    daily_spend_limit: parseFloat(e.target.value),
                  })
                }
                InputProps={{
                  startAdornment: <Typography>$</Typography>,
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Risk Threshold"
                value={config.risk_threshold}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    risk_threshold: parseFloat(e.target.value),
                  })
                }
                helperText="0-1, where 1 is highest risk tolerance"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Merchant Categories
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1">Allowed Categories</Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCategoryType('allowed');
                        setAddCategoryDialogOpen(true);
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {config.allowed_merchant_categories.map((category) => (
                      <Chip
                        key={category}
                        label={category}
                        onDelete={() => handleRemoveCategory(category, 'allowed')}
                        color="success"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1">Blocked Categories</Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCategoryType('blocked');
                        setAddCategoryDialogOpen(true);
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {config.blocked_merchant_categories.map((category) => (
                      <Chip
                        key={category}
                        label={category}
                        onDelete={() => handleRemoveCategory(category, 'blocked')}
                        color="error"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Notification Settings
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Email Notifications</InputLabel>
                <Select
                  value={config.notification_settings.email}
                  label="Email Notifications"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      notification_settings: {
                        ...config.notification_settings,
                        email: e.target.value === 'true',
                      },
                    })
                  }
                >
                  <MenuItem value="true">Enabled</MenuItem>
                  <MenuItem value="false">Disabled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Slack Notifications</InputLabel>
                <Select
                  value={config.notification_settings.slack}
                  label="Slack Notifications"
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      notification_settings: {
                        ...config.notification_settings,
                        slack: e.target.value === 'true',
                      },
                    })
                  }
                >
                  <MenuItem value="true">Enabled</MenuItem>
                  <MenuItem value="false">Disabled</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {config.notification_settings.slack && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Webhook URL"
                  value={config.notification_settings.webhook_url || ''}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      notification_settings: {
                        ...config.notification_settings,
                        webhook_url: e.target.value,
                      },
                    })
                  }
                  placeholder="https://hooks.slack.com/services/..."
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveConfig}
                >
                  Save Configuration
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Dialog
        open={addCategoryDialogOpen}
        onClose={() => setAddCategoryDialogOpen(false)}
      >
        <DialogTitle>
          Add {categoryType === 'allowed' ? 'Allowed' : 'Blocked'} Category
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCategoryDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleAddCategory} color="primary">
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 