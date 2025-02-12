import { FundingSource } from '../../hooks/useFundingSource';

// Mock funding sources data
export const mockFundingSources: FundingSource[] = [
  {
    id: 'paypal-1',
    provider: 'paypal',
    name: 'PayPal',
    connected: false,
    accountId: 'user@example.com',
    lastUsed: '2025-02-11T14:30:00Z'
  },
  {
    id: 'venmo-1',
    provider: 'venmo',
    name: 'Venmo',
    connected: false,
    accountId: '@johndoe',
    lastUsed: '2025-02-10T18:45:00Z'
  },
  {
    id: 'cashapp-1',
    provider: 'cashapp',
    name: 'Cash App',
    connected: false
  }
];
