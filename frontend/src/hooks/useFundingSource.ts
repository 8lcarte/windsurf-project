import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { client as api } from '../api/client';
import { useSnackbar } from 'notistack';

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

export type FundingSourceError = {
  message: string;
  code?: string;
  provider?: string;
};

export function useFundingSource() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [connectWindow, setConnectWindow] = useState<Window | null>(null);
  const [error, setError] = useState<FundingSourceError | null>(null);
  const [isPolling, setIsPolling] = useState(false);

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
  const { 
    data: fundingSources = defaultSources, 
    isLoading,
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['fundingSources'],
    queryFn: async () => {
      try {
        const { data } = await api.get<FundingSource[]>('/funding/sources');
        setError(null);
        return data;
      } catch (err) {
        const error = err as AxiosError;
        const errorMessage = {
          message: 'Failed to fetch funding sources',
          code: error.code,
        };
        setError(errorMessage);
        throw error;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Start OAuth connection flow
  const connectMutation = useMutation({
    mutationFn: async (provider: string) => {
      try {
        const { data } = await api.post<ConnectResponse>(`/funding/connect/${provider}`);
        setError(null);
        return data;
      } catch (err) {
        const error = err as AxiosError;
        const errorMessage = {
          message: 'Failed to initiate connection',
          code: error.code,
          provider
        };
        setError(errorMessage);
        throw error;
      }
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
      
      if (!newWindow) {
        enqueueSnackbar('Please allow pop-ups to connect your funding source', { 
          variant: 'warning' 
        });
        return;
      }

      setConnectWindow(newWindow);
      setIsPolling(true);

      // Poll for connection status
      const checkConnection = setInterval(async () => {
        try {
          if (newWindow.closed) {
            clearInterval(checkConnection);
            setIsPolling(false);
            queryClient.invalidateQueries({ queryKey: ['fundingSources'] });
          }
        } catch (error) {
          clearInterval(checkConnection);
          setIsPolling(false);
          setError({
            message: 'Connection window was closed unexpectedly',
            provider: data.provider
          });
        }
      }, 1000);
    },
    onError: (error: AxiosError) => {
      enqueueSnackbar('Failed to connect funding source. Please try again.', { 
        variant: 'error' 
      });
    }
  });

  // Disconnect funding source
  const disconnectMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      try {
        await api.delete(`/funding/sources/${sourceId}`);
        setError(null);
      } catch (err) {
        const error = err as AxiosError;
        const errorMessage = {
          message: 'Failed to disconnect funding source',
          code: error.code
        };
        setError(errorMessage);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fundingSources'] });
      enqueueSnackbar('Successfully disconnected funding source', { 
        variant: 'success' 
      });
    },
    onError: (error: AxiosError) => {
      enqueueSnackbar('Failed to disconnect funding source. Please try again.', { 
        variant: 'error' 
      });
    }
  });

  // Cleanup effect
  useEffect(() => {
    return () => {
      connectWindow?.close();
      setIsPolling(false);
    };
  }, [connectWindow]);

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
