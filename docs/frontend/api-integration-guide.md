# Frontend API Integration Guide

## Overview

This guide provides detailed instructions for integrating with the AI Agent Payment Platform API, specifically focusing on the template management features. The API follows RESTful principles and uses JWT for authentication.

## Quick Start

### Base URL
```typescript
const API_BASE_URL = '/api/v1';
```

### Authentication

All requests require a JWT token. Add it to your API client configuration:

```typescript
// api/client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Template Management API

### Types

```typescript
interface CardTemplate {
  id: number;
  name: string;
  description?: string;
  version: number;
  isActive: boolean;
  spendingLimits: {
    [period: string]: number;  // e.g., { "daily": 1000, "monthly": 5000 }
  };
  categorySpendingLimits: {
    [category: string]: number;
  };
  allowedMerchantCategories: string[];
  blockedMerchantCategories: string[];
  allowedCountries: string[];
  blockedCountries: string[];
  allowOnlineTransactions: boolean;
  allowContactlessTransactions: boolean;
  allowCashWithdrawals: boolean;
  allowInternationalTransactions: boolean;
  autoExpiryEnabled: boolean;
  autoExpiryDays?: number;
  autoRenewalEnabled: boolean;
  autoFreezeOnSuspicious: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  successRate: number;
  avgMonthlySpend: number;
  totalCards: number;
  lastUsedAt?: string;
}

interface TemplateAnalytics {
  totalCards: number;
  totalSpend: number;
  avgMonthlySpend: number;
  successRate: number;
  usageCount: number;
  lastUsed?: string;
}
```

### API Hooks

Here's a set of React hooks for template management:

```typescript
// hooks/useTemplates.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export const useTemplates = (page = 1, limit = 10, activeOnly = true) => {
  return useQuery(['templates', page, limit, activeOnly], async () => {
    const response = await apiClient.get('/templates', {
      params: { skip: (page - 1) * limit, limit, active_only: activeOnly }
    });
    return response.data;
  });
};

export const useTemplate = (templateId: number) => {
  return useQuery(['template', templateId], async () => {
    const response = await apiClient.get(`/templates/${templateId}`);
    return response.data;
  });
};

export const useTemplateHistory = (templateId: number) => {
  return useQuery(['template-history', templateId], async () => {
    const response = await apiClient.get(`/templates/${templateId}/history`);
    return response.data;
  });
};

export const useTemplateAnalytics = (templateId: number, timeRange = 30) => {
  return useQuery(['template-analytics', templateId, timeRange], async () => {
    const response = await apiClient.get(`/templates/${templateId}/analytics`, {
      params: { time_range: timeRange }
    });
    return response.data;
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async (template: Omit<CardTemplate, 'id'>) => {
      const response = await apiClient.post('/templates', template);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['templates']);
      },
    }
  );
};

export const useCreateTemplateVersion = (templateId: number) => {
  const queryClient = useQueryClient();
  
  return useMutation(
    async (updates: Partial<CardTemplate>) => {
      const response = await apiClient.post(`/templates/${templateId}/versions`, updates);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['templates']);
        queryClient.invalidateQueries(['template', templateId]);
        queryClient.invalidateQueries(['template-history', templateId]);
      },
    }
  );
};
```

### Usage Examples

#### Template List View
```tsx
// components/TemplateList.tsx
import { useTemplates } from '../hooks/useTemplates';

export const TemplateList = () => {
  const { data: templates, isLoading, error } = useTemplates();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  );
};
```

#### Template Creation Form
```tsx
// components/CreateTemplateForm.tsx
import { useCreateTemplate } from '../hooks/useTemplates';

export const CreateTemplateForm = () => {
  const createTemplate = useCreateTemplate();

  const handleSubmit = async (values: Omit<CardTemplate, 'id'>) => {
    try {
      await createTemplate.mutateAsync(values);
      // Show success message
    } catch (error) {
      // Handle error
    }
  };

  return (
    <Form onSubmit={handleSubmit}>
      {/* Form fields */}
    </Form>
  );
};
```

#### Template Analytics Dashboard
```tsx
// components/TemplateAnalytics.tsx
import { useTemplateAnalytics } from '../hooks/useTemplates';

export const TemplateAnalytics = ({ templateId }: { templateId: number }) => {
  const { data: analytics, isLoading } = useTemplateAnalytics(templateId);

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <MetricCard
        title="Total Cards"
        value={analytics.totalCards}
      />
      <MetricCard
        title="Success Rate"
        value={`${analytics.successRate}%`}
      />
      <MetricCard
        title="Average Monthly Spend"
        value={formatCurrency(analytics.avgMonthlySpend)}
      />
      {/* More metrics */}
    </div>
  );
};
```

## Error Handling

The API returns standardized error responses:

```typescript
interface ApiError {
  detail: string;
  code: string;
  params?: Record<string, any>;
}

// Error handling utility
export const handleApiError = (error: unknown) => {
  if (axios.isAxiosError(error) && error.response) {
    const apiError = error.response.data as ApiError;
    return {
      message: apiError.detail,
      code: apiError.code,
      params: apiError.params,
    };
  }
  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
};
```

## Rate Limiting

The API implements rate limiting:
- Standard endpoints: 100 requests/minute
- Mutation endpoints: 10 requests/minute

Handle rate limiting in your API client:

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 429) {
      // Handle rate limiting
      const retryAfter = error.response.headers['retry-after'];
      // Implement retry logic or show user feedback
    }
    return Promise.reject(error);
  }
);
```

## Best Practices

1. **Data Fetching**
   - Use React Query for data management
   - Implement proper loading states
   - Handle errors gracefully
   - Cache responses appropriately

2. **State Management**
   - Use React Query for server state
   - Use local state for UI-specific state
   - Implement optimistic updates for better UX

3. **Type Safety**
   - Use TypeScript interfaces for API responses
   - Validate API responses against schemas
   - Use strict TypeScript settings

4. **Performance**
   - Implement pagination for large lists
   - Use proper caching strategies
   - Implement debouncing for search/filter operations

## Development Tools

### API Documentation
- Swagger UI: `/api/v1/docs`
- ReDoc: `/api/v1/redoc`
- OpenAPI JSON: `/api/v1/openapi.json`

### Testing
```bash
# Run API tests in development
npm test

# Run with API mocking
npm test:mock
```

## Support

For API-related questions or issues:
- Check the API documentation
- Review error messages and codes
- Contact the backend team via Slack (#api-support)
