import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { AgentList } from '../../components/Agents/AgentList';
import { MonitoringDashboard } from '../../components/Monitoring/MonitoringDashboard';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { AuthContext } from '../../contexts/AuthContext';

// Mock data
const mockAgents = [
  {
    id: 1,
    name: "Shopping Assistant",
    status: "active",
    type: "shopping",
    daily_spend_limit: 1000.00,
    current_daily_spend: 250.00,
    success_rate: 0.95,
    risk_level: "low"
  },
  {
    id: 2,
    name: "Travel Agent",
    status: "inactive",
    type: "travel",
    daily_spend_limit: 2000.00,
    current_daily_spend: 0.00,
    success_rate: 0.80,
    risk_level: "medium"
  }
];

const mockMetrics = {
  active_agents: 1,
  total_transactions: 150,
  success_rate: 0.95,
  average_response_time: 0.8,
  risk_distribution: {
    low: 80,
    medium: 15,
    high: 5
  }
};

const mockAlerts = [
  {
    id: 1,
    agent_id: 1,
    type: "risk_threshold",
    severity: "high",
    message: "Risk threshold exceeded",
    created_at: "2025-02-27T10:30:00Z"
  }
];

// Mock AuthContext
const mockAuthContext = {
  getAccessToken: () => Promise.resolve('mock-token'),
  isAuthenticated: true,
  user: { id: 1, email: 'test@example.com' }
};

