import { useState } from 'react';
import {
  Box,
  Container,
  Tab,
  Tabs,
  Typography,
  Paper,
} from '@mui/material';
import { ApiDocumentation } from '../components/Settings/ApiDocumentation';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `settings-tab-${index}`,
    'aria-controls': `settings-tabpanel-${index}`,
  };
}

export function SettingsPage() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="settings tabs"
            sx={{ px: 2 }}
          >
            <Tab label="General" {...a11yProps(0)} />
            <Tab label="API Documentation" {...a11yProps(1)} />
            <Tab label="Notifications" {...a11yProps(2)} />
            <Tab label="Security" {...a11yProps(3)} />
          </Tabs>
        </Box>
        <TabPanel value={value} index={0}>
          <Typography variant="h6">General Settings</Typography>
          {/* Add general settings components here */}
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ApiDocumentation />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <Typography variant="h6">Notification Settings</Typography>
          {/* Add notification settings components here */}
        </TabPanel>
        <TabPanel value={value} index={3}>
          <Typography variant="h6">Security Settings</Typography>
          {/* Add security settings components here */}
        </TabPanel>
      </Paper>
    </Container>
  );
}
