import express from 'express';
import { transactionController } from '../controllers/transactionController';

export const transactionsRouter = express.Router();

// Create a new transaction (with optional receipt)
transactionsRouter.post('/', transactionController.createTransaction);
