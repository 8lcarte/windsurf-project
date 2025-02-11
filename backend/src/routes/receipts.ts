import express from 'express';
import { receiptController } from '../controllers/receiptController';

export const receiptsRouter = express.Router();

// Submit a new receipt
receiptsRouter.post('/', receiptController.submit);

// Get receipt by transaction ID
receiptsRouter.get('/transaction/:transactionId', receiptController.getByTransactionId);

// Get all receipts for an agent
receiptsRouter.get('/agent/:agentId', receiptController.getByAgentId);
