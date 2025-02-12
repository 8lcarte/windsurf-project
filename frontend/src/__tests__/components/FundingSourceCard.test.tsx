import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FundingSourceCard } from '../../components/Integrations/FundingSourceCard';
import { PaymentRounded } from '@mui/icons-material';

describe('FundingSourceCard', () => {
  const defaultProps = {
    name: 'PayPal',
    description: 'Connect your PayPal account',
    icon: PaymentRounded,
    connected: false,
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when not connected', () => {
    render(<FundingSourceCard {...defaultProps} />);

    expect(screen.getByText('PayPal')).toBeInTheDocument();
    expect(screen.getByText('Connect your PayPal account')).toBeInTheDocument();
    expect(screen.getByText('Not Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
  });

  it('renders correctly when connected', () => {
    render(<FundingSourceCard {...defaultProps} connected={true} />);

    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disconnect' })).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<FundingSourceCard {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows polling state', () => {
    render(<FundingSourceCard {...defaultProps} isPolling={true} />);

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('displays error message', () => {
    const error = {
      message: 'Failed to connect',
      code: 'ERR_CONNECTION',
    };

    render(<FundingSourceCard {...defaultProps} error={error} />);

    expect(screen.getByText('Failed to connect')).toBeInTheDocument();
  });

  it('calls onConnect when connect button is clicked', () => {
    render(<FundingSourceCard {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Connect' }));

    expect(defaultProps.onConnect).toHaveBeenCalled();
  });

  it('calls onDisconnect when disconnect button is clicked', () => {
    render(<FundingSourceCard {...defaultProps} connected={true} />);

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

    expect(defaultProps.onDisconnect).toHaveBeenCalled();
  });

  it('calls onRetry when retry button is clicked', () => {
    const onRetry = jest.fn();
    const error = {
      message: 'Failed to connect',
      code: 'ERR_CONNECTION',
    };

    render(
      <FundingSourceCard {...defaultProps} error={error} onRetry={onRetry} />
    );

    fireEvent.click(screen.getByTitle('Retry'));

    expect(onRetry).toHaveBeenCalled();
  });

  it('disables buttons when in loading or polling state', () => {
    const { rerender } = render(
      <FundingSourceCard {...defaultProps} isLoading={true} />
    );
    expect(screen.getByRole('button')).toBeDisabled();

    rerender(<FundingSourceCard {...defaultProps} isPolling={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
