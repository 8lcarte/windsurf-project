import { Receipt } from '../models/Receipt';

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class ReceiptValidationService {
  static async validateReceipt(receipt: any, transaction: any): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // 1. Validate total amount matches sum of line items
    if (receipt.metadata.items) {
      const calculatedTotal = receipt.metadata.items.reduce(
        (sum: number, item: any) => sum + (item.quantity * item.unitPrice),
        0
      );
      
      // Allow for small floating point differences (within 1 cent)
      if (Math.abs(calculatedTotal - receipt.metadata.totalAmount) > 0.01) {
        errors.push({
          field: 'totalAmount',
          message: `Total amount ${receipt.metadata.totalAmount} doesn't match sum of line items ${calculatedTotal}`
        });
      }
    }

    // 2. Check for duplicate receipts
    const existingReceipt = await Receipt.findOne({
      'metadata.timestamp': receipt.metadata.timestamp,
      'metadata.merchantName': receipt.metadata.merchantName,
      'metadata.totalAmount': receipt.metadata.totalAmount,
      agentId: receipt.agentId
    });

    if (existingReceipt) {
      errors.push({
        field: 'receipt',
        message: 'A receipt with identical details already exists'
      });
    }

    // 3. Validate merchant name consistency
    if (transaction.merchantName && 
        transaction.merchantName.toLowerCase() !== receipt.metadata.merchantName.toLowerCase()) {
      errors.push({
        field: 'merchantName',
        message: 'Merchant name in receipt doesn\'t match transaction merchant name'
      });
    }

    // 4. Currency validation
    const supportedCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
    if (!supportedCurrencies.includes(receipt.metadata.currency)) {
      errors.push({
        field: 'currency',
        message: `Unsupported currency: ${receipt.metadata.currency}`
      });
    }

    // 5. Timestamp validation
    const receiptDate = new Date(receipt.metadata.timestamp);
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    if (isNaN(receiptDate.getTime())) {
      errors.push({
        field: 'timestamp',
        message: 'Invalid timestamp format'
      });
    } else if (receiptDate > now) {
      errors.push({
        field: 'timestamp',
        message: 'Receipt timestamp cannot be in the future'
      });
    } else if (receiptDate < oneYearAgo) {
      errors.push({
        field: 'timestamp',
        message: 'Receipt is too old (more than 1 year)'
      });
    }

    // 6. Line item validation
    if (receipt.metadata.items) {
      receipt.metadata.items.forEach((item: any, index: number) => {
        if (item.quantity <= 0) {
          errors.push({
            field: `items[${index}].quantity`,
            message: 'Quantity must be greater than 0'
          });
        }
        if (item.unitPrice < 0) {
          errors.push({
            field: `items[${index}].unitPrice`,
            message: 'Unit price cannot be negative'
          });
        }
        if (Math.abs(item.quantity * item.unitPrice - item.totalPrice) > 0.01) {
          errors.push({
            field: `items[${index}].totalPrice`,
            message: 'Item total price doesn\'t match quantity * unit price'
          });
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
