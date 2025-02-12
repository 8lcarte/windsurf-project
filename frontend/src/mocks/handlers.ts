import { http, HttpResponse, PathParams } from 'msw';
import { mockFundingSources } from './data/fundingSources';

interface Notification {
  id: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest extends LoginRequest {
  fullName: string;
}

interface VirtualCard {
  id: string;
  userId: string;
  customerId: string;
  name: string;
  number: string;
  lastFour: string;
  expiryDate: string;
  cvv: string;
  status: 'active' | 'inactive' | 'frozen' | 'expired';
  balance: number;
  spendLimit: number;
  frozen: boolean;
  transactions: any[];
  merchantControls: {
    allowedCategories: string[];
    blockedCategories: string[];
  };
  metadata: {
    agent_name: string;
    agent_type: string;
    department: string;
  };
  createdAt: string;
}

interface Agent {
  id: number;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  type: string;
  daily_spend_limit: number;
  current_daily_spend: number;
  monthly_spend_limit: number;
  current_monthly_spend: number;
  total_transactions: number;
  success_rate: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  last_transaction_at: string;
  created_at: string;
}

// Add FundingSource interface
interface FundingSource {
  id: string;
  name: string;
  provider: 'paypal' | 'venmo' | 'cashapp';
  connected: boolean;
  accountId?: string;
  lastUsed?: string;
  balance?: number;  // Add balance field
}

// Add storage utility
const storage = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem('token');
    } catch (e) {
      console.warn('Failed to access localStorage');
      return null;
    }
  },
  setToken: (token: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('token', token);
    } catch (e) {
      console.warn('Failed to access localStorage');
    }
  },
  removeToken: () => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem('token');
    } catch (e) {
      console.warn('Failed to access localStorage');
    }
  }
};

// Mock auth token check
const isAuthenticated = (req: any) => {
  const authHeader = req.headers.get('Authorization');
  console.debug('Auth header:', authHeader);
  
  if (!authHeader) {
    console.debug('No Authorization header found');
    return false;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    console.debug('Authorization header does not start with Bearer');
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '').trim();
  console.debug('Token from header:', token);
  
  // Check if it's a valid mock token format
  if (!token.startsWith('mock_token_')) {
    console.debug('Token is not in mock_token format');
    return false;
  }
  
  return true;
};

// Mock error response
const unauthorizedResponse = () => {
  return new HttpResponse(null, { status: 401 });
};

// Mock notifications
const mockNotifications: Notification[] = [];

// Keep track of connection state
const connectedSources = new Set(['paypal-1', 'venmo-1']);

// Mock data
const mockVirtualCards: VirtualCard[] = [
  {
    id: '1',
    userId: '1',
    customerId: 'cust_123',
    name: 'Shopping Assistant Card',
    number: '4242424242424242',
    lastFour: '4242',
    expiryDate: '12/25',
    cvv: '123',
    status: 'active',
    balance: 4500,
    spendLimit: 5000,
    frozen: false,
    transactions: [],
    merchantControls: {
      allowedCategories: ['retail', 'electronics'],
      blockedCategories: [],
    },
    metadata: {
      agent_name: 'Shopping AI',
      agent_type: 'shopping_assistant',
      department: 'Procurement'
    },
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    userId: '1',
    customerId: 'cust_124',
    name: 'Travel Booking Card',
    number: '4242424242428888',
    lastFour: '8888',
    expiryDate: '03/26',
    cvv: '456',
    status: 'active',
    balance: 9000,
    spendLimit: 10000,
    frozen: false,
    transactions: [
      {
        id: '1',
        date: new Date().toISOString(),
        merchantName: 'United Airlines',
        amount: 500,
        status: 'completed',
        category: 'travel',
        description: 'Flight booking',
        type: 'debit'
      }
    ],
    merchantControls: {
      allowedCategories: ['travel', 'lodging', 'transportation'],
      blockedCategories: [],
    },
    metadata: {
      agent_name: 'Travel AI',
      agent_type: 'travel_agent',
      department: 'Travel'
    },
    createdAt: new Date().toISOString()
  }
];

