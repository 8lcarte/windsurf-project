import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { useFundingSource } from '../../hooks/useFundingSource';
import axios from 'axios';

vi.mock('axios');

// Mock window.open
const mockWindow = {
  closed: false,
  close: jest.fn(),
};
global.open = jest.fn(() => mockWindow as Window);

describe('useFundingSource', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SnackbarProvider>{children}</SnackbarProvider>
    </QueryClientProvider>
  );

  it('should fetch funding sources successfully', async () => {
    const mockSources = [
      {
        id: 'paypal_1',
        provider: 'paypal',
        connected: true,
        name: 'PayPal',
      },
    ];

    vi.mocked(axios.get).mockResolvedValueOnce({ data: mockSources });

    const { result } = renderHook(() => useFundingSource(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.fundingSources).toEqual(mockSources);
    expect(result.current.isLoading).toBe(false);
  });

  it('should handle fetch error', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('Failed to fetch'));

    const { result } = renderHook(() => useFundingSource(), { wrapper });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toEqual({
      message: 'Failed to fetch funding sources',
      code: undefined,
    });
  });

  it('should connect to funding source', async () => {
    const mockResponse = {
      url: 'https://oauth.provider.com',
      state: 'test_state',
      provider: 'paypal',
    };

    vi.mocked(axios.post).mockResolvedValueOnce({ data: mockResponse });

    const { result } = renderHook(() => useFundingSource(), { wrapper });

    await act(async () => {
      await result.current.connect('paypal');
    });

    expect(global.open).toHaveBeenCalledWith(
      mockResponse.url,
      'Connect Funding Source',
      expect.any(String)
    );
    expect(result.current.isPolling).toBe(true);
  });

  it('should disconnect from funding source', async () => {
    vi.mocked(axios.delete).mockResolvedValueOnce({ data: null });

    const { result } = renderHook(() => useFundingSource(), { wrapper });

    await act(async () => {
      await result.current.disconnect('paypal_1');
    });

    expect(mockedAxios.delete).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/funding/sources/paypal_1')
    );
  });

  it('should handle connection error', async () => {
    vi.mocked(axios.post).mockRejectedValueOnce(new Error('Connection failed'));

    const { result } = renderHook(() => useFundingSource(), { wrapper });

    await act(async () => {
      try {
        await result.current.connect('paypal');
      } catch (e) {
        // Expected error
      }
    });

    expect(result.current.error).toEqual({
      message: 'Failed to initiate connection',
      code: undefined,
      provider: 'paypal',
    });
  });

  it('should cleanup on unmount', () => {
    const { unmount } = renderHook(() => useFundingSource(), { wrapper });

    // Simulate opening a window
    act(() => {
      global.open('', '', '');
    });

    unmount();

    expect(mockWindow.close).toHaveBeenCalled();
  });
});
