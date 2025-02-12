import { http, HttpResponse } from 'msw';
import { mockFundingSources } from './data/fundingSources';

// Mock auth token check
const isAuthenticated = (req: any) => {
  const authHeader = req.headers.get('Authorization');
  return authHeader && authHeader.startsWith('Bearer ');
};

// Mock error response
const unauthorizedResponse = (ctx: any) => {
  return ctx.status(401);
};

// Mock notifications
const mockNotifications = [];


// Keep track of connection state
const connectedSources = new Set(['paypal-1', 'venmo-1']);

export const handlers = [
  // Get notifications
  http.get('*/api/v1/notifications', (req, res, ctx) => {
    if (!isAuthenticated(req)) return res(unauthorizedResponse(ctx));
    return res(
      ctx.delay(100),
      ctx.status(200),
      ctx.json(mockNotifications)
    );
  }),

  // Get funding sources
  http.get('*/api/v1/funding/sources', (req, res, ctx) => {
    if (!isAuthenticated(req)) return res(unauthorizedResponse(ctx));
    const sources = mockFundingSources.map(source => ({
      ...source,
      connected: connectedSources.has(source.id)
    }));
    
    return res(
      ctx.delay(500),
      ctx.status(200),
      ctx.json(sources)
    );
  }),

  // Connect funding source
  http.post('*/api/v1/funding/connect/:provider', (req, res, ctx) => {
    if (!isAuthenticated(req)) return res(unauthorizedResponse(ctx));
    const { provider } = req.params;
    const source = mockFundingSources.find(s => s.provider === provider);
    
    if (!source) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Provider not found' })
      );
    }

    // Add to connected sources
    connectedSources.add(source.id);
    
    return res(
      ctx.delay(200),
      ctx.status(200),
      ctx.json({
        url: `http://localhost:5173/mock-oauth/${provider}`,
        state: 'mock-state-token'
      })
    );
  }),

  // Disconnect funding source
  http.post('*/api/v1/funding/disconnect/:sourceId', (req, res, ctx) => {
    if (!isAuthenticated(req)) return res(unauthorizedResponse(ctx));
    const { sourceId } = req.params;
    connectedSources.delete(sourceId);
    
    return res(
      ctx.delay(200),
      ctx.status(200),
      ctx.json({ success: true })
    );
  }),

  // Get funding source balance
  http.get('*/api/v1/funding/:provider/:integrationId/balance', (req, res, ctx) => {
    if (!isAuthenticated(req)) return res(unauthorizedResponse(ctx));
    const { provider } = req.params;
    const source = mockFundingSources.find(s => s.provider === provider);
    
    if (!source?.connected) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Funding source not connected' })
      );
    }

    return res(
      ctx.delay(300),
      ctx.status(200),
      ctx.json({
        balance: source.balance,
        currency: 'USD',
        lastUpdated: new Date().toISOString()
      })
    );
  }),

  // Mock OAuth callback
  rest.get('*/mock-oauth/:provider', (req, res, ctx) => {
    const { provider } = req.params;
    const source = mockFundingSources.find(s => s.provider === provider);
    
    if (!source) {
      return res(
        ctx.status(404),
        ctx.json({ error: 'Provider not found' })
      );
    }

    // Update the source to connected state
    source.connected = true;
    
    return res(
      ctx.delay(500),
      ctx.status(200),
      ctx.json({ success: true })
    );
  }),
];
