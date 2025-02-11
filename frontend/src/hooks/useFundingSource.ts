import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export interface FundingSource {
  id: string;
  name: string;
  provider: 'paypal' | 'venmo' | 'cashapp';
  connected: boolean;
  accountId?: string;
  lastUsed?: string;
}

interface ConnectResponse {
  url: string;
  state: string;
}

const API_URL = import.meta.env.VITE_API_URL;

export function useFundingSource() {
  const queryClient = useQueryClient();
  const [connectWindow, setConnectWindow] = useState<Window | null>(null);

  // Default funding sources
  const defaultSources: FundingSource[] = [
    {
      id: 'paypal',
      provider: 'paypal',
      connected: false,
      name: 'PayPal'
    },
    {
      id: 'venmo',
      provider: 'venmo',
      connected: false,
      name: 'Venmo'
    },
    {
      id: 'cashapp',
      provider: 'cashapp',
      connected: false,
      name: 'Cash App'
    }
  ];

  // Fetch all funding sources
  const { data: fundingSources = defaultSources, isLoading } = useQuery({
    queryKey: ['fundingSources'],
    queryFn: async () => {
      const { data } = await axios.get<FundingSource[]>(`${API_URL}/api/v1/funding/sources`);
      return data;
    },
  });

  // Start OAuth connection flow
  const connectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const { data } = await axios.post<ConnectResponse>(
        `${API_URL}/api/v1/funding/connect/${provider}`
      );
      return data;
    },
    onSuccess: (data) => {
      // Open OAuth window
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const newWindow = window.open(
        data.url,
        'Connect Funding Source',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      setConnectWindow(newWindow);

      // Poll for connection status
      const checkConnection = setInterval(async () => {
        try {
          if (newWindow?.closed) {
            clearInterval(checkConnection);
            queryClient.invalidateQueries({ queryKey: ['fundingSources'] });
          }
        } catch (error) {
          clearInterval(checkConnection);
        }
      }, 1000);
    },
  });

  // Disconnect funding source
  const disconnectMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      await axios.delete(`${API_URL}/api/v1/funding/sources/${sourceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fundingSources'] });
    },
  });

  const connect = useCallback(
    async (provider: string) => {
      await connectMutation.mutateAsync(provider);
    },
    [connectMutation]
  );

  const disconnect = useCallback(
    async (sourceId: string) => {
      await disconnectMutation.mutateAsync(sourceId);
    },
    [disconnectMutation]
  );

  return {
    fundingSources,
    isLoading,
    connect,
    disconnect,
    isConnecting: connectMutation.isPending,
    isDisconnecting: disconnectMutation.isPending,
  };
}