const mockAgents: Agent[] = [
  {
    id: 1,
    name: 'Shopping AI',
    status: 'active',
    type: 'shopping_assistant',
    daily_spend_limit: 1000,
    current_daily_spend: 250,
    monthly_spend_limit: 20000,
    current_monthly_spend: 5000,
    total_transactions: 25,
    success_rate: 0.96,
    risk_level: 'low',
    last_transaction_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Travel AI',
    status: 'active',
    type: 'travel_agent',
    daily_spend_limit: 5000,
    current_daily_spend: 1200,
    monthly_spend_limit: 50000,
    current_monthly_spend: 15000,
    total_transactions: 12,
    success_rate: 0.92,
    risk_level: 'medium',
    last_transaction_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  }
];

interface VirtualCardCreateRequest {
  name: string;
  spendLimit: number;
  allowedCategories?: string[];
  blockedCategories?: string[];
  agentName?: string;
  agentType?: string;
  department?: string;
}

interface AgentCreateRequest {
  name: string;
  description: string;
  type: string;
  status?: 'active' | 'inactive' | 'suspended';
  daily_spend_limit: number;
  monthly_spend_limit: number;
  allowed_merchant_categories?: string[];
  blocked_merchant_categories?: string[];
}

export const handlers = [
  // Get notifications
  http.get('*/api/v1/notifications', ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    return HttpResponse.json({ success: true, data: mockNotifications }, { status: 200 });
  }),

  // Mark notification as read
  http.patch<PathParams, { id: string }>('*/api/v1/notifications/:id/read', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const notification = mockNotifications.find(n => n.id === params.id);
    if (!notification) {
      return HttpResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    notification.read = true;
    return HttpResponse.json({ success: true, data: notification }, { status: 200 });
  }),

  // Delete notification
  http.delete<PathParams, { id: string }>('*/api/v1/notifications/:id', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const index = mockNotifications.findIndex(n => n.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    mockNotifications.splice(index, 1);
    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // Auth endpoints
  http.post('*/api/v1/auth/register', async ({ request }) => {
    const data = await request.json() as RegisterRequest;
    const mockUser = {
      id: '1',
      email: data.email,
      fullName: data.fullName,
    };
    const token = `mock_token_${data.email}`;
    storage.setToken(token);  // Store the token in localStorage
    return HttpResponse.json({
      success: true,
      data: {
        token,
        user: mockUser
      }
    }, { status: 200 });
  }),

  http.post('*/api/v1/auth/login', async ({ request }) => {
    const data = await request.json() as LoginRequest;
    const mockUser = {
      id: '1',
      email: data.email,
      fullName: 'Test User',
    };
    const token = `mock_token_${data.email}`;
    storage.setToken(token);  // Store the token in localStorage
    return HttpResponse.json({
      success: true,
      data: {
        token,
        user: mockUser
      }
    }, { status: 200 });
  }),

  http.get('*/api/v1/auth/me', ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    
    // Extract email from token
    const token = request.headers.get('Authorization')?.replace('Bearer mock_token_', '') || '';
    const mockUser = {
      id: '1',
      email: token,
      fullName: 'Test User',
    };
    
    return HttpResponse.json({
      success: true,
      data: {
        user: mockUser
      }
    }, { status: 200 });
  }),

  // Get funding sources
  http.get('*/api/v1/funding/sources', ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const sources = mockFundingSources.map(source => ({
      ...source,
      connected: connectedSources.has(source.id)
    }));
    
    return HttpResponse.json(sources, { status: 200 });
  }),

  // Connect funding source
  http.post('*/api/v1/funding/connect/:provider', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const provider = params.provider;
    const source = mockFundingSources.find(s => s.provider === provider);
    
    if (!source) {
      return HttpResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Add to connected sources
    connectedSources.add(source.id);
    
    return HttpResponse.json({
      url: `http://localhost:5173/mock-oauth/${provider}`,
      state: 'mock-state-token'
    }, { status: 200 });
  }),

  // Disconnect funding source
  http.post('*/api/v1/funding/disconnect/:sourceId', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const sourceId = params.sourceId as string;
    if (!sourceId) {
      return HttpResponse.json({ error: 'Source ID is required' }, { status: 400 });
    }
    connectedSources.delete(sourceId);
    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // Get funding source balance
  http.get<PathParams, { provider: string }>('*/api/v1/funding/:provider/:integrationId/balance', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    
    const source = mockFundingSources.find(s => s.provider === params.provider) as FundingSource & { balance: number };
    
    if (!source?.connected) {
      return HttpResponse.json({ error: 'Funding source not connected' }, { status: 404 });
    }

    // Mock balance data
    const mockBalance = 1000;

    return HttpResponse.json({
      balance: mockBalance,
      currency: 'USD',
      lastUpdated: new Date().toISOString()
    }, { status: 200 });
  }),

  // Mock OAuth callback
  http.get('*/mock-oauth/:provider', ({ params }) => {
    const source = mockFundingSources.find(s => s.provider === params.provider);
    
    if (!source) {
      return HttpResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Update the source to connected state
    source.connected = true;
    
    return HttpResponse.json({ success: true }, { status: 200 });
  }),

  // Virtual Cards endpoints
  http.get('*/api/v1/virtual-cards', ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    return HttpResponse.json({ 
      success: true,
      data: mockVirtualCards 
    }, { status: 200 });
  }),

  http.get('*/api/v1/virtual-cards/:id', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const card = mockVirtualCards.find(c => c.id === params.id);
    if (!card) {
      return HttpResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    return HttpResponse.json({ 
      success: true,
      data: card 
    }, { status: 200 });
  }),

  // Add POST endpoint for creating virtual cards
  http.post('*/api/v1/virtual-cards', async ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    
    const data = await request.json() as VirtualCardCreateRequest;
    const newCard: VirtualCard = {
      id: `${mockVirtualCards.length + 1}`,
      userId: '1',
      customerId: `cust_${Date.now()}`,
      name: data.name,
      number: '4242424242424242',
      lastFour: '4242',
      expiryDate: '12/25',
      cvv: '123',
      status: 'active',
      balance: data.spendLimit,
      spendLimit: data.spendLimit,
      frozen: false,
      transactions: [],
      merchantControls: {
        allowedCategories: data.allowedCategories || [],
        blockedCategories: data.blockedCategories || [],
      },
      metadata: {
        agent_name: data.agentName || '',
        agent_type: data.agentType || '',
        department: data.department || ''
      },
      createdAt: new Date().toISOString()
    };
    
    mockVirtualCards.push(newCard);
    
    return HttpResponse.json({
      success: true,
      data: newCard
    }, { status: 200 });
  }),

  // Agents endpoints
  http.get('*/api/v1/agents', ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    return HttpResponse.json({ success: true, data: mockAgents }, { status: 200 });
  }),

  http.post('*/api/v1/agents', async ({ request }) => {
    // Check authentication
    if (!isAuthenticated(request)) {
      console.log('Unauthorized request - no valid token found');
      return unauthorizedResponse();
    }
    
    try {
      const data = await request.json() as AgentCreateRequest;
      const newAgent: Agent = {
        id: mockAgents.length + 1,
        name: data.name,
        status: data.status || 'active',
        type: data.type,
        daily_spend_limit: data.daily_spend_limit,
        current_daily_spend: 0,
        monthly_spend_limit: data.monthly_spend_limit,
        current_monthly_spend: 0,
        total_transactions: 0,
        success_rate: 1.0,
        risk_level: 'low',
        last_transaction_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      
      mockAgents.push(newAgent);
      
      return HttpResponse.json({
        success: true,
        data: newAgent
      }, { status: 200 });
    } catch (error) {
      console.error('Error creating agent:', error);
      return HttpResponse.json({ 
        success: false, 
        error: 'Failed to create agent' 
      }, { status: 500 });
    }
  }),

  http.get('*/api/v1/agents/:id', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const agent = mockAgents.find(a => a.id === Number(params.id));
    if (!agent) {
      return HttpResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true, data: agent }, { status: 200 });
  }),
];
