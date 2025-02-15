import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AgentList } from '../../../components/Agents/AgentList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import type { Agent } from '../../../api/agents';
import { setupServer } from 'msw/node';
import type { SetupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Mock data
const mockAgents: Agent[] = [
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
    blocked_merchants: ["BlockedStore"],
    behavioral_patterns: [],
    risk_metrics: {
      amount_volatility: 0.1,
      merchant_diversity: 0.8,
      time_regularity: 0.9,
      success_rate: 0.95
    },
    recent_transactions: []
  },
  {
    id: 2,
    name: "Travel Agent",
    description: "AI assistant for travel bookings",
    type: "travel",
    status: "inactive",
    daily_spend_limit: 2000.00,
    current_daily_spend: 0.00,
    monthly_spend_limit: 10000.00,
    current_monthly_spend: 0.00,
    total_transactions: 0,
    success_rate: 0.80,
    risk_level: "medium",
    last_transaction_at: "2025-02-13T10:30:00Z",
    created_at: "2025-01-01T00:00:00Z",
    allowed_merchant_categories: ["travel", "accommodation"],
    blocked_merchant_categories: [],
    allowed_merchants: [],
    blocked_merchants: [],
    behavioral_patterns: [],
    risk_metrics: {
      amount_volatility: 0,
      merchant_diversity: 0,
      time_regularity: 0,
      success_rate: 0.8
    },
    recent_transactions: []
  }
];

// Setup MSW server
const server: SetupServer = setupServer(
  http.get('/api/v1/agents', () => {
    return HttpResponse.json({ success: true, data: mockAgents });
  }),

  http.patch('/api/v1/agents/:id', async ({ request }) => {
    const body = await request.json() as { status: string };
    return HttpResponse.json({ 
      success: true, 
      data: { ...mockAgents[0], status: body.status }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock AuthContext
const mockAuthContext = {
  getAccessToken: () => Promise.resolve('mock-token'),
  isAuthenticated: true,
  user: { id: 1, email: 'test@example.com' }
};

// Mock the AuthContext module
vi.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children
  }
}));

// Test setup helper
const renderAgentList = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <AgentList />
        </SnackbarProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('AgentList Component', () => {
  test('renders loading state initially', () => {
    renderAgentList();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders agents data after loading', async () => {
    renderAgentList();
    
    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
      expect(screen.getByText('Travel Agent')).toBeInTheDocument();
    });
    
    // Check status chips
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('inactive')).toBeInTheDocument();
  });

  test('handles error state', async () => {
    server.use(
      http.get('/api/v1/agents', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderAgentList();

    await waitFor(() => {
      expect(screen.getByText(/error loading agents/i)).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  test('updates agent status', async () => {
    renderAgentList();

    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
    });

    const statusButton = screen.getAllByRole('button')[2];
    fireEvent.click(statusButton);

    await waitFor(() => {
      expect(screen.getByText('Agent status updated successfully')).toBeInTheDocument();
    });
  });

  test('displays spend tracking correctly', async () => {
    renderAgentList();

    await waitFor(() => {
      expect(screen.getByText('$250.00 / $1000.00')).toBeInTheDocument();
    });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
  });

  test('displays risk levels with correct colors', async () => {
    renderAgentList();

    await waitFor(() => {
      const lowRiskChip = screen.getByText('low');
      const mediumRiskChip = screen.getByText('medium');
      
      expect(lowRiskChip).toHaveClass('MuiChip-colorSuccess');
      expect(mediumRiskChip).toHaveClass('MuiChip-colorWarning');
    });
  });

  test('creates new agent', async () => {
    renderAgentList();

    await waitFor(() => {
      expect(screen.getByText('AI Agents')).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create agent/i });
    fireEvent.click(createButton);

    expect(window.location.pathname).toBe('/agents/new');
  });
});