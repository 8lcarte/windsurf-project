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
  agent_instance_id: string;
  end_user_id: string;
  [key: string]: any;
}

interface AgentInfoPanelProps {
  metadata?: AgentMetadata;
}

export function AgentInfoPanel({ metadata }: AgentInfoPanelProps) {
  if (!metadata?.agent_type) {
    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          This card is not associated with any agent
        </Typography>
      </Paper>
    );
  }

  const getAgentTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      shopping_assistant: 'primary',
      travel_agent: 'secondary',
      procurement_agent: 'success',
      subscription_manager: 'info',
    };
    return colors[type] || 'default';
  };

  const formatAgentType = (type: string) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getAdditionalInfo = () => {
    switch (metadata.agent_type) {
      case 'shopping_assistant':
        return metadata.items_in_cart ? 
          `Items in cart: ${metadata.items_in_cart}` : null;
      case 'travel_agent':
        return metadata.trip_id ? 
          `Trip ID: ${metadata.trip_id}` : null;
      case 'procurement_agent':
        return metadata.department ? 
          `Department: ${metadata.department}` : null;
      case 'subscription_manager':
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
          label={formatAgentType(metadata.agent_type)}
          color={getAgentTypeColor(metadata.agent_type)}
          sx={{ mb: 1 }}
        />
      </Box>
      
      <List dense>
        <ListItem>
          <ListItemIcon>
            <InstanceIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Instance ID"
            secondary={metadata.agent_instance_id}
          />
        </ListItem>
        
        <ListItem>
          <ListItemIcon>
            <UserIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="End User"
            secondary={metadata.end_user_id}
          />
        </ListItem>
        
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
