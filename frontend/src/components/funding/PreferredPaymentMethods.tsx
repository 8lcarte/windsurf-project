import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { PlusIcon, XMarkIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { PayPalIcon, VenmoIcon, CashAppIcon } from '../icons/WalletIcons';
import { useToast } from '../../hooks/useToast';

interface PaymentMethod {
  id: string;
  provider: 'paypal' | 'venmo' | 'cashapp';
  name: string;
  details: string;
  isDefault: boolean;
  lastUsed?: string;
}

export const PreferredPaymentMethods: React.FC = () => {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentMethod['provider']>('paypal');
  const { showToast } = useToast();

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/v1/funding/payment-methods');
      const data = await response.json();
      if (data.success) {
        setMethods(data.data);
      }
    } catch (error) {
      showToast('Failed to fetch payment methods', 'error');
    }
  };

  const handleSetDefault = async (methodId: string) => {
    try {
      const response = await fetch(`/api/v1/funding/payment-methods/${methodId}/default`, {
        method: 'PUT'
      });
      
      const data = await response.json();
      if (data.success) {
        showToast('Default payment method updated', 'success');
        fetchPaymentMethods();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleRemove = async (methodId: string) => {
    if (!confirm('Are you sure you want to remove this payment method?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/funding/payment-methods/${methodId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        showToast('Payment method removed successfully', 'success');
        fetchPaymentMethods();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleAddMethod = async () => {
    try {
      // This would typically integrate with the provider's SDK/API
      const response = await fetch('/api/v1/funding/payment-methods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: selectedProvider
        })
      });
      
      const data = await response.json();
      if (data.success) {
        showToast('Payment method added successfully', 'success');
        setIsModalOpen(false);
        fetchPaymentMethods();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'paypal':
        return <PayPalIcon className="w-6 h-6" />;
      case 'venmo':
        return <VenmoIcon className="w-6 h-6" />;
      case 'cashapp':
        return <CashAppIcon className="w-6 h-6" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:p-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Preferred Payment Methods
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Manage your preferred payment methods for quick funding
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Add Payment Method
            </button>
          </div>
        </div>

        <div className="mt-8 space-y-4">
          {methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex items-center space-x-4">
                {getProviderIcon(method.provider)}
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{method.name}</h4>
                  <p className="text-sm text-gray-500">{method.details}</p>
                  {method.lastUsed && (
                    <p className="text-xs text-gray-400">
                      Last used: {new Date(method.lastUsed).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => handleSetDefault(method.id)}
                  className="text-gray-400 hover:text-yellow-500"
                  title={method.isDefault ? 'Default payment method' : 'Set as default'}
                >
                  {method.isDefault ? (
                    <StarSolidIcon className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <StarOutlineIcon className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => handleRemove(method.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="fixed inset-0 z-10 overflow-y-auto"
      >
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

          <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
            <div className="flex items-center justify-between">
              <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">
                Add Payment Method
              </Dialog.Title>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="mt-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Select Provider
                  </label>
                  <div className="mt-4 grid grid-cols-3 gap-4">
                    {(['paypal', 'venmo', 'cashapp'] as const).map((provider) => (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => setSelectedProvider(provider)}
                        className={`flex flex-col items-center p-4 border rounded-lg ${
                          selectedProvider === provider
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {getProviderIcon(provider)}
                        <span className="mt-2 text-sm font-medium text-gray-900">
                          {provider.charAt(0).toUpperCase() + provider.slice(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleAddMethod}
                  className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
