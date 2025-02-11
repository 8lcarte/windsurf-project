import { Request, Response } from 'express';
import { transactionService } from '../services/transactionService';

export const transactionController = {
  async createTransaction(req: Request, res: Response) {
    try {
      const transaction = await transactionService.createTransaction(req.body);
      res.status(201).json({
        success: true,
        data: transaction
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
};
