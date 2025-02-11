import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { PayPalIntegration } from '../integrations/providers/paypal';
import { VenmoIntegration } from '../integrations/providers/venmo';
import { CashAppIntegration } from '../integrations/providers/cashapp';
import { IntegrationManager } from '../integrations/integrationManager';

export const router = Router();

// Initialize integrations
const integrationManager = IntegrationManager.getInstance();

// Default funding sources that are always available
const defaultSources = [
  {
    id: 'paypal',
    provider: 'paypal',
    connected: false,
    name: 'PayPal'
  },
  {
    id: 'venmo',
    provider: 'venmo',
    connected: false,
    name: 'Venmo'
  },
  {
    id: 'cashapp',
    provider: 'cashapp',
    connected: false,
    name: 'Cash App'
  }
];

// Get all funding sources for the authenticated user
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const connectedSources = await integrationManager.getFundingSources(userId);
    
    // Merge connected sources with default sources
    const allSources = defaultSources.map(defaultSource => {
      const connectedSource = connectedSources.find(s => s.provider === defaultSource.provider);
      return connectedSource || defaultSource;
    });
    
    res.json(allSources);
  } catch (error) {
    console.error('Error fetching funding sources:', error);
    res.status(500).json({ message: 'Failed to fetch funding sources' });
  }
});

// Start OAuth connection flow for a funding source
router.post('/connect/:provider', authenticate, async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    let authUrl: string;
    const state = `${userId}_${Date.now()}`;

    switch (provider.toLowerCase()) {
      case 'paypal':
        authUrl = await integrationManager.getPayPalAuthUrl(state);
        break;
      case 'venmo':
        authUrl = await integrationManager.getVenmoAuthUrl(state);
        break;
      case 'cashapp':
        authUrl = await integrationManager.getCashAppAuthUrl(state);
        break;
      default:
        return res.status(400).json({ message: 'Invalid provider' });
    }

    res.json({ url: authUrl, state });
  } catch (error) {
    console.error('Error initiating OAuth flow:', error);
    res.status(500).json({ message: 'Failed to initiate OAuth flow' });
  }
});

// OAuth callback handler
router.get('/callback/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;

    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).json({ message: 'Invalid callback parameters' });
    }

    const [userId] = state.split('_');

    switch (provider.toLowerCase()) {
      case 'paypal':
        await integrationManager.handlePayPalCallback(code, userId);
        break;
      case 'venmo':
        await integrationManager.handleVenmoCallback(code, userId);
        break;
      case 'cashapp':
        await integrationManager.handleCashAppCallback(code, userId);
        break;
      default:
        return res.status(400).json({ message: 'Invalid provider' });
    }

    // Close the popup window and notify the parent window
    res.send(`
      <script>
        window.opener.postMessage({ type: 'OAUTH_SUCCESS', provider: '${provider}' }, '*');
        window.close();
      </script>
    `);
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.status(500).send(`
      <script>
        window.opener.postMessage({ type: 'OAUTH_ERROR', error: 'Failed to complete OAuth flow' }, '*');
        window.close();
      </script>
    `);
  }
});

// Disconnect a funding source
router.delete('/:sourceId', authenticate, async (req, res) => {
  try {
    const { sourceId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    await integrationManager.disconnectFundingSource(sourceId, userId);
    res.json({ message: 'Funding source disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting funding source:', error);
    res.status(500).json({ message: 'Failed to disconnect funding source' });
  }
});

export const fundingSourcesRouter = router;
