import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { AgentList } from '../components/Agents/AgentList';

export const AgentsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center" justifyContent="space-between">
          <Grid item>
            <Typography variant="h4" gutterBottom>
              Agent Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your AI agents and their payment capabilities
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate('/agents/new')}
            >
              Create Agent
            </Button>
          </Grid>
        </Grid>
      </Box>

      <Paper sx={{ p: 2 }}>
        <AgentList />
      </Paper>
    </Container>
  );
}; 