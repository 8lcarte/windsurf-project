import { Request, Response } from 'express';
import { Receipt, IReceipt } from '../models/Receipt';

export const receiptController = {
  // Submit a new receipt
  async submit(req: Request, res: Response) {
    try {
      const { transactionId, agentId, content, metadata, transaction } = req.body;
      
      // Validate the receipt
      const validationResult = await ReceiptValidationService.validateReceipt(
        { agentId, content, metadata },
        transaction
      );

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          errors: validationResult.errors
        });
      }
      
      const receipt = new Receipt({
        transactionId,
        agentId,
        content,
        metadata: {
          ...metadata,
          timestamp: new Date(metadata.timestamp)
        }
      });

      await receipt.save();
      
      res.status(201).json({
        success: true,
        data: receipt
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get receipt by transaction ID
  async getByTransactionId(req: Request, res: Response) {
    try {
      const { transactionId } = req.params;
      const receipt = await Receipt.findOne({ transactionId });
      
      if (!receipt) {
        return res.status(404).json({
          success: false,
          error: 'Receipt not found'
        });
      }

      res.status(200).json({
        success: true,
        data: receipt
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },

  // Get all receipts for an agent
  async getByAgentId(req: Request, res: Response) {
    try {
      const { agentId } = req.params;
      const receipts = await Receipt.find({ agentId });
      
      res.status(200).json({
        success: true,
        data: receipts
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
};
