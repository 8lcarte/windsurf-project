import { Receipt } from '../models/Receipt';
import { ReceiptValidationService } from './receiptValidationService';

interface TransactionReceipt {
  content: string;
  metadata: {
    timestamp: string;
    merchantName: string;
    totalAmount: number;
    currency: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  };
}

interface CreateTransactionInput {
  agentId: string;
  amount: number;
  description: string;
  merchantName: string;
  cardId: string;
  category?: string;
  receipt?: TransactionReceipt;
}

export const transactionService = {
  async createTransaction(input: CreateTransactionInput) {
    try {
      // Note: This is a placeholder for your actual transaction creation logic
      const transaction = {
        id: `txn_${Date.now()}`, // Replace with your actual ID generation
        date: new Date().toISOString(),
        description: input.description,
        amount: input.amount,
        status: 'completed' as const,
        type: 'debit' as const,
        cardId: input.cardId,
        merchantName: input.merchantName,
        category: input.category,
      };

      // If receipt data is provided, validate and create a receipt record
      if (input.receipt) {
        // Validate the receipt
        const validationResult = await ReceiptValidationService.validateReceipt(
          {
            agentId: input.agentId,
            content: input.receipt.content,
            metadata: input.receipt.metadata
          },
          transaction
        );

        if (!validationResult.isValid) {
          throw new Error(`Receipt validation failed: ${JSON.stringify(validationResult.errors)}`);
        }

        const receipt = new Receipt({
          transactionId: transaction.id,
          agentId: input.agentId,
          content: input.receipt.content,
          metadata: input.receipt.metadata,
        });

        await receipt.save();
      }

      // Return the transaction with the receipt
      return {
        ...transaction,
        receipt: input.receipt,
      };
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  },

  // Example usage for AI agents:
  /*
  const transaction = await transactionService.createTransaction({
    agentId: 'agent_123',
    amount: 42.99,
    description: 'Office supplies purchase',
    merchantName: 'Office Depot',
    cardId: 'card_456',
    category: 'office_supplies',
    receipt: {
      content: `
        Office Depot
        123 Business Ave
        
        Paper Clips (2x) - $2.99
        Printer Paper (1x) - $35.00
        Pens (1x) - $5.00
        
        Total: $42.99
      `,
      metadata: {
        timestamp: '2025-02-11T11:45:00Z',
        merchantName: 'Office Depot',
        totalAmount: 42.99,
        currency: 'USD',
        items: [
          {
            description: 'Paper Clips',
            quantity: 2,
            unitPrice: 2.99,
            totalPrice: 5.98
          },
          {
            description: 'Printer Paper',
            quantity: 1,
            unitPrice: 35.00,
            totalPrice: 35.00
          },
          {
            description: 'Pens',
            quantity: 1,
            unitPrice: 5.00,
            totalPrice: 5.00
          }
        ]
      }
    }
  });
  */
};
