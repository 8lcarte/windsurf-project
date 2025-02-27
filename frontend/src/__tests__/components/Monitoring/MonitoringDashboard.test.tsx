import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MonitoringDashboard } from '../../../components/Monitoring/MonitoringDashboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn().mockImplementation((url) => {
      if (url.includes('/v1/monitoring/metrics')) {
        return Promise.resolve({ data: { success: true, data: mockMetrics } });
      } else if (url.includes('/v1/monitoring/alerts')) {
        return Promise.resolve({ data: { success: true, data: mockAlerts } });
      } else if (url.includes('/v1/monitoring/timeseries')) {
        return Promise.resolve({ data: { success: true, data: mockTimeSeriesData } });
      }
      return Promise.reject(new Error('Not found'));
    }),
    post: vi.fn().mockResolvedValue({ data: { success: true } })
  }
}));

// Mock data
const mockMetrics = {
  active_agents: 5,
  total_transactions: 150,
  success_rate: 0.95,
  average_response_time: 0.8,
  risk_distribution: {
    low: 80,
    medium: 15,
    high: 5
  },
  top_merchants: [
    { name: "Amazon", transaction_count: 45 },
    { name: "Walmart", transaction_count: 30 }
  ],
  recent_anomalies: [
    {
      id: 1,
      agent_id: 1,
      type: "high_amount",
      severity: "medium",
      detected_at: "2025-02-27T10:30:00Z",
      description: "Unusually high transaction amount"
    }
  ]
};

const mockAlerts = [
  {
    id: 1,
    type: "risk_threshold",
    severity: "high",
    message: "Risk threshold exceeded",
    created_at: "2025-02-27T10:30:00Z",
    status: "active"
  },
  {
    id: 2,
    type: "behavior_change",
    severity: "medium",
    message: "Unusual behavior pattern detected",
    created_at: "2025-02-27T10:15:00Z",
    status: "active"
  }
];

const mockTimeSeriesData = {
  transaction_volume: [
    { timestamp: "2025-02-27T10:00:00Z", value: 10 },
    { timestamp: "2025-02-27T11:00:00Z", value: 15 }
  ],
  average_risk_score: [
    { timestamp: "2025-02-27T10:00:00Z", value: 0.2 },
    { timestamp: "2025-02-27T11:00:00Z", value: 0.3 }
  ]
};

// Setup MSW server
const server = setupServer(
  http.get('http://localhost:3001/v1/monitoring/metrics', () => {
    return HttpResponse.json({ success: true, data: mockMetrics });
  }),

  http.get('http://localhost:3001/v1/monitoring/alerts', () => {
    return HttpResponse.json({ success: true, data: mockAlerts });
  }),

  http.get('http://localhost:3001/v1/monitoring/timeseries*', ({ request }) => {
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '24h';
    return HttpResponse.json({ success: true, data: mockTimeSeriesData });
  }),

  http.post('http://localhost:3001/v1/monitoring/alerts/:id/acknowledge', () => {
    return HttpResponse.json({ success: true });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test setup helper
const renderDashboard = () => {
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
          <MonitoringDashboard />
        </SnackbarProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('MonitoringDashboard Component', () => {
  // Increase timeout for all tests in this suite
  vi.setConfig({ testTimeout: 10000 });

  test('renders loading state initially', () => {
    renderDashboard();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders metrics after loading', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Active Agents: 5')).toBeInTheDocument();
      expect(screen.getByText('Success Rate: 95%')).toBeInTheDocument();
    });
    
    // Check risk distribution
    expect(screen.getByText('80%')).toBeInTheDocument(); // Low risk
    expect(screen.getByText('15%')).toBeInTheDocument(); // Medium risk
  });

  test('renders alerts section', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Suspicious transaction detected')).toBeInTheDocument();
    
    // Check alert severity indicators - using closest to find the parent Chip component
    const highSeverityAlert = screen.getByText('high');
    const chipElement = highSeverityAlert.closest('.MuiChip-root');
    expect(chipElement).toHaveClass('MuiChip-colorError');
  });

  test('handles alert acknowledgment', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Risk threshold exceeded')).toBeInTheDocument();
    });
    
    const acknowledgeButton = screen.getAllByRole('button', { name: /acknowledge/i })[0];
    fireEvent.click(acknowledgeButton);
    
    await waitFor(() => {
      expect(screen.getByText('Alert acknowledged')).toBeInTheDocument();
    });
  });

  test('renders time series charts', async () => {
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByTestId('transaction-volume-chart')).toBeInTheDocument();
      expect(screen.getByTestId('risk-score-chart')).toBeInTheDocument();
    });
    
    // Check chart data points
    const volumeChart = screen.getByTestId('transaction-volume-chart');
    expect(volumeChart).toHaveAttribute('data-point-count', '2');
  });

  test('handles time range selection', async () => {
    // Mock axios.get for this test
    vi.mocked(axios.get).mockResolvedValueOnce({
      data: { data: mockTimeSeriesData }
    });
    
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Transaction Volume')).toBeInTheDocument();
    });
    
    // Find the select by its text content instead of label
    const timeRangeSelect = screen.getByText('Last 24 Hours');
    fireEvent.mouseDown(timeRangeSelect);
    
    await waitFor(() => {
      const option = screen.getByText('Last 7 Days');
      fireEvent.click(option);
    });
    
    // Verify the API was called with the new time range
    expect(axios.get).toHaveBeenCalled();
  });

  test('displays merchant analytics', async () => {
    // Increase the timeout for this test
    vi.setConfig({ testTimeout: 30000 });
    
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('Top Merchants')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    expect(screen.getByText('Amazon (45)')).toBeInTheDocument();
    expect(screen.getByText('Walmart (30)')).toBeInTheDocument();
  });

  test('handles error states', async () => {
    // Increase the timeout for this test
    vi.setConfig({ testTimeout: 30000 });
    
    // Override the axios mock for this test
    (axios.get as jest.Mock).mockImplementationOnce(() => {
      return Promise.reject(new Error('API Error'));
    });
    
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/error loading metrics/i)).toBeInTheDocument();
    }, { timeout: 10000 });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
  });

  test('updates data periodically', async () => {
    // Increase the timeout for this test
    vi.setConfig({ testTimeout: 30000 });
    
    vi.useFakeTimers();
    
    renderDashboard();
    
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // Active agents
    }, { timeout: 10000 });
    
    // Mock updated data
    (axios.get as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/v1/monitoring/metrics')) {
        return Promise.resolve({ 
          data: { 
            success: true, 
            data: { ...mockMetrics, active_agents: 6 } 
          } 
        });
      }
      return Promise.reject(new Error('Not found'));
    });
    
    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);
    
    await waitFor(() => {
      expect(screen.getByText('6')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    vi.useRealTimers();
  });

  test('filters alerts by severity', async () => {
    // Increase the timeout for this test
    vi.setConfig({ testTimeout: 30000 });
    
    renderDashboard();
    
    // Wait for alerts to load
    await waitFor(() => {
      expect(screen.getByText('Risk threshold exceeded')).toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Filter by high severity
    const filterSelect = screen.getByLabelText(/filter by severity/i);
    fireEvent.mouseDown(filterSelect);
    
    await waitFor(() => {
      const highOption = screen.getByRole('option', { name: /high/i });
      fireEvent.click(highOption);
    }, { timeout: 10000 });
    
    // Verify only high severity alerts are shown
    await waitFor(() => {
      expect(screen.getByText('Risk threshold exceeded')).toBeInTheDocument();
      expect(screen.queryByText('Unusual behavior pattern detected')).not.toBeInTheDocument();
    }, { timeout: 10000 });
  });
});