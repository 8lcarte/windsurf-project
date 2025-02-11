import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface WalletBalanceProps {
  balance?: {
    amount: number;
    currency: string;
  };
  onRefresh: () => void;
}

export const WalletBalance: React.FC<WalletBalanceProps> = ({
  balance,
  onRefresh,
}) => {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="text-sm">
        <span className="text-gray-500">Balance: </span>
        <span className="font-medium text-gray-900">
          {balance
            ? formatCurrency(balance.amount, balance.currency)
            : '---'}
        </span>
      </div>
      <button
        onClick={onRefresh}
        className="p-1 text-gray-400 hover:text-gray-500"
        title="Refresh balance"
      >
        <ArrowPathIcon className="w-4 h-4" />
      </button>
    </div>
  );
};
