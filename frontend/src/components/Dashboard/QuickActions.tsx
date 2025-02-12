import { Button, Stack } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Add as AddIcon,
  CreditCard as CreditCardIcon,
  Settings as SettingsIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
  {
    label: 'Create Virtual Card',
    icon: <AddIcon />,
    color: 'primary',
    onClick: () => navigate('/virtual-cards/create'),
  },
  {
    label: 'Manage Templates',
    icon: <DescriptionIcon />,
    color: 'secondary',
    onClick: () => navigate('/virtual-cards/templates'),
  },
  {
    label: 'Card Settings',
    icon: <SettingsIcon />,
    color: 'info',
    onClick: () => navigate('/virtual-cards/settings'),
  },
  {
    label: 'View All Cards',
    icon: <CreditCardIcon />,
    color: 'success',
    onClick: () => navigate('/virtual-cards'),
  },
] as const;

  return (
    <Stack spacing={1}>
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
            px: 1.5,
            py: 0.75,
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
