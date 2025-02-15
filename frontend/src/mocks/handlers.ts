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
  description: string;
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
  allowed_merchant_categories: string[];
  blocked_merchant_categories: string[];
  allowed_merchants: string[];
  blocked_merchants: string[];
  behavioral_patterns: Array<{
    type: string;
    description: string;
    confidence: number;
    detected_at: string;
  }>;
  risk_metrics: {
    amount_volatility: number;
    merchant_diversity: number;
    geographic_spread: number;
    time_pattern_consistency: number;
    transaction_frequency: number;
  };
  recent_transactions: Array<{
    id: number;
    amount: number;
    merchant_name: string;
    merchant_category: string;
    status: string;
    risk_level: string;
    created_at: string;
  }>;
}

interface FundingSource {
  id: string;
  name: string;
  provider: 'paypal' | 'venmo' | 'cashapp';
  connected: boolean;
  accountId?: string;
  lastUsed?: string;
  balance?: number;
}

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
  if (!authHeader) return false;
  if (!authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.replace('Bearer ', '').trim();
  const parts = token.split('.');
  return parts.length === 3;
};

// Mock error response
const unauthorizedResponse = () => {
  return new HttpResponse(null, { status: 401 });
};

// Mock data
const mockNotifications: Notification[] = [];
const connectedSources = new Set(['paypal-1', 'venmo-1']);

// Mock agents
const getStoredAgents = () => {
  try {
    const storedAgents = localStorage.getItem('mockAgents');
    if (storedAgents) {
      return JSON.parse(storedAgents) as Agent[];
    }
  } catch (e) {
    console.warn('Failed to get stored agents');
  }
  return [

  {
    id: 1,
    name: 'Payment Processor',
    description: 'Handles payment processing and validation',
    status: 'active',
    type: 'payment',
    daily_spend_limit: 1000,
    current_daily_spend: 250,
    monthly_spend_limit: 25000,
    current_monthly_spend: 5000,
    total_transactions: 150,
    success_rate: 98.5,
    risk_level: 'low',
    last_transaction_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    allowed_merchant_categories: ['retail', 'software'],
    blocked_merchant_categories: ['gambling'],
    allowed_merchants: ['Amazon', 'Microsoft'],
    blocked_merchants: [],
    behavioral_patterns: [
      {
        type: 'spending_pattern',
        description: 'Regular business hours transactions',
        confidence: 0.95,
        detected_at: new Date().toISOString()
      }
    ],
    risk_metrics: {
      amount_volatility: 0.2,
      merchant_diversity: 0.7,
      geographic_spread: 0.3,
      time_pattern_consistency: 0.9,
      transaction_frequency: 0.6
    },
    recent_transactions: [
      {
        id: 1,
        amount: 150.00,
        merchant_name: 'Amazon Web Services',
        merchant_category: 'software',
        status: 'completed',
        risk_level: 'low',
        created_at: new Date().toISOString()
      }
    ]
  }
];
};

const mockAgents = getStoredAgents();

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
  }
];

