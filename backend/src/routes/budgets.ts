import { Router } from 'express';
import { notificationService } from '../services/notifications';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth';

const router = Router();

interface AlertThreshold {
  percentage: number;
  triggered: boolean;
  lastTriggeredAt?: string;
}

interface Budget {
  id: string;
  userId: string;
  category: string;
  targetAmount: number;
  period: 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  createdAt: string;
  alertThresholds: AlertThreshold[];
  alertsEnabled: boolean;
}

// Mock database
let budgets: Budget[] = [
  {
    id: '1',
    userId: '1',
    category: 'CLOUD_SERVICES',
    targetAmount: 5000,
    period: 'monthly',
    startDate: new Date().toISOString(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    createdAt: new Date().toISOString(),
    alertThresholds: [
      { percentage: 50, triggered: false },
      { percentage: 75, triggered: false },
      { percentage: 90, triggered: false },
      { percentage: 100, triggered: false }
    ],
    alertsEnabled: true,
  },
  {
    id: '2',
    userId: '1',
    category: 'SOFTWARE',
    targetAmount: 2000,
    period: 'monthly',
    startDate: new Date().toISOString(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
    createdAt: new Date().toISOString(),
  },
];

// Get all budgets for a user
router.get('/', authenticateToken, (req, res) => {
  const userBudgets = budgets.filter(budget => budget.userId === req.user?.userId);
  res.json(userBudgets);
});

// Create a new budget
router.post('/', authenticateToken, (req, res) => {
  const { 
    category, 
    targetAmount, 
    period, 
    alertsEnabled = true,
    alertThresholds = [50, 75, 90, 100]
  } = req.body;

  // Validate thresholds
  if (!Array.isArray(alertThresholds) || 
      !alertThresholds.every(t => typeof t === 'number' && t > 0 && t <= 100)) {
    return res.status(400).json({ 
      message: 'Alert thresholds must be an array of numbers between 1 and 100' 
    });
  }

  if (!category || !targetAmount || !period) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const startDate = new Date();
  let endDate = new Date();

  switch (period) {
    case 'monthly':
      endDate.setMonth(endDate.getMonth() + 1);
      break;
    case 'quarterly':
      endDate.setMonth(endDate.getMonth() + 3);
      break;
    case 'yearly':
      endDate.setFullYear(endDate.getFullYear() + 1);
      break;
    default:
      return res.status(400).json({ message: 'Invalid period' });
  }

  const newBudget: Budget = {
    id: uuidv4(),
    userId: req.user?.userId || '',
    category,
    targetAmount,
    period,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    createdAt: new Date().toISOString(),
    alertThresholds: alertThresholds
      .sort((a, b) => a - b)
      .map(percentage => ({
        percentage,
        triggered: false
      })),
    alertsEnabled,
  };

  budgets.push(newBudget);
  res.status(201).json(newBudget);
});

// Check budget thresholds and create alerts if needed
const checkBudgetThresholds = (budget: Budget, currentSpending: number) => {
  if (!budget.alertsEnabled) return;

  const spendingPercentage = (currentSpending / budget.targetAmount) * 100;
  
  budget.alertThresholds.forEach(threshold => {
    if (!threshold.triggered && spendingPercentage >= threshold.percentage) {
      threshold.triggered = true;
      threshold.lastTriggeredAt = new Date().toISOString();
      
      notificationService.createBudgetAlert(
        budget.userId,
        budget.category,
        threshold.percentage,
        currentSpending,
        budget.targetAmount
      );
    }
  });
};

// Update spending for a budget
router.post('/:id/spending', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { currentSpending } = req.body;

  const budget = budgets.find(
    budget => budget.id === id && budget.userId === req.user?.userId
  );

  if (!budget) {
    return res.status(404).json({ message: 'Budget not found' });
  }

  checkBudgetThresholds(budget, currentSpending);
  res.json(budget);
});

// Update a budget
router.patch('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { targetAmount } = req.body;

  const budgetIndex = budgets.findIndex(
    budget => budget.id === id && budget.userId === req.user?.userId
  );

  if (budgetIndex === -1) {
    return res.status(404).json({ message: 'Budget not found' });
  }

  budgets[budgetIndex] = {
    ...budgets[budgetIndex],
    targetAmount,
  };

  res.json(budgets[budgetIndex]);
});

// Delete a budget
router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const budgetIndex = budgets.findIndex(
    budget => budget.id === id && budget.userId === req.user?.userId
  );

  if (budgetIndex === -1) {
    return res.status(404).json({ message: 'Budget not found' });
  }

  budgets = budgets.filter((_, index) => index !== budgetIndex);
  res.status(204).send();
});

export default router;
