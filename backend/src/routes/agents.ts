import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const router = Router();

// Mock data for development
let agents = [
  {
    id: 1,
    name: 'Payment Processor',
    description: 'Handles payment processing and validation',
    status: 'active',
    type: 'payment',
    daily_spend_limit: 1000,
    current_daily_spend: 250,
    monthly_spend_limit: 25000,
    current_monthly_spend: 5000,
    total_transactions: 150,
    success_rate: 98.5,
    risk_level: 'low',
    last_transaction_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    allowed_merchant_categories: ['retail', 'software'],
    blocked_merchant_categories: ['gambling'],
    allowed_merchants: ['Amazon', 'Microsoft'],
    blocked_merchants: [],
    behavioral_patterns: [
      {
        type: 'spending_pattern',
        description: 'Regular business hours transactions',
        confidence: 0.95,
        detected_at: new Date().toISOString()
      }
    ],
    risk_metrics: {
      amount_volatility: 0.2,
      merchant_diversity: 0.7,
      geographic_spread: 0.3,
      time_pattern_consistency: 0.9,
      transaction_frequency: 0.6
    },
    recent_transactions: [
      {
        id: 1,
        amount: 150.00,
        merchant_name: 'Amazon Web Services',
        merchant_category: 'software',
        status: 'completed',
        risk_level: 'low',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        amount: 75.50,
        merchant_name: 'Microsoft Azure',
        merchant_category: 'software',
        status: 'completed',
        risk_level: 'low',
        created_at: new Date().toISOString()
      }
    ]
  }
];

// GET /api/v1/agents
router.get('/', (req, res) => {
  res.json({ success: true, data: agents });
});

// GET /api/v1/agents/:id
router.get('/:id', (req, res) => {
  const agent = agents.find(a => a.id === parseInt(req.params.id));
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
        details: { id: req.params.id }
      }
    });
  }
  res.json({ success: true, data: agent });
});

// POST /api/v1/agents
router.post('/', (req, res) => {
  const {
    name,
    description,
    type,
    daily_spend_limit,
    monthly_spend_limit,
    allowed_merchant_categories = [],
    blocked_merchant_categories = []
  } = req.body;

  // Validate required fields
  if (!name || !description || !type || !daily_spend_limit || !monthly_spend_limit) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Missing required fields',
        details: {
          required: ['name', 'description', 'type', 'daily_spend_limit', 'monthly_spend_limit']
        }
      }
    });
  }

  const newAgent = {
    id: agents.length + 1,
    name,
    description,
    status: 'active',
    type,
    daily_spend_limit,
    current_daily_spend: 0,
    monthly_spend_limit,
    current_monthly_spend: 0,
    total_transactions: 0,
    success_rate: 100,
    risk_level: 'low',
    last_transaction_at: null,
    created_at: new Date().toISOString(),
    allowed_merchant_categories,
    blocked_merchant_categories,
    allowed_merchants: [],
    blocked_merchants: [],
    behavioral_patterns: [],
    risk_metrics: {
      amount_volatility: 0,
      merchant_diversity: 0,
      geographic_spread: 0,
      time_pattern_consistency: 1,
      transaction_frequency: 0
    },
    recent_transactions: []
  };

  agents.push(newAgent);
  res.status(201).json({ success: true, data: newAgent });
});

// PATCH /api/v1/agents/:id
router.patch('/:id', (req, res) => {
  const agent = agents.find(a => a.id === parseInt(req.params.id));
  if (!agent) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
        details: { id: req.params.id }
      }
    });
  }

  // Update allowed fields
  const allowedUpdates = [
    'name',
    'description',
    'status',
    'daily_spend_limit',
    'monthly_spend_limit',
    'allowed_merchant_categories',
    'blocked_merchant_categories',
    'allowed_merchants',
    'blocked_merchants'
  ];

  Object.keys(req.body).forEach(key => {
    if (allowedUpdates.includes(key) && key in agent) {
      (agent as any)[key] = req.body[key];
    }
  });

  res.json({ success: true, data: agent });
});

// DELETE /api/v1/agents/:id
router.delete('/:id', (req, res) => {
  const index = agents.findIndex(a => a.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'AGENT_NOT_FOUND',
        message: 'Agent not found',
        details: { id: req.params.id }
      }
    });
  }

  agents = agents.filter(a => a.id !== parseInt(req.params.id));
  res.status(204).send();
});
