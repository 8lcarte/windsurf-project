import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionList } from '../../../components/Dashboard/TransactionList';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { Transaction } from '../../../api/transactions';

// Mock the TransactionDetailModal component
vi.mock('../../../components/Dashboard/TransactionDetailModal', () => ({
  TransactionDetailModal: ({ open, onClose, transaction }: { 
    open: boolean; 
    onClose: () => void; 
    transaction: Transaction | null;
  }) => (
    open ? (
      <div data-testid="transaction-modal">
        <button onClick={onClose}>Close</button>
        <div>Transaction ID: {transaction?.id}</div>
      </div>
    ) : null
  )
}));

// Mock the exportToCSV utility
vi.mock('../../../utils/exportUtils', () => ({
  exportToCSV: vi.fn()
}));

// Mock data
const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: '2025-02-13T10:00:00Z',
    description: 'Office Supplies',
    amount: 150.00,
    status: 'completed',
    type: 'debit',
    merchantName: 'Office Store',
    category: 'supplies'
  },
  {
    id: '2',
    date: '2025-02-13T11:00:00Z',
    description: 'Client Payment',
    amount: 500.00,
    status: 'pending',
    type: 'credit',
    merchantName: 'Client Corp',
    category: 'income'
  },
  {
    id: '3',
    date: '2025-02-13T12:00:00Z',
    description: 'Failed Transfer',
    amount: 75.00,
    status: 'failed',
    type: 'debit',
    merchantName: 'Unknown',
    category: 'transfer'
  }
];

// Setup MSW server
const server = setupServer(
  http.get('/transactions', () => {
    return HttpResponse.json({ success: true, data: mockTransactions });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Test setup helper
const renderTransactionList = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TransactionList />
    </QueryClientProvider>
  );
};

describe('TransactionList Component', () => {
  test('renders loading state initially', () => {
    renderTransactionList();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('renders transactions after loading', async () => {
    renderTransactionList();
    
    await waitFor(() => {
      expect(screen.getByText('Office Supplies')).toBeInTheDocument();
      expect(screen.getByText('Client Payment')).toBeInTheDocument();
      expect(screen.getByText('Failed Transfer')).toBeInTheDocument();
    });
  });

  test('handles error state', async () => {
    server.use(
      http.get('/transactions', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    renderTransactionList();

    await waitFor(() => {
      expect(screen.getByText(/error loading transactions/i)).toBeInTheDocument();
    });
  });

  test('filters transactions by status', async () => {
    renderTransactionList();

    await waitFor(() => {
      expect(screen.getByText('Office Supplies')).toBeInTheDocument();
    });

    // Click completed filter
    fireEvent.click(screen.getByRole('button', { name: /completed/i }));

    expect(screen.getByText('Office Supplies')).toBeInTheDocument();
    expect(screen.queryByText('Client Payment')).not.toBeInTheDocument();
    expect(screen.queryByText('Failed Transfer')).not.toBeInTheDocument();
  });

  test('searches transactions', async () => {
    renderTransactionList();

    await waitFor(() => {
      expect(screen.getByText('Office Supplies')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search transactions/i);
    await userEvent.type(searchInput, 'client');

    expect(screen.queryByText('Office Supplies')).not.toBeInTheDocument();
    expect(screen.getByText('Client Payment')).toBeInTheDocument();
    expect(screen.queryByText('Failed Transfer')).not.toBeInTheDocument();
  });

  test('sorts transactions', async () => {
    renderTransactionList();

    await waitFor(() => {
      expect(screen.getByText('Office Supplies')).toBeInTheDocument();
    });

    // Open sort menu
    fireEvent.click(screen.getByRole('button', { name: /sort by/i }));

    // Sort by amount
    fireEvent.click(screen.getByText(/amount/i));

    const transactions = screen.getAllByRole('listitem');
    expect(transactions[0]).toHaveTextContent('Client Payment');
    expect(transactions[1]).toHaveTextContent('Office Supplies');
    expect(transactions[2]).toHaveTextContent('Failed Transfer');
  });

  test('opens transaction detail modal', async () => {
    renderTransactionList();

    await waitFor(() => {
      expect(screen.getByText('Office Supplies')).toBeInTheDocument();
    });

    // Click info icon on first transaction
    const detailButtons = screen.getAllByRole('button', { name: /details/i });
    fireEvent.click(detailButtons[0]);

    expect(screen.getByTestId('transaction-modal')).toBeInTheDocument();
    expect(screen.getByText('Transaction ID: 1')).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(screen.queryByTestId('transaction-modal')).not.toBeInTheDocument();
  });

  test('exports transactions to CSV', async () => {
    const { exportToCSV } = await import('../../../utils/exportUtils');
    renderTransactionList();

    await waitFor(() => {
      expect(screen.getByText('Office Supplies')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /export csv/i }));

    expect(exportToCSV).toHaveBeenCalledWith(
      mockTransactions,
      expect.stringMatching(/transactions-\d{4}-\d{2}-\d{2}/)
    );
  });

  test('displays transaction amounts with correct formatting', async () => {
    renderTransactionList();

    await waitFor(() => {
      expect(screen.getByText('Office Supplies')).toBeInTheDocument();
    });

    expect(screen.getByText('- $150.00')).toBeInTheDocument();
    expect(screen.getByText('+ $500.00')).toBeInTheDocument();
    expect(screen.getByText('- $75.00')).toBeInTheDocument();
  });

  test('displays transaction dates with correct formatting', async () => {
    renderTransactionList();

    await waitFor(() => {
      expect(screen.getByText('Office Supplies')).toBeInTheDocument();
    });

    const date = new Date('2025-02-13T10:00:00Z');
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);

    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });
});