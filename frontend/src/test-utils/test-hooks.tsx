import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Create a wrapper with all necessary providers
export const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Hook testing utilities
export const renderHookWithProviders = <TProps, TResult>(
  hook: (props: TProps) => TResult,
  { initialProps, route = '/' }: { initialProps?: TProps; route?: string } = {}
) => {
  window.history.pushState({}, 'Test page', route);

  return renderHook(hook, {
    wrapper: createWrapper(),
    initialProps,
  });
};

// Mock hook responses
export const mockQueryResult = <T,>(data: T) => ({
  isLoading: false,
  isError: false,
  error: null,
  data,
});

export const mockQueryError = (error: Error) => ({
  isLoading: false,
  isError: true,
  error,
  data: undefined,
});

export const mockQueryLoading = () => ({
  isLoading: true,
  isError: false,
  error: null,
  data: undefined,
});

// Mock mutation responses
export const mockMutationResult = <T,>(data: T) => ({
  isLoading: false,
  isError: false,
  error: null,
  data,
  mutate: jest.fn(),
  mutateAsync: jest.fn().mockResolvedValue(data),
  reset: jest.fn(),
});

export const mockMutationError = (error: Error) => ({
  isLoading: false,
  isError: true,
  error,
  data: undefined,
  mutate: jest.fn(),
  mutateAsync: jest.fn().mockRejectedValue(error),
  reset: jest.fn(),
});

// Hook testing helpers
export const actHook = async (
  callback: () => Promise<void> | void
) => {
  await act(async () => {
    await callback();
  });
};

export const waitForHookToLoad = async <T,>(
  result: { current: T },
  predicate: (current: T) => boolean
) => {
  await waitFor(() => {
    expect(predicate(result.current)).toBe(true);
  });
};

// Mock API hook responses
export const mockApiHook = {
  success: <T,>(data: T) => ({
    data,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
  error: (error: Error) => ({
    data: undefined,
    isLoading: false,
    isError: true,
    error,
    refetch: jest.fn(),
  }),
  loading: () => ({
    data: undefined,
    isLoading: true,
    isError: false,
    error: null,
    refetch: jest.fn(),
  }),
};

// Test data generators for hooks
export const generateHookTestData = {
  template: (overrides = {}) => ({
    id: 1,
    name: 'Test Template',
    version: 1,
    // ... other fields
    ...overrides,
  }),
  analytics: (overrides = {}) => ({
    totalCards: 10,
    totalSpend: 1000,
    avgMonthlySpend: 100,
    successRate: 95,
    usageCount: 50,
    ...overrides,
  }),
};