export const handlers = [
  // Auth endpoints
  http.post('*/api/v1/auth/register', async ({ request }) => {
    const data: RegisterRequest = await request.json();
    if (data.email === 'taken@example.com') {
      return new HttpResponse(null, {
        status: 400,
        statusText: 'Email already registered',
      });
    }

    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzM5NDA2ODAzLCJleHAiOjE3Mzk0OTMyMDN9.-64vgGGPUVfVk8TpYaZ6-DYXTnerufHj3lm09vm_kw0';
    storage.setToken(token);

    return HttpResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: '1',
          email: data.email,
          fullName: data.fullName
        }
      }
    });
  }),

  http.post('*/api/v1/auth/login', async ({ request }) => {
    const data: LoginRequest = await request.json();
    if (data.email === 'error@example.com') {
      return new HttpResponse(null, {
        status: 401,
        statusText: 'Invalid credentials',
      });
    }

    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNzM5NDA2ODAzLCJleHAiOjE3Mzk0OTMyMDN9.-64vgGGPUVfVk8TpYaZ6-DYXTnerufHj3lm09vm_kw0';
    storage.setToken(token);

    return HttpResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: '1',
          email: data.email,
          fullName: 'Test User'
        }
      }
    });
  }),

  http.get('*/api/v1/auth/me', ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const token = request.headers.get('Authorization')?.replace('Bearer mock_token_', '') || '';
    return HttpResponse.json({
      success: true,
      data: {
        user: {
          id: '1',
          email: token || 'test@example.com',
          fullName: 'Test User'
        }
      }
    });
  }),

  // Agent endpoints
  http.get('/api/v1/agents', ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    return HttpResponse.json({ success: true, data: mockAgents });
  }),

  http.get('/api/v1/agents/:id', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const agent = mockAgents.find(a => a.id === Number(params.id));
    if (!agent) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ success: true, data: agent });
  }),

  http.post('/api/v1/agents', async ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();

    const data: AgentCreateRequest = await request.json();
    const newAgent: Agent = {
      id: mockAgents.length + 1,
      name: data.name,
      description: data.description,
      status: data.status || 'active',
      type: data.type,
      daily_spend_limit: data.daily_spend_limit,
      current_daily_spend: 0,
      monthly_spend_limit: data.monthly_spend_limit,
      current_monthly_spend: 0,
      total_transactions: 0,
      success_rate: 100,
      risk_level: 'low',
      last_transaction_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      allowed_merchant_categories: data.allowed_merchant_categories || [],
      blocked_merchant_categories: data.blocked_merchant_categories || [],
      allowed_merchants: [],
      blocked_merchants: [],
      behavioral_patterns: [],
      risk_metrics: {
        amount_volatility: 0,
        merchant_diversity: 0,
        geographic_spread: 0,
        time_pattern_consistency: 1,
        transaction_frequency: 0
      },
      recent_transactions: []
    };

    mockAgents.push(newAgent);
    try {
      localStorage.setItem('mockAgents', JSON.stringify(mockAgents));
    } catch (e) {
      console.warn('Failed to store agents');      
    }
    return HttpResponse.json({ success: true, data: newAgent }, { status: 201 });
  }),

  // Notification endpoints
  http.get('*/api/v1/notifications', ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    return HttpResponse.json({ success: true, data: mockNotifications });
  }),

  http.patch<PathParams, { id: string }>('*/api/v1/notifications/:id/read', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const notification = mockNotifications.find(n => n.id === params.id);
    if (!notification) {
      return HttpResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    notification.read = true;
    return HttpResponse.json({ success: true, data: notification });
  }),

  http.delete<PathParams, { id: string }>('*/api/v1/notifications/:id', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const index = mockNotifications.findIndex(n => n.id === params.id);
    if (index === -1) {
      return HttpResponse.json({ error: 'Notification not found' }, { status: 404 });
    }
    mockNotifications.splice(index, 1);
    return HttpResponse.json({ success: true });
  }),

  // Funding endpoints
  http.get('*/api/v1/funding/sources', ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const sources = mockFundingSources.map(source => ({
      ...source,
      connected: connectedSources.has(source.id)
    }));
    return HttpResponse.json(sources);
  }),

  http.post('*/api/v1/funding/connect/:provider', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const provider = params.provider;
    const source = mockFundingSources.find(s => s.provider === provider);
    if (!source) {
      return HttpResponse.json({ error: 'Provider not found' }, { status: 404 });
    }
    connectedSources.add(source.id);
    return HttpResponse.json({
      url: `http://localhost:5173/mock-oauth/${provider}`,
      state: 'mock-state-token'
    });
  }),

  http.post('*/api/v1/funding/disconnect/:sourceId', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const sourceId = params.sourceId as string;
    if (!sourceId) {
      return HttpResponse.json({ error: 'Source ID is required' }, { status: 400 });
    }
    connectedSources.delete(sourceId);
    return HttpResponse.json({ success: true });
  }),

  http.get<PathParams, { provider: string }>('*/api/v1/funding/:provider/:integrationId/balance', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const source = mockFundingSources.find(s => s.provider === params.provider);
    if (!source?.connected) {
      return HttpResponse.json({ error: 'Funding source not connected' }, { status: 404 });
    }
    return HttpResponse.json({
      balance: 1000,
      currency: 'USD',
      lastUpdated: new Date().toISOString()
    });
  }),

  // Virtual Cards endpoints
  http.get('*/api/v1/virtual-cards', ({ request }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    return HttpResponse.json({ success: true, data: mockVirtualCards });
  }),

  http.get('*/api/v1/virtual-cards/:id', ({ request, params }) => {
    if (!isAuthenticated(request)) return unauthorizedResponse();
    const card = mockVirtualCards.find(c => c.id === params.id);
    if (!card) {
      return HttpResponse.json({ error: 'Card not found' }, { status: 404 });
    }
    return HttpResponse.json({ success: true, data: card });
  }),

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
    return HttpResponse.json({ success: true, data: newCard });
  })
];
