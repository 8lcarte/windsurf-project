import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { PlusIcon, XMarkIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { PayPalIcon, VenmoIcon, CashAppIcon } from '../icons/WalletIcons';
import { useToast } from '../../hooks/useToast';

interface RecurringPayment {
  id: string;
  amount: number;
  currency: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  provider: 'paypal' | 'venmo' | 'cashapp';
  description: string;
  nextPayment: string;
  active: boolean;
  emailNotifications: {
    enabled: boolean;
    reminderDays: number;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
  };
}

interface RecurringPaymentFormData {
  amount: string;
  currency: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  provider: 'paypal' | 'venmo' | 'cashapp';
  description: string;
  emailNotifications: {
    enabled: boolean;
    reminderDays: number;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
  };
}

export const RecurringFunding: React.FC = () => {
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<RecurringPayment | null>(null);
  const [formData, setFormData] = useState<RecurringPaymentFormData>({
    amount: '',
    currency: 'USD',
    frequency: 'monthly',
    provider: 'paypal',
    description: '',
    emailNotifications: {
      enabled: true,
      reminderDays: 1,
      notifyOnSuccess: true,
      notifyOnFailure: true
    }
  });
  const { showToast } = useToast();

  useEffect(() => {
    fetchRecurringPayments();
  }, []);

  const fetchRecurringPayments = async () => {
    try {
      const response = await fetch('/api/v1/funding/recurring');
      const data = await response.json();
      if (data.success) {
        setPayments(data.data);
      }
    } catch (error) {
      showToast('Failed to fetch recurring payments', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const endpoint = editingPayment
        ? `/api/v1/funding/recurring/${editingPayment.id}`
        : '/api/v1/funding/recurring';
      
      const response = await fetch(endpoint, {
        method: editingPayment ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        })
      });

      const data = await response.json();
      if (data.success) {
        showToast(
          `Recurring payment ${editingPayment ? 'updated' : 'created'} successfully`,
          'success'
        );
        fetchRecurringPayments();
        setIsModalOpen(false);
        resetForm();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this recurring payment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/funding/recurring/${paymentId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        showToast('Recurring payment deleted successfully', 'success');
        fetchRecurringPayments();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleEdit = (payment: RecurringPayment) => {
    setEditingPayment(payment);
    setFormData({
      amount: payment.amount.toString(),
      currency: payment.currency,
      frequency: payment.frequency,
      provider: payment.provider,
      description: payment.description
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      currency: 'USD',
      frequency: 'monthly',
      provider: 'paypal',
      description: '',
      emailNotifications: {
        enabled: true,
        reminderDays: 1,
        notifyOnSuccess: true,
        notifyOnFailure: true
      }
    });
    setEditingPayment(null);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'paypal':
        return <PayPalIcon className="w-5 h-5" />;
      case 'venmo':
        return <VenmoIcon className="w-5 h-5" />;
      case 'cashapp':
        return <CashAppIcon className="w-5 h-5" />;
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
              Recurring Funding
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Set up automatic recurring payments to your card
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              New Recurring Payment
            </button>
          </div>
        </div>

        <div className="mt-8 flow-root">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
              <table className="min-w-full divide-y divide-gray-300">
                <thead>
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                      Provider
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Amount
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Frequency
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Next Payment
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Notifications
                    </th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        <div className="flex items-center">
                          {getProviderIcon(payment.provider)}
                          <span className="ml-2">
                            {payment.provider.charAt(0).toUpperCase() + payment.provider.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: payment.currency
                        }).format(payment.amount)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {payment.frequency.charAt(0).toUpperCase() + payment.frequency.slice(1)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(payment.nextPayment).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {payment.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div className="flex flex-col gap-1">
                          {payment.emailNotifications.enabled ? (
                            <>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {payment.emailNotifications.reminderDays} day reminder
                              </span>
                              {payment.emailNotifications.notifyOnSuccess && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Success notifications
                                </span>
                              )}
                              {payment.emailNotifications.notifyOnFailure && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Failure notifications
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Notifications disabled
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(payment)}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <PencilIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(payment.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
                {editingPayment ? 'Edit Recurring Payment' : 'New Recurring Payment'}
              </Dialog.Title>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4">
              <div className="space-y-4">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount
                  </label>
                  <div className="relative mt-1 rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      name="amount"
                      id="amount"
                      className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      min="0.01"
                      step="0.01"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">USD</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700">
                    Frequency
                  </label>
                  <select
                    id="frequency"
                    name="frequency"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                    Payment Provider
                  </label>
                  <select
                    id="provider"
                    name="provider"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    value={formData.provider}
                    onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
                  >
                    <option value="paypal">PayPal</option>
                    <option value="venmo">Venmo</option>
                    <option value="cashapp">Cash App</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    name="description"
                    id="description"
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Monthly card funding"
                  />
                </div>

                <div className="border-t border-gray-200 pt-4 mt-4">
                  <fieldset>
                    <legend className="text-sm font-medium text-gray-700">Email Notifications</legend>
                    <div className="mt-4 space-y-4">
                      <div className="flex items-start">
                        <div className="flex items-center h-5">
                          <input
                            id="notifications-enabled"
                            name="notifications-enabled"
                            type="checkbox"
                            checked={formData.emailNotifications.enabled}
                            onChange={(e) => setFormData({
                              ...formData,
                              emailNotifications: {
                                ...formData.emailNotifications,
                                enabled: e.target.checked
                              }
                            })}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor="notifications-enabled" className="font-medium text-gray-700">
                            Enable email notifications
                          </label>
                          <p className="text-gray-500">Receive updates about your recurring payments</p>
                        </div>
                      </div>

                      {formData.emailNotifications.enabled && (
                        <>
                          <div>
                            <label htmlFor="reminder-days" className="block text-sm font-medium text-gray-700">
                              Send reminder before payment (days)
                            </label>
                            <input
                              type="number"
                              name="reminder-days"
                              id="reminder-days"
                              min="0"
                              max="30"
                              value={formData.emailNotifications.reminderDays}
                              onChange={(e) => setFormData({
                                ...formData,
                                emailNotifications: {
                                  ...formData.emailNotifications,
                                  reminderDays: parseInt(e.target.value)
                                }
                              })}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                            />
                          </div>

                          <div className="flex items-start">
                            <div className="flex items-center h-5">
                              <input
                                id="notify-success"
                                name="notify-success"
                                type="checkbox"
                                checked={formData.emailNotifications.notifyOnSuccess}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  emailNotifications: {
                                    ...formData.emailNotifications,
                                    notifyOnSuccess: e.target.checked
                                  }
                                })}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label htmlFor="notify-success" className="font-medium text-gray-700">
                                Notify on successful payments
                              </label>
                            </div>
                          </div>

                          <div className="flex items-start">
                            <div className="flex items-center h-5">
                              <input
                                id="notify-failure"
                                name="notify-failure"
                                type="checkbox"
                                checked={formData.emailNotifications.notifyOnFailure}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  emailNotifications: {
                                    ...formData.emailNotifications,
                                    notifyOnFailure: e.target.checked
                                  }
                                })}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="ml-3 text-sm">
                              <label htmlFor="notify-failure" className="font-medium text-gray-700">
                                Notify on failed payments
                              </label>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </fieldset>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {editingPayment ? 'Update Payment' : 'Create Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
