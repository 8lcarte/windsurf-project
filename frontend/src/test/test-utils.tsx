import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { AuthContext } from '../contexts/AuthContext';

// Mock auth context values
const mockAuthContext = {
  getAccessToken: () => Promise.resolve('mock-token'),
  isAuthenticated: true,
  user: { id: 1, email: 'test@example.com' }
};

// Create a custom render function
export function renderWithProviders(
  ui: React.ReactElement,
  {
    route = '/',
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    }),
  } = {}
) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <AuthContext.Provider value={mockAuthContext}>
            {ui}
          </AuthContext.Provider>
        </SnackbarProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

// MSW handlers
export const handlers = [
  // Agents
  {
    url: '/api/v1/agents',
    method: 'GET',
    response: {
      success: true,
      data: [
        {
          id: 1,
          name: "Shopping Assistant",
          description: "AI assistant for shopping tasks",
          type: "shopping",
          status: "active",
          daily_spend_limit: 1000.00,
          current_daily_spend: 250.00,
          monthly_spend_limit: 5000.00,
          current_monthly_spend: 1000.00,
          total_transactions: 25,
          success_rate: 0.95,
          risk_level: "low",
          last_transaction_at: "2025-02-13T10:30:00Z",
          created_at: "2025-01-01T00:00:00Z",
          allowed_merchant_categories: ["retail", "groceries"],
          blocked_merchant_categories: ["gambling"],
          allowed_merchants: ["Amazon", "Walmart"],
          blocked_merchants: ["BlockedStore"]
        }
      ]
    }
  },
  
  // Monitoring metrics
  {
    url: '/api/v1/monitoring/metrics',
    method: 'GET',
    response: {
      success: true,
      data: {
        active_agents: 5,
        total_transactions: 150,
        success_rate: 0.95,
        average_response_time: 0.8,
        risk_distribution: {
          low: 80,
          medium: 15,
          high: 5
        }
      }
    }
  },
  
  // Alerts
  {
    url: '/api/v1/monitoring/alerts',
    method: 'GET',
    response: {
      success: true,
      data: [
        {
          id: 1,
          type: "risk_threshold",
          severity: "high",
          message: "Risk threshold exceeded",
          created_at: "2025-02-27T10:30:00Z",
          status: "active"
        }
      ]
    }
  },
  
  // Time series data
  {
    url: '/api/v1/monitoring/timeseries',
    method: 'GET',
    response: {
      success: true,
      data: {
        transaction_volume: [
          { timestamp: "2025-02-27T10:00:00Z", value: 10 },
          { timestamp: "2025-02-27T11:00:00Z", value: 15 }
        ],
        average_risk_score: [
          { timestamp: "2025-02-27T10:00:00Z", value: 0.2 },
          { timestamp: "2025-02-27T11:00:00Z", value: 0.3 }
        ]
      }
    }
  }
];

// Mock ResizeObserver
class ResizeObserverMock implements ResizeObserver {
  callback: ResizeObserverCallback;
  
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  
  observe(target: Element) {
    // Mock the observation
    this.callback([{
      target,
      contentRect: target.getBoundingClientRect(),
      borderBoxSize: [],
      contentBoxSize: [],
      devicePixelContentBoxSize: []
    }], this);
  }
  
  unobserve() {}
  disconnect() {}
}

// Install mocks
beforeAll(() => {
  global.ResizeObserver = ResizeObserverMock;
  
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});