import { Schema, model, Document } from 'mongoose';

export interface IReceipt extends Document {
  transactionId: string;
  agentId: string;
  content: string;
  metadata: {
    timestamp: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

const ReceiptSchema = new Schema({
  transactionId: { type: String, required: true, index: true },
  agentId: { type: String, required: true, index: true },
  content: { type: String, required: true },
  metadata: {
    timestamp: { type: Date, required: true },
    merchantName: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    currency: { type: String, required: true, default: 'USD' },
    items: [{
      description: { type: String, required: true },
      quantity: { type: Number, required: true },
      unitPrice: { type: Number, required: true },
      totalPrice: { type: Number, required: true }
    }]
  }
}, { timestamps: true });

export const Receipt = model<IReceipt>('Receipt', ReceiptSchema);
