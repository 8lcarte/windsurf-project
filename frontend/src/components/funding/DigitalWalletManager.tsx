import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { PlusIcon, CreditCardIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { PayPalIcon, VenmoIcon, CashAppIcon } from '../icons/WalletIcons';
import { AddFundsModal } from './AddFundsModal';
import { WalletBalance } from './WalletBalance';
import { useToast } from '../../hooks/useToast';

interface DigitalWallet {
  id: string;
  provider: 'paypal' | 'venmo' | 'cashapp';
  name: string;
  status: 'active' | 'inactive';
  balance?: {
    amount: number;
    currency: string;
  };
}

export const DigitalWalletManager: React.FC = () => {
  const [wallets, setWallets] = useState<DigitalWallet[]>([]);
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<DigitalWallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const response = await fetch('/api/v1/integrations?type=digital_wallet');
      const data = await response.json();
      if (data.success) {
        setWallets(data.data);
      }
    } catch (error) {
      showToast('Error loading wallets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBalance = async (wallet: DigitalWallet) => {
    try {
      const response = await fetch(
        `/api/v1/funding/${wallet.provider}/${wallet.id}/balance`
      );
      const data = await response.json();
      if (data.success) {
        setWallets(current =>
          current.map(w =>
            w.id === wallet.id
              ? { ...w, balance: data.data.balance }
              : w
          )
        );
      }
    } catch (error) {
      showToast('Error refreshing balance', 'error');
    }
  };

  const handleAddFunds = (wallet: DigitalWallet) => {
    setSelectedWallet(wallet);
    setIsAddingFunds(true);
  };

  const getWalletIcon = (provider: string) => {
    switch (provider) {
      case 'paypal':
        return <PayPalIcon className="w-6 h-6" />;
      case 'venmo':
        return <VenmoIcon className="w-6 h-6" />;
      case 'cashapp':
        return <CashAppIcon className="w-6 h-6" />;
      default:
        return <CreditCardIcon className="w-6 h-6" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Digital Wallets
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage your connected digital wallets and add funds to your card
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              type="button"
              onClick={() => {/* Implement wallet connection flow */}}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Connect Wallet
            </button>
          </div>
        </div>

        <div className="mt-8">
          <Tab.Group>
            <Tab.List className="flex p-1 space-x-1 bg-primary-100/20 rounded-xl">
              {['Active', 'Inactive'].map((category) => (
                <Tab
                  key={category}
                  className={({ selected }) =>
                    `w-full py-2.5 text-sm font-medium leading-5 text-primary-700 rounded-lg
                    focus:outline-none focus:ring-2 ring-offset-2 ring-offset-primary-400 ring-white ring-opacity-60
                    ${
                      selected
                        ? 'bg-white shadow'
                        : 'text-primary-600 hover:bg-white/[0.12] hover:text-primary-700'
                    }`
                  }
                >
                  {category}
                </Tab>
              ))}
            </Tab.List>
            <Tab.Panels className="mt-4">
              <Tab.Panel className="space-y-4">
                {wallets
                  .filter(wallet => wallet.status === 'active')
                  .map(wallet => (
                    <div
                      key={wallet.id}
                      className="p-4 bg-white border rounded-lg shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getWalletIcon(wallet.provider)}
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">
                              {wallet.name}
                            </h4>
                            <p className="text-sm text-gray-500">
                              {wallet.provider.charAt(0).toUpperCase() + wallet.provider.slice(1)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <WalletBalance
                            balance={wallet.balance}
                            onRefresh={() => refreshBalance(wallet)}
                          />
                          <button
                            onClick={() => handleAddFunds(wallet)}
                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                          >
                            Add Funds
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </Tab.Panel>
              <Tab.Panel className="space-y-4">
                {wallets
                  .filter(wallet => wallet.status === 'inactive')
                  .map(wallet => (
                    <div
                      key={wallet.id}
                      className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getWalletIcon(wallet.provider)}
                          <div>
                            <h4 className="text-sm font-medium text-gray-500">
                              {wallet.name}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {wallet.provider.charAt(0).toUpperCase() + wallet.provider.slice(1)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {/* Implement reactivation */}}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                          Reactivate
                        </button>
                      </div>
                    </div>
                  ))}
              </Tab.Panel>
            </Tab.Panels>
          </Tab.Group>
        </div>
      </div>

      <AddFundsModal
        isOpen={isAddingFunds}
        onClose={() => {
          setIsAddingFunds(false);
          setSelectedWallet(null);
        }}
        wallet={selectedWallet}
      />
    </div>
  );
};
