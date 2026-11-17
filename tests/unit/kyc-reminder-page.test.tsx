/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import KYCVerificationPage from '@/app/dashboard/kyc-verification/page';
import { useAuthStore } from '@/store/authStore';

const { getAll, getStats, sendReminder } = vi.hoisted(() => ({
  getAll: vi.fn(),
  getStats: vi.fn(),
  sendReminder: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  kycApi: { getAll, getStats, sendReminder },
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/components/Sidebar', () => ({ default: () => <aside /> }));
vi.mock('@/components/DashboardHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));

describe('KYC verification manual reminder form', () => {
  beforeEach(() => {
    getAll.mockReset().mockResolvedValue({ status: true, data: { data: [], meta: {} } });
    getStats.mockReset().mockResolvedValue({ status: true, data: { kyc: {}, kyb: {} } });
    sendReminder.mockReset().mockResolvedValue({ status: true, message: 'Verification reminder sent.' });
    useAuthStore.setState({ isAuthenticated: true });
  });

  it('submits the selected reminder type and shows the backend success message', async () => {
    render(<KYCVerificationPage />);

    fireEvent.change(screen.getByLabelText('Customer email'), { target: { value: 'pending@example.test' } });
    fireEvent.change(screen.getByLabelText('Reminder type'), { target: { value: 'bridge_kyc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reminder' }));

    await waitFor(() => expect(sendReminder).toHaveBeenCalledWith({
      email: 'pending@example.test',
      type: 'bridge_kyc',
    }));
    expect((await screen.findByRole('status')).textContent).toBe('Verification reminder sent.');
  });
});
