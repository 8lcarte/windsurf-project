import { Button, Stack } from '@mui/material';
import {
  Add as AddIcon,
  CreditCard as CreditCardIcon,
  Settings as SettingsIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';

const actions = [
  {
    label: 'Create Virtual Card',
    icon: <AddIcon />,
    color: 'primary',
    onClick: () => console.log('Create card clicked'),
  },
  {
    label: 'Manage Templates',
    icon: <DescriptionIcon />,
    color: 'secondary',
    onClick: () => console.log('Manage templates clicked'),
  },
  {
    label: 'Card Settings',
    icon: <SettingsIcon />,
    color: 'info',
    onClick: () => console.log('Card settings clicked'),
  },
  {
    label: 'View All Cards',
    icon: <CreditCardIcon />,
    color: 'success',
    onClick: () => console.log('View all cards clicked'),
  },
] as const;

export function QuickActions() {
  return (
    <Stack spacing={2}>
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outlined"
          color={action.color}
          startIcon={action.icon}
          onClick={action.onClick}
          fullWidth
          sx={{
            justifyContent: 'flex-start',
            px: 2,
            py: 1,
            '& .MuiButton-startIcon': {
              mr: 2,
            },
          }}
        >
          {action.label}
        </Button>
      ))}
    </Stack>
  );
}
