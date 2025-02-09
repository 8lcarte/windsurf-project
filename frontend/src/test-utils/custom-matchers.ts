import { expect } from '@jest/globals';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidTemplate(): R;
      toHaveValidSpendingLimits(): R;
      toBeValidAnalytics(): R;
      toBeWithinRange(min: number, max: number): R;
      toBeValidDate(): R;
      toBeValidCurrency(): R;
    }
  }
}

expect.extend({
  toBeValidTemplate(received) {
    const requiredFields = [
      'id',
      'name',
      'version',
      'isActive',
      'spendingLimits',
      'createdAt',
      'updatedAt',
    ];

    const missingFields = requiredFields.filter(field => !(field in received));

    if (missingFields.length > 0) {
      return {
        pass: false,
        message: () =>
          `Expected template to have fields: ${missingFields.join(', ')}`,
      };
    }

    return {
      pass: true,
      message: () => 'Expected template to not be valid',
    };
  },

  toHaveValidSpendingLimits(received) {
    const { spendingLimits } = received;

    if (!spendingLimits || typeof spendingLimits !== 'object') {
      return {
        pass: false,
        message: () => 'Expected spendingLimits to be an object',
      };
    }

    const hasValidLimits = Object.values(spendingLimits).every(
      value => typeof value === 'number' && value >= 0
    );

    return {
      pass: hasValidLimits,
      message: () =>
        'Expected all spending limits to be non-negative numbers',
    };
  },

  toBeValidAnalytics(received) {
    const requiredMetrics = [
      'totalCards',
      'totalSpend',
      'avgMonthlySpend',
      'successRate',
      'usageCount',
    ];

    const missingMetrics = requiredMetrics.filter(
      metric => !(metric in received)
    );

    if (missingMetrics.length > 0) {
      return {
        pass: false,
        message: () =>
          `Expected analytics to have metrics: ${missingMetrics.join(', ')}`,
      };
    }

    return {
      pass: true,
      message: () => 'Expected analytics to not be valid',
    };
  },

  toBeWithinRange(received, min, max) {
    const pass = received >= min && received <= max;
    return {
      pass,
      message: () =>
        `Expected ${received} to be within range [${min}, ${max}]`,
    };
  },

  toBeValidDate(received) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());
    return {
      pass,
      message: () =>
        `Expected ${received} to be a valid ISO date string`,
    };
  },

  toBeValidCurrency(received) {
    const pass = typeof received === 'number' && received >= 0;
    return {
      pass,
      message: () =>
        `Expected ${received} to be a non-negative number`,
    };
  },
});
