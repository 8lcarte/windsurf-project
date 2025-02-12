import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  IconButton,
  Chip,
  Tooltip,
  LinearProgress,
  Alert,
  Button,
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  Warning as WarningIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Agent, agentsApi } from '../../api/agents';

export const AgentList: React.FC = () => {
  const { getAccessToken } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paginationModel, setPaginationModel] = useState({
    pageSize: 10,
    page: 0,
  });

  // Queries
  const { data: agents = [], isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn: agentsApi.getAgents,
  });

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'active' | 'inactive' }) => {
      return agentsApi.updateAgent(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      enqueueSnackbar('Agent status updated successfully', { variant: 'success' });
    },
    onError: (error) => {
      enqueueSnackbar('Failed to update agent status', { variant: 'error' });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'suspended':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      case 'critical':
        return 'error';
      default:
        return 'default';
    }
  };

  const columns: GridColDef<Agent>[] = [
    {
      field: 'name',
      headerName: 'Agent Name',
      flex: 1,
      renderCell: (params: GridRenderCellParams<Agent>) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2">{params.value}</Typography>
          <Chip
            label={params.row.status}
            size="small"
            color={getStatusColor(params.row.status) as any}
            sx={{ ml: 1 }}
          />
        </Box>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
    },
    {
      field: 'daily_spend',
      headerName: 'Daily Spend',
      width: 200,
      renderCell: (params: GridRenderCellParams<Agent>) => (
        <Box sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">
              ${params.row.current_daily_spend.toFixed(2)} / ${params.row.daily_spend_limit.toFixed(2)}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={(params.row.current_daily_spend / params.row.daily_spend_limit) * 100}
            sx={{ height: 6, borderRadius: 1 }}
          />
        </Box>
      ),
    },
    {
      field: 'success_rate',
      headerName: 'Success Rate',
      width: 120,
      valueFormatter: ({ value }) => `${(Number(value) * 100).toFixed(1)}%`,
    },
    {
      field: 'risk_level',
      headerName: 'Risk Level',
      width: 120,
      renderCell: (params: GridRenderCellParams<Agent>) => (
        <Chip
          label={params.value}
          size="small"
          color={getRiskLevelColor(params.value) as any}
          icon={params.value === 'high' || params.value === 'critical' ? <WarningIcon /> : undefined}
        />
      ),
    },
    {
      field: 'last_transaction_at',
      headerName: 'Last Transaction',
      width: 180,
      valueFormatter: ({ value }) => value ? format(new Date(value), 'MMM d, yyyy HH:mm') : 'Never',
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams<Agent>) => (
        <Box>
          <Tooltip title="View Details">
            <IconButton
              size="small"
              onClick={() => navigate(`/agents/${params.row.id}`)}
            >
              <ViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              onClick={() => navigate(`/agents/${params.row.id}/config`)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={params.row.status === 'active' ? 'Suspend' : 'Activate'}>
            <IconButton
              size="small"
              color={params.row.status === 'active' ? 'error' : 'success'}
              onClick={() => handleStatusChange(params.row.id, params.row.status)}
            >
              {params.row.status === 'active' ? <BlockIcon /> : <ActiveIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const handleStatusChange = async (agentId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    updateStatusMutation.mutate({ id: agentId, status: newStatus as 'active' | 'inactive' });
  };

  if (isLoading) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => queryClient.invalidateQueries({ queryKey: ['agents'] })}>
              Retry
            </Button>
          }
        >
          Error loading agents: {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">AI Agents</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/agents/new')}
          >
            Create Agent
          </Button>
        </Box>

        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={agents}
            columns={columns}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            disableRowSelectionOnClick
            loading={isLoading}
            sx={{
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}; 