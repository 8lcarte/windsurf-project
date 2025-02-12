import { CardTemplate, TemplateAnalytics } from '../types/templates';

export const mockTemplates: CardTemplate[] = [
  {
    id: 1,
    name: "Standard Business Card",
    description: "Default template for business expenses",
    version: 1,
    isActive: true,
    spendingLimits: {
      daily: 1000,
      monthly: 5000
    },
    categorySpendingLimits: {
      "travel": 2000,
      "dining": 500
    },
    allowedMerchantCategories: ["travel", "dining", "office-supplies"],
    blockedMerchantCategories: ["gambling", "adult-entertainment"],
    allowedCountries: ["US", "CA", "GB"],
    blockedCountries: [],
    allowOnlineTransactions: true,
    allowContactlessTransactions: true,
    allowCashWithdrawals: false,
    allowInternationalTransactions: true,
    autoExpiryEnabled: true,
    autoExpiryDays: 365,
    autoRenewalEnabled: true,
    autoFreezeOnSuspicious: true,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    usageCount: 150,
    successRate: 98.5,
    avgMonthlySpend: 3500,
    totalCards: 42,
    lastUsedAt: "2025-02-09T09:00:00Z"
  },
  {
    id: 2,
    name: "Developer Card",
    description: "Template for developer-related expenses",
    version: 1,
    isActive: true,
    spendingLimits: {
      daily: 500,
      monthly: 2000
    },
    categorySpendingLimits: {
      "software": 1000,
      "cloud-services": 1000
    },
    allowedMerchantCategories: ["software", "cloud-services", "office-supplies"],
    blockedMerchantCategories: ["gambling", "gaming"],
    allowedCountries: ["US"],
    blockedCountries: [],
    allowOnlineTransactions: true,
    allowContactlessTransactions: true,
    allowCashWithdrawals: false,
    allowInternationalTransactions: false,
    autoExpiryEnabled: true,
    autoExpiryDays: 180,
    autoRenewalEnabled: true,
    autoFreezeOnSuspicious: true,
    createdAt: "2025-01-15T00:00:00Z",
    updatedAt: "2025-01-15T00:00:00Z",
    usageCount: 75,
    successRate: 99.1,
    avgMonthlySpend: 1500,
    totalCards: 15,
    lastUsedAt: "2025-02-09T08:30:00Z"
  }
];

export const mockTemplateHistory: CardTemplate[] = [
  {
    id: 1,
    name: "Standard Business Card",
    description: "Default template for business expenses",
    version: 2,
    isActive: true,
    spendingLimits: {
      daily: 1000,
      monthly: 5000
    },
    // ... other fields same as above
    createdAt: "2025-02-01T00:00:00Z",
    updatedAt: "2025-02-01T00:00:00Z"
  },
  {
    id: 3,
    name: "Standard Business Card",
    description: "Default template for business expenses",
    version: 1,
    isActive: false,
    spendingLimits: {
      daily: 500,
      monthly: 3000
    },
    // ... other fields with older values
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z"
  }
];

export const mockTemplateAnalytics: TemplateAnalytics = {
  totalCards: 42,
  totalSpend: 147500.50,
  avgMonthlySpend: 3511.90,
  successRate: 98.5,
  usageCount: 150,
  lastUsed: "2025-02-09T09:00:00Z"
};

export const mockApiErrors = {
  notFound: {
    detail: "Template not found",
    code: "TEMPLATE_NOT_FOUND",
    params: { templateId: "123" }
  },
  unauthorized: {
    detail: "Not authorized to access this template",
    code: "UNAUTHORIZED",
    params: { templateId: "123" }
  },
  validation: {
    detail: "Validation error",
    code: "VALIDATION_ERROR",
    params: {
      name: ["Field is required"],
      spendingLimits: ["Invalid spending limit format"]
    }
  },
  rateLimited: {
    detail: "Too many requests",
    code: "RATE_LIMITED",
    params: { retryAfter: "60" }
  }
};