// Setup MSW server
const server = setupServer(
  http.get('http://localhost:3001/v1/agents', () => {
    return HttpResponse.json({ success: true, data: mockAgents });
  }),
  http.options('http://localhost:3001/v1/agents', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  http.patch('http://localhost:3001/v1/agents/:id', ({ params }) => {
    const agentId = Number(params.id);
    // Update the agent status in the mock data
    const updatedAgent = mockAgents.find(agent => agent.id === agentId);
    if (updatedAgent) {
      updatedAgent.status = updatedAgent.status === 'active' ? 'inactive' : 'active';
    }
    return HttpResponse.json({ success: true, data: updatedAgent });
  }),
  http.options('http://localhost:3001/v1/agents/:id', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  http.get('http://localhost:3001/v1/monitoring/metrics', () => {
    // Calculate active agents based on current mock data
    const activeAgents = mockAgents.filter(agent => agent.status === 'active').length;
    return HttpResponse.json({ 
      success: true, 
      data: {
        ...mockMetrics,
        active_agents: activeAgents
      }
    });
  }),
  http.options('http://localhost:3001/v1/monitoring/metrics', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  http.get('http://localhost:3001/v1/monitoring/alerts', () => {
    return HttpResponse.json({ success: true, data: mockAlerts });
  }),
  http.options('http://localhost:3001/v1/monitoring/alerts', () => {
    return new HttpResponse(null, { status: 200 });
  }),

  http.get('http://localhost:3001/v1/monitoring/timeseries', () => {
    return HttpResponse.json({ success: true, data: {} });
  }),
  http.options('http://localhost:3001/v1/monitoring/timeseries', () => {
    return new HttpResponse(null, { status: 200 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test setup helper
const renderApp = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter initialEntries={['/agents']}>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <AuthContext.Provider value={mockAuthContext}>
            <Routes>
              <Route path="/agents" element={<AgentList />} />
              <Route path="/monitoring" element={<MonitoringDashboard />} />
            </Routes>
          </AuthContext.Provider>
        </SnackbarProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('Agent Monitoring Integration', () => {
  test('updates monitoring metrics when agent status changes', async () => {
    // Increase the timeout for this test
    vi.setConfig({ testTimeout: 30000 });
    
    renderApp();

    // Wait for initial agent list load
    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Change agent status
    const statusButton = screen.getAllByRole('button')[2];
    fireEvent.click(statusButton);

    // Verify monitoring metrics update
    await waitFor(() => {
      expect(screen.getByText('Active Agents: 0')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test('shows alert in monitoring when agent exceeds risk threshold', async () => {
    // Increase the timeout for this test
    vi.setConfig({ testTimeout: 30000 });
    
    server.use(
      http.post('http://localhost:3001/v1/agents/:id/transactions', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 123,
            amount: 500,
            status: 'completed',
            risk_level: 'high'
          }
        });
      }),
      http.get('http://localhost:3001/v1/monitoring/alerts', () => {
        return HttpResponse.json({
          success: true,
          data: [
            ...mockAlerts,
            {
              id: 3,
              agent_id: 1,
              type: "risk_threshold",
              severity: "high",
              message: "Agent exceeded risk threshold",
              created_at: new Date().toISOString(),
              acknowledged: false
            }
          ]
        });
      })
    );
    
    renderApp();
    
    // Navigate to monitoring page
    const monitoringLink = screen.getByText('Monitoring');
    fireEvent.click(monitoringLink);
    
    // Check for the new alert
    await waitFor(() => {
      expect(screen.getByText('Agent exceeded risk threshold')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test('syncs agent list with monitoring dashboard', async () => {
    // Increase the timeout for this test
    vi.setConfig({ testTimeout: 30000 });
    
    renderApp();

    // Initial state
    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Add new agent
    server.use(
      http.get('http://localhost:3001/v1/agents', () => {
        return HttpResponse.json({
          success: true,
          data: [...mockAgents, {
            id: 3,
            name: "New Agent",
            status: "active",
            type: "general",
            daily_spend_limit: 1000.00,
            current_daily_spend: 0.00,
            success_rate: 1.0,
            risk_level: "low"
          }]
        });
      }),
      
      http.get('http://localhost:3001/v1/monitoring/metrics', () => {
        return HttpResponse.json({ 
          success: true, 
          data: {
            ...mockMetrics,
            active_agents: 2  // Updated to reflect the new agent
          }
        });
      })
    );

    // Trigger refetch
    const refreshButton = screen.getAllByRole('button')[0];
    fireEvent.click(refreshButton);

    // Verify both views update
    await waitFor(() => {
      expect(screen.getByText('New Agent')).toBeInTheDocument();
      expect(screen.getByText('Active Agents: 2')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test('updates risk metrics when transaction occurs', async () => {
    // Increase the timeout for this test
    vi.setConfig({ testTimeout: 30000 });
    
    renderApp();

    // Initial state
    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Simulate high-risk transaction
    server.use(
      http.get('http://localhost:3001/v1/monitoring/metrics', () => {
        return HttpResponse.json({
          success: true,
          data: {
            ...mockMetrics,
            risk_distribution: {
              low: 70,
              medium: 20,
              high: 10
            }
          }
        });
      })
    );

    // Navigate to monitoring
    const monitoringLink = screen.getByText('Monitoring');
    fireEvent.click(monitoringLink);

    // Verify risk metrics update
    await waitFor(() => {
      expect(screen.getByText('High: 10%')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test('handles error states consistently across components', async () => {
    // Increase the timeout for this test
    vi.setConfig({ testTimeout: 30000 });
    
    server.use(
      http.get('http://localhost:3001/v1/agents', () => {
        return new HttpResponse(null, { status: 500 });
      }),
      http.get('http://localhost:3001/v1/monitoring/metrics', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderApp();

    // Verify error states in both components
    await waitFor(() => {
      expect(screen.getByText('Error loading agents')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Navigate to monitoring
    const monitoringLink = screen.getByText('Monitoring');
    fireEvent.click(monitoringLink);
    
    // Verify error in monitoring
    await waitFor(() => {
      expect(screen.getByText('Error loading metrics')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Fix the API responses
    server.use(
      http.get('http://localhost:3001/v1/agents', () => {
        return HttpResponse.json({ success: true, data: mockAgents });
      }),
      http.get('http://localhost:3001/v1/monitoring/metrics', () => {
        return HttpResponse.json({ success: true, data: mockMetrics });
      })
    );

    // Verify retry functionality
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Active Agents: 1')).toBeInTheDocument();
    }, { timeout: 10000 });
  });

  test('maintains consistent state between navigation', async () => {
    // Increase the timeout for this test
    vi.setConfig({ testTimeout: 30000 });
    
    renderApp();

    // Initial state in agent list
    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Navigate to monitoring
    const monitoringLink = screen.getByText(/monitoring/i);
    fireEvent.click(monitoringLink);

    // Check monitoring state
    await waitFor(() => {
      expect(screen.getByText('Active Agents: 1')).toBeInTheDocument();
    }, { timeout: 10000 });

    // Navigate back to agent list
    const agentsLink = screen.getByText(/agents/i);
    fireEvent.click(agentsLink);

    // Verify state maintained
    await waitFor(() => {
      expect(screen.getByText('Shopping Assistant')).toBeInTheDocument();
      expect(screen.getByText('Success Rate: 95%')).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});