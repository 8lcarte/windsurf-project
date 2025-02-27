import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate } from '../middleware/auth';
import { Request } from 'express';

// Extend the Express Request type
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export const router = Router();

// Get all virtual cards
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  const userCards = virtualCards.filter(card => card.userId === req.user?.userId);
  res.json(userCards);
});

// Helper functions
function generateCardNumber(): string {
  // In production, this would integrate with a card issuing service
  return '4242424242424242';
}

function generateExpiryDate(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 2);
  return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear().toString().slice(-2)}`;
}

// Mock database (replace with real database in production)
let virtualCards = [
  {
    id: '1',
    userId: '1',
    customerId: 'cust_123',
    name: 'AWS Services',
    number: '4242424242424242',
    lastFour: '4242',
    expiryDate: '12/25',
    cvv: '123',
    status: 'active',
    balance: 5000,
    spendLimit: 10000,
    frozen: false,
    merchantControls: {
      allowedCategories: ['CLOUD_SERVICES', 'SOFTWARE'],
      blockedCategories: ['GAMBLING', 'ADULT'],
      maxAmountPerMerchant: {
        'Amazon Web Services': 0,
        'Google Cloud': 0
      }
    },
    transactions: [
      {
        id: '1',
        date: new Date().toISOString(),
        merchantName: 'Amazon Web Services',
        amount: 2500,
        status: 'completed',
        category: 'CLOUD_SERVICES',
        type: 'debit',
        description: 'Monthly AWS Infrastructure'
      },
      {
        id: '2',
        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        merchantName: 'AWS Lambda',
        amount: 150.50,
        status: 'completed',
        category: 'CLOUD_SERVICES',
        type: 'debit',
        description: 'Lambda Function Execution'
      }
    ],
    merchantCategories: ['CLOUD_SERVICES', 'SOFTWARE'],
    metadata: {
      agent_name: 'AWS Cost Manager',
      agent_description: 'For business purchases and vendor payments',
      department: 'Engineering'
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    userId: '1',
    customerId: 'cust_456',
    name: 'Marketing Budget',
    number: '4242424242424243',
    lastFour: '4243',
    expiryDate: '01/26',
    cvv: '456',
    status: 'active',
    balance: 7500,
    spendLimit: 15000,
    frozen: false,
    merchantControls: {
      allowedCategories: ['ADVERTISING', 'MARKETING'],
      blockedCategories: ['GAMBLING', 'ADULT'],
      maxAmountPerMerchant: {
        'Google Ads': 0,
        'Facebook Ads': 0
      }
    },
    metadata: {
      agent_name: 'SaaS Subscription Manager',
      agent_description: 'For managing recurring software and service payments',
      billing_cycle: 'monthly'
    },
    transactions: [
      {
        id: '3',
        date: new Date().toISOString(),
        merchantName: 'Google Ads',
        amount: 1000,
        status: 'pending',
        category: 'ADVERTISING',
        type: 'debit',
        description: 'Q1 Ad Campaign'
      },
      {
        id: '4',
        date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        merchantName: 'Facebook Ads',
        amount: 750,
        status: 'completed',
        category: 'ADVERTISING',
        type: 'debit',
        description: 'Social Media Marketing'
      }
    ],
    merchantCategories: ['ADVERTISING', 'MARKETING'],
    createdAt: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
  }
];

// Get all virtual cards for a user
router.get('/', authenticate, (req: AuthenticatedRequest, res) => {
  const userCards = virtualCards.filter(card => card.userId === req.user?.userId);
  // Don't send sensitive data
  const sanitizedCards = userCards.map(({ number, cvv, ...card }) => card);
  res.json(sanitizedCards);
});

// Create a new virtual card
router.post('/', authenticate, (req: AuthenticatedRequest, res) => {
  const { name, spendLimit, customerId, agentName, metadata = {}, merchantCategories = [] } = req.body;

  const newCard = {
    id: uuidv4(),
    userId: req.user?.userId,
    name,
    number: generateCardNumber(),
    lastFour: '4242',
    expiryDate: generateExpiryDate(),
    cvv: '123',
    status: 'active',
    balance: spendLimit,
    spendLimit,
    frozen: false,
    merchantControls: {
      allowedCategories: merchantCategories,
      blockedCategories: [],
      maxAmountPerMerchant: {
        'Google Ads': 0,
        'Facebook Ads': 0
      }
    },
    transactions: [],
    merchantCategories,
    customerId,
    metadata: {
      ...metadata,
      agent_name: agentName,
      created_at: new Date().toISOString()
    },
    createdAt: new Date().toISOString(),
  };

  virtualCards.push(newCard);
  const { number, cvv, ...sanitizedCard } = newCard;
  res.status(201).json(sanitizedCard);
});

// Get card number (secured endpoint)
router.post('/:id/number', authenticate, (req: AuthenticatedRequest, res) => {
  const card = virtualCards.find(
    (c) => c.id === req.params.id && c.userId === req.user?.userId
  );

  if (!card) {
    return res.status(404).json({ message: 'Card not found' });
  }

  res.json({
    number: card.number,
    cvv: card.cvv,
  });
});

// Update card status (freeze/unfreeze)
router.patch('/:id/status', authenticate, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { frozen } = req.body;

  const cardIndex = virtualCards.findIndex(card => card.id === id && card.userId === req.user?.userId);

  if (cardIndex === -1) {
    return res.status(404).json({ message: 'Card not found' });
  }

  if (typeof frozen !== 'boolean') {
    return res.status(400).json({ message: 'Invalid frozen status' });
  }

  virtualCards[cardIndex] = { ...virtualCards[cardIndex], frozen };

  res.json(virtualCards[cardIndex]);
});

// Update spend limit
// Update card association (customer ID and agent type)
router.patch('/:id/association', authenticate, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { customerId, agentName, metadata } = req.body;

  const cardIndex = virtualCards.findIndex(card => card.id === id && card.userId === req.user?.userId);
  if (cardIndex === -1) {
    return res.status(404).json({ message: 'Card not found' });
  }

  // Update the card
  virtualCards[cardIndex] = {
    ...virtualCards[cardIndex],
    customerId,
    metadata: {
      ...virtualCards[cardIndex].metadata,
      ...metadata,
      agent_name: agentName
    }
  };

  res.json(virtualCards[cardIndex]);
});

router.patch('/:id/limit', authenticate, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { spendLimit } = req.body;

  const cardIndex = virtualCards.findIndex(card => card.id === id && card.userId === req.user?.userId);

  if (cardIndex === -1) {
    return res.status(404).json({ message: 'Card not found' });
  }

  if (typeof spendLimit !== 'number' || spendLimit < 0) {
    return res.status(400).json({ message: 'Invalid spendLimit' });
  }

  virtualCards[cardIndex] = { ...virtualCards[cardIndex], spendLimit };

  res.json(virtualCards[cardIndex]);
});
