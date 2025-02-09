import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../theme';

// Create a custom render function that includes providers
function render(
  ui: React.ReactElement,
  {
    preloadedState = {},
    route = '/',
    initialEntries = [route],
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          cacheTime: 0,
        },
      },
    }),
    ...renderOptions
  } = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={initialEntries}>
            <Routes>
              <Route path="*" element={children} />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { render };

// Custom async helpers
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Form interaction helpers
export const fillForm = async (
  getByLabelText: Function,
  formData: Record<string, string | number>
) => {
  for (const [label, value] of Object.entries(formData)) {
    await userEvent.type(getByLabelText(label), String(value));
  }
};

// Mock response helpers
export const mockApiResponse = (data: any) => ({
  ok: true,
  json: async () => data,
});

export const mockApiError = (status: number, message: string) => ({
  ok: false,
  status,
  json: async () => ({ detail: message }),
});

// Test data generators
export const generateTemplateData = (overrides = {}) => ({
  id: Math.floor(Math.random() * 1000),
  name: 'Test Template',
  description: 'Test Description',
  version: 1,
  isActive: true,
  spendingLimits: {
    daily: 1000,
    monthly: 5000,
  },
  categorySpendingLimits: {},
  allowedMerchantCategories: [],
  blockedMerchantCategories: [],
  allowedCountries: ['US'],
  blockedCountries: [],
  allowOnlineTransactions: true,
  allowContactlessTransactions: true,
  allowCashWithdrawals: false,
  allowInternationalTransactions: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

// Mock event helpers
export const mockMouseEvent = () =>
  new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
  });

export const mockChangeEvent = (value: string) => ({
  target: { value },
  preventDefault: () => {},
});
