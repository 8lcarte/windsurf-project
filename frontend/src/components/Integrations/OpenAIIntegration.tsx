import React from 'react';
import {
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Alert,
  Button,
  TextField,
  Stack,
} from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';

export const OpenAIIntegration: React.FC = () => {
  return (
    <>
      <Box display="flex" alignItems="center" mb={3}>
        <AutoAwesome sx={{ fontSize: 40, mr: 2 }} />
        <Typography variant="h4">OpenAI Integration</Typography>
      </Box>

      <Typography variant="body1" paragraph>
        Add virtual card capabilities to your existing OpenAI assistants with just a few clicks. 
        Our platform seamlessly integrates with your assistants, enabling them to make secure payments within defined limits.
      </Typography>

      <Alert severity="info" sx={{ mb: 4 }}>
        To get started, you'll need your OpenAI Assistant ID. You can find this in your OpenAI dashboard under Assistants.
      </Alert>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Add a Virtual Card to Your Assistant
        </Typography>
        <Stack spacing={3} sx={{ mt: 2 }}>
          <TextField
            label="OpenAI Assistant ID"
            placeholder="asst_abc123..."
            fullWidth
            helperText="Enter your OpenAI Assistant ID"
          />
          <TextField
            label="Daily Spend Limit"
            type="number"
            placeholder="1000"
            fullWidth
            helperText="Maximum amount the assistant can spend per day"
          />
          <TextField
            label="Monthly Spend Limit"
            type="number"
            placeholder="5000"
            fullWidth
            helperText="Maximum amount the assistant can spend per month"
          />
          <TextField
            label="Allowed Merchant Categories"
            placeholder="retail, electronics, travel"
            fullWidth
            helperText="Comma-separated list of allowed merchant categories"
          />
          <Button 
            variant="contained" 
            size="large"
            sx={{ mt: 2 }}
          >
            Enable Virtual Card
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Using Virtual Cards in Your Assistant
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Once enabled, your assistant will have access to the make_payment function. Here's how to use it:
        </Typography>
        <Box
          component="pre"
          sx={{
            p: 2,
            backgroundColor: 'grey.900',
            color: 'grey.100',
            borderRadius: 1,
            overflow: 'auto',
          }}
        >
{`// Example conversation with your assistant
Human: I need to buy a new laptop from Best Buy for $899`}</Box>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Agent Capabilities
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Payment Processing"
              secondary="Make secure payments using virtual cards within defined limits"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Transaction Validation"
              secondary="Validate transactions against merchant and category restrictions"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Spending Analysis"
              secondary="Track and analyze spending patterns across merchants and categories"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Risk Assessment"
              secondary="Monitor risk levels and suspicious activity patterns"
            />
          </ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Security Features
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Spending Limits"
              secondary="Set daily and monthly spending limits for each agent"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Merchant Controls"
              secondary="Restrict transactions to specific merchants and categories"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Activity Monitoring"
              secondary="Track all agent activities and transactions in real-time"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Automatic Deactivation"
              secondary="Automatically disable agents that exceed risk thresholds"
            />
          </ListItem>
        </List>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Best Practices
        </Typography>
        <List>
          <ListItem>
            <ListItemText
              primary="Start Small"
              secondary="Begin with low spending limits and gradually increase based on performance"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Monitor Regularly"
              secondary="Review agent activities and spending patterns frequently"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Set Clear Rules"
              secondary="Define specific merchant categories and transaction types"
            />
          </ListItem>
          <ListItem>
            <ListItemText
              primary="Regular Updates"
              secondary="Keep agent configurations up to date with changing requirements"
            />
          </ListItem>
        </List>
      </Paper>
    </>
  );
}; 