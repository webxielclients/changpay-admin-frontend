import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { banksApi, dashboardApi, fxApi, kycApi, promotionsApi, rolesApi, supportApi, transactionsApi, usersApi, walletApi } from '@/lib/api/client';
import { treasuryRequest } from '@/lib/api/treasury';

describe('admin feature API contracts', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'admin-token', isAuthenticated: true });
  });

  it('sends authenticated requests for users, wallets, KYC, and treasury', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ status: true, message: 'ok', data: {} }), { status: 200 }));

    await usersApi.getUsers({ search: 'Ada', page: 2 });
    await walletApi.getStats();
    await kycApi.getStats();
    await treasuryRequest('treasury/operations/overview');

    const calls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calls).toEqual(expect.arrayContaining([
      '/api/proxy/users?search=Ada&page=2',
      '/api/proxy/wallets/stats',
      '/api/proxy/verifications/stats',
      '/api/proxy/treasury/operations/overview',
    ]));
    expect(fetchMock.mock.calls.every(([, options]) => {
      const headers = (options as RequestInit).headers as Record<string, string>;
      return headers.Authorization === 'Bearer admin-token';
    })).toBe(true);
    fetchMock.mockRestore();
  });

  it('keeps dashboard, FX, transactions, banks, roles, support, and promotions connected', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ status: true, message: 'ok', data: {} }), { status: 200 }));

    await dashboardApi.getOverview();
    await fxApi.getOverview();
    await transactionsApi.getStats();
    await banksApi.getProviderStats();
    await rolesApi.getRoles();
    await supportApi.getTicketStats();
    await promotionsApi.getStats();

    const calls = fetchMock.mock.calls.map(([url]) => String(url));
    expect(calls).toEqual(expect.arrayContaining([
      '/api/proxy/dashboard',
      '/api/proxy/fx/overview',
      '/api/proxy/transactions/stats',
      '/api/proxy/banks/providers',
      '/api/proxy/roles',
      '/api/proxy/support/tickets/stats',
      '/api/proxy/promotions/stats',
    ]));
    fetchMock.mockRestore();
  });

  it('surfaces permission failures instead of treating them as successful page data', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'Forbidden' }), { status: 403 }));

    await expect(walletApi.getStats()).rejects.toThrow('Forbidden');
    fetchMock.mockRestore();
  });

  it('normalizes public identifiers and never requests an undefined detail URL', async () => {
    const page = {
      data: [{ publicId: 'user-public-1', email: 'user@example.com' }],
      links: { first: null, last: null, prev: null, next: null },
      meta: { current_page: 1, from: 1, last_page: 1, links: [], path: '/users', per_page: 10, to: 1, total: 1 },
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/users?')) return new Response(JSON.stringify({ status: true, message: 'ok', data: page }), { status: 200 });
      return new Response(JSON.stringify({ status: true, message: 'ok', data: { publicId: 'tx-public-1' } }), { status: 200 });
    });

    const users = await usersApi.getUsers({ page: 1 });
    expect(users.data.data[0].id).toBe('user-public-1');
    expect(users.data.data[0].publicId).toBe('user-public-1');
    await usersApi.getUser(users.data.data[0].id);
    await transactionsApi.getOne('tx-public-1');
    await expect(transactionsApi.getOne(undefined as unknown as string)).rejects.toThrow('Missing public identifier');
    expect(fetchMock.mock.calls.map(([url]) => String(url)).some((url) => url.includes('/undefined'))).toBe(false);
    fetchMock.mockRestore();
  });
});
