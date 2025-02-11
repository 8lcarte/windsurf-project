import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  FormControlLabel,
  InputLabel,
  Typography,
  LinearProgress,
  IconButton,
  Card,
  CardContent,
  Grid,
  Switch,
  Chip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';
import { Budget, budgetsApi } from '../../api/budgets';
import { useSnackbar } from 'notistack';

interface BudgetManagerProps {
  budgets: Budget[];
  actualSpending: Record<string, number>;
  onBudgetChange: () => void;
}

export function BudgetManager({ budgets, actualSpending, onBudgetChange }: BudgetManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [category, setCategory] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertThresholds, setAlertThresholds] = useState<number[]>([50, 75, 90, 100]);
  const [newThreshold, setNewThreshold] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [period, setPeriod] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const { enqueueSnackbar } = useSnackbar();

  const handleOpen = () => {
    setOpen(true);
  };

  const handleAddThreshold = () => {
    const threshold = Number(newThreshold);
    if (threshold > 0 && threshold <= 100 && !alertThresholds.includes(threshold)) {
      setAlertThresholds(prev => [...prev, threshold].sort((a, b) => a - b));
      setNewThreshold('');
    }
  };

  const handleRemoveThreshold = (threshold: number) => {
    setAlertThresholds(prev => prev.filter(t => t !== threshold));
  };

  const handleClose = () => {
    setOpen(false);
    setEditingBudget(null);
    setCategory('');
    setTargetAmount('');
    setPeriod('monthly');
    setAlertThresholds([50, 75, 90, 100]);
    setNewThreshold('');
  };

  const handleSave = async () => {
    try {
      if (editingBudget) {
        await budgetsApi.update(editingBudget.id, Number(targetAmount));
      } else {
        await budgetsApi.create({
          category,
          targetAmount: Number(targetAmount),
          period,
          alertsEnabled,
          alertThresholds,
        });
      }
      onBudgetChange();
      handleClose();
      enqueueSnackbar(
        `Budget ${editingBudget ? 'updated' : 'created'} successfully`,
        { variant: 'success' }
      );
    } catch (error) {
      enqueueSnackbar('Failed to save budget', { variant: 'error' });
    }
  };

  const handleDelete = async (budgetId: string) => {
    try {
      await budgetsApi.delete(budgetId);
      onBudgetChange();
      enqueueSnackbar('Budget deleted successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Failed to delete budget', { variant: 'error' });
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setCategory(budget.category);
    setTargetAmount(budget.targetAmount.toString());
    setPeriod(budget.period);
    setOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Box>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Budget Management</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpen}
        >
          Add Budget
        </Button>
      </Box>

      <Grid container spacing={2}>
        {budgets.map((budget) => {
          const spent = actualSpending[budget.category] || 0;
          const progress = (spent / budget.targetAmount) * 100;
          const isOverBudget = progress > 100;

          return (
            <Grid item xs={12} sm={6} md={4} key={budget.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1">{budget.category}</Typography>
                    <Box>
                      <IconButton size="small" onClick={() => handleEdit(budget)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(budget.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} Budget
                  </Typography>
                  
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(progress, 100)}
                      color={isOverBudget ? 'error' : 'primary'}
                    />
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      Spent: {formatCurrency(spent)}
                    </Typography>
                    <Typography variant="body2">
                      Target: {formatCurrency(budget.targetAmount)}
                    </Typography>
                  </Box>
                  
                  {isOverBudget && (
                    <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                      Over budget by {formatCurrency(spent - budget.targetAmount)}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {editingBudget ? 'Edit Budget' : 'Create New Budget'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Alert Settings
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={alertsEnabled}
                      onChange={(e) => setAlertsEnabled(e.target.checked)}
                    />
                  }
                  label="Enable budget alerts"
                />
                {alertsEnabled && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Alert Thresholds
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      {alertThresholds.map((threshold) => (
                        <Chip
                          key={threshold}
                          label={`${threshold}%`}
                          onDelete={() => handleRemoveThreshold(threshold)}
                          color="primary"
                          variant="outlined"
                          size="small"
                        />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <TextField
                        label="New Threshold"
                        type="number"
                        size="small"
                        value={newThreshold}
                        onChange={(e) => setNewThreshold(e.target.value)}
                        InputProps={{
                          endAdornment: <Typography>%</Typography>,
                          inputProps: { min: 1, max: 100 }
                        }}
                        sx={{ width: 150 }}
                      />
                      <Button
                        variant="outlined"
                        onClick={handleAddThreshold}
                        disabled={!newThreshold || 
                          Number(newThreshold) <= 0 || 
                          Number(newThreshold) > 100 || 
                          alertThresholds.includes(Number(newThreshold))}
                      >
                        Add
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={(e) => setCategory(e.target.value)}
                disabled={!!editingBudget}
              >
                <MenuItem value="CLOUD_SERVICES">Cloud Services</MenuItem>
                <MenuItem value="SOFTWARE">Software</MenuItem>
                <MenuItem value="ADVERTISING">Advertising</MenuItem>
                <MenuItem value="MARKETING">Marketing</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Target Amount"
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
            />

            {!editingBudget && (
              <FormControl fullWidth>
                <InputLabel>Period</InputLabel>
                <Select
                  value={period}
                  label="Period"
                  onChange={(e) => setPeriod(e.target.value as 'monthly' | 'quarterly' | 'yearly')}
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="yearly">Yearly</MenuItem>
                </Select>
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!category || !targetAmount}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default BudgetManager;
