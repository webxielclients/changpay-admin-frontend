/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsersPage from '@/app/dashboard/users/page';
import { useAuthStore } from '@/store/authStore';
import type { AdminUserRecord } from '@/lib/api/client';

const { getUsers, getOverview, sendBulkReminders, push } = vi.hoisted(() => ({
  getUsers: vi.fn(),
  getOverview: vi.fn(),
  sendBulkReminders: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  dashboardApi: { getOverview },
  usersApi: { getUsers, updateStatus: vi.fn() },
  kycApi: { sendBulkReminders },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/components/Sidebar', () => ({ default: () => <aside /> }));
vi.mock('@/components/DashboardHeader', () => ({ default: ({ title }: { title: string }) => <h1>{title}</h1> }));

const makeUser = (publicId: string, email: string): AdminUserRecord => ({
  id: publicId,
  publicId,
  email,
  first_name: 'Test',
  last_name: 'Customer',
  phone_number: null,
  dob: null,
  country: null,
  state: null,
  city: null,
  address: null,
  email_verified_at: null,
  created_at: '2026-11-01T00:00:00Z',
  updated_at: '2026-11-01T00:00:00Z',
  google_id: null,
  apple_id: null,
  kyc_status: 'pending',
  kyb_status: null,
  deleted_at: null,
  changpay_id: null,
  is_active: true,
  last_login_at: null,
  balances: { USD: '0.00', NGN: '0.00', YUAN: '0.00' },
});

describe('User Management bulk verification reminders', () => {
  beforeEach(() => {
    getUsers.mockReset().mockResolvedValue({
      status: true,
      data: {
        data: [makeUser('user-1', 'one@example.test'), makeUser('user-2', 'two@example.test')],
        links: { first: null, last: null, prev: null, next: null },
        meta: { current_page: 1, from: 1, last_page: 1, links: [], path: '/users', per_page: 10, to: 2, total: 2 },
      },
    });
    getOverview.mockReset().mockResolvedValue({ data: { users: { total: 2, active: 2, verified: 0, pending: 2 } } });
    sendBulkReminders.mockReset().mockResolvedValue({
      status: true,
      message: 'Verification reminders processed.',
      data: { requested: 2, sent: 2, reminders_sent: 3, already_sent: 0, not_pending: 0, failed: 0, results: [] },
    });
    useAuthStore.setState({ isAuthenticated: true });
  });

  it('sends both reminder types for multiple selected users and displays the summary', async () => {
    render(<UsersPage />);

    const selectAll = await screen.findByRole('checkbox', { name: 'Select all users on this page' });
    fireEvent.click(selectAll);
    fireEvent.click(screen.getByRole('button', { name: 'Send reminders' }));

    await waitFor(() => expect(sendBulkReminders).toHaveBeenCalledWith({
      user_ids: ['user-1', 'user-2'],
      types: ['ngn_kyc', 'bridge_kyc'],
    }));
    expect((await screen.findByRole('status')).textContent).toContain('Sent 3 reminder type(s) to 2 user(s).');
  });
});
