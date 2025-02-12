import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  SmartToy as AgentIcon,
  Person as UserIcon,
  Category as TypeIcon,
  AccountTree as InstanceIcon,
} from '@mui/icons-material';

interface AgentMetadata {
  agent_type: string;
  agent_name?: string;
  agent_description?: string;
  agent_instance_id?: string;
  end_user_id?: string;
  department?: string;
  [key: string]: any;
}

interface AgentInfoPanelProps {
  metadata?: AgentMetadata;
}

export function AgentInfoPanel({ metadata }: AgentInfoPanelProps) {
  if (!metadata?.agent_name) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          This card is not associated with any agent
        </Typography>
      </Paper>
    );
  }

  const getAgentNameColor = (name: string) => {
    const colors: { [key: string]: string } = {
      'AWS Cost Manager': 'success',
      'SaaS Subscription Manager': 'info',
    };
    return colors[name] || 'default';
  };

  const formatAgentType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getAdditionalInfo = () => {
    switch (metadata.agent_name) {
      case 'AWS Cost Manager':
        return metadata.department ? 
          `Department: ${metadata.department}` : null;
      case 'SaaS Subscription Manager':
        return metadata.billing_cycle ? 
          `Billing Cycle: ${metadata.billing_cycle}` : null;
      default:
        return null;
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Agent Information
        </Typography>
        <Chip
          icon={<AgentIcon />}
          label={metadata.agent_name}
          color={getAgentNameColor(metadata.agent_name || '')}
          sx={{ mb: 1 }}
        />
        {metadata.agent_description && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {metadata.agent_description}
          </Typography>
        )}
      </Box>
      
      <List dense>
        {metadata.agent_instance_id && (
          <ListItem>
            <ListItemIcon>
              <InstanceIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Instance ID"
              secondary={metadata.agent_instance_id}
            />
          </ListItem>
        )}
        
        {metadata.end_user_id && (
          <ListItem>
            <ListItemIcon>
              <UserIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="End User"
              secondary={metadata.end_user_id}
            />
          </ListItem>
        )}
        
        {getAdditionalInfo() && (
          <>
            <Divider sx={{ my: 1 }} />
            <ListItem>
              <ListItemIcon>
                <TypeIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Additional Info"
                secondary={getAdditionalInfo()}
              />
            </ListItem>
          </>
        )}
      </List>
    </Paper>
  );
}
