# Frontend Testing Guide

## Overview

This guide covers testing strategies for the AI Agent Payment Platform frontend, with a focus on template management features. We use a combination of unit tests, integration tests, and end-to-end tests to ensure code quality and reliability.

## Testing Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking
- **Cypress**: End-to-end testing

## Test Setup

### 1. Install Dependencies

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event msw cypress
```

### 2. Configure MSW

```typescript
// src/mocks/browser.ts
import { setupWorker } from 'msw';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### 3. Setup Test Environment

```typescript
// src/setupTests.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

## Writing Tests

### 1. Component Tests

```typescript
// src/components/__tests__/TemplateList.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TemplateList } from '../TemplateList';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

describe('TemplateList', () => {
  it('renders templates successfully', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <TemplateList />
      </QueryClientProvider>
    );

    // Wait for templates to load
    await waitFor(() => {
      expect(screen.getByText('Standard Business Card')).toBeInTheDocument();
    });

    // Check template details
    expect(screen.getByText('$5,000')).toBeInTheDocument();
    expect(screen.getByText('98.5%')).toBeInTheDocument();
  });

  it('handles error states', async () => {
    server.use(
      rest.get('/api/v1/templates', (req, res, ctx) =>
        res(ctx.status(500))
      )
    );

    render(
      <QueryClientProvider client={queryClient}>
        <TemplateList />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### 2. Hook Tests

```typescript
// src/hooks/__tests__/useTemplates.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTemplates } from '../useTemplates';

describe('useTemplates', () => {
  it('fetches templates successfully', async () => {
    const { result } = renderHook(() => useTemplates(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].name).toBe('Standard Business Card');
  });

  it('handles pagination', async () => {
    const { result } = renderHook(() => useTemplates(2, 1), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      ),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].name).toBe('Developer Card');
  });
});
```

### 3. Form Tests

```typescript
// src/components/__tests__/CreateTemplateForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateTemplateForm } from '../CreateTemplateForm';

describe('CreateTemplateForm', () => {
  it('submits form with valid data', async () => {
    const onSubmit = jest.fn();
    render(<CreateTemplateForm onSubmit={onSubmit} />);

    // Fill form
    await userEvent.type(
      screen.getByLabelText(/template name/i),
      'Test Template'
    );
    await userEvent.type(
      screen.getByLabelText(/daily limit/i),
      '1000'
    );

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Template',
          spendingLimits: { daily: 1000 }
        })
      );
    });
  });

  it('displays validation errors', async () => {
    render(<CreateTemplateForm />);

    // Submit without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });
});
```

## End-to-End Tests

```typescript
// cypress/integration/template-management.spec.ts
describe('Template Management', () => {
  beforeEach(() => {
    cy.login(); // Custom command for authentication
    cy.visit('/templates');
  });

  it('creates and views a template', () => {
    // Create template
    cy.get('[data-testid="create-template-btn"]').click();
    cy.get('[data-testid="template-name-input"]')
      .type('E2E Test Template');
    cy.get('[data-testid="daily-limit-input"]')
      .type('1000');
    cy.get('[data-testid="submit-btn"]').click();

    // Verify template was created
    cy.contains('E2E Test Template').should('be.visible');
    cy.contains('$1,000').should('be.visible');

    // View template details
    cy.contains('E2E Test Template').click();
    cy.url().should('include', '/templates/');
    cy.contains('Template Details').should('be.visible');
  });

  it('handles error scenarios', () => {
    // Test rate limiting
    cy.intercept('POST', '/api/v1/templates', {
      statusCode: 429,
      body: mockApiErrors.rateLimited
    }).as('rateLimit');

    cy.get('[data-testid="create-template-btn"]').click();
    cy.get('[data-testid="template-name-input"]')
      .type('Rate Limit Test');
    cy.get('[data-testid="submit-btn"]').click();

    cy.contains('Too many requests').should('be.visible');
  });
});
```

## Test Coverage

We aim for:
- 100% coverage of hooks and utilities
- 90% coverage of components
- Key user flows covered by E2E tests

Run coverage reports:
```bash
# Unit and integration tests
npm run test:coverage

# E2E tests
npm run cypress:coverage
```

## Best Practices

1. **Component Testing**
   - Test component behavior, not implementation
   - Use `data-testid` for test-specific selectors
   - Test both success and error states
   - Test loading states and transitions

2. **Hook Testing**
   - Test all possible states
   - Test error handling
   - Test side effects
   - Test cache invalidation

3. **Form Testing**
   - Test validation logic
   - Test submission behavior
   - Test error messages
   - Test field interactions

4. **API Mocking**
   - Use MSW for consistent API mocking
   - Test different response scenarios
   - Test error handling
   - Test loading states

5. **E2E Testing**
   - Focus on critical user flows
   - Test real API interactions
   - Test error scenarios
   - Test across different viewports

## Continuous Integration

Our CI pipeline runs:
1. Unit tests
2. Integration tests
3. E2E tests
4. Coverage reports
5. Type checking

Tests must pass and maintain minimum coverage thresholds for merge.
