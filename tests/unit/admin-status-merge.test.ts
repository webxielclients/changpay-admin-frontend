import { describe, expect, it } from 'vitest';
import { mergeStatusRecord } from '@/lib/api/merge-status-record';

describe('mergeStatusRecord', () => {
  it('keeps user table fields and stable identity when a status response is compact', () => {
    const current = {
      id: 'user-public-id',
      email: 'customer@example.test',
      balances: { USD: '10.00', NGN: '200.00', YUAN: '0.00' },
      lastLoginAt: '2026-11-16T12:00:00Z',
      isActive: true,
      accountStatus: 'active' as string | null,
    };

    const updated = mergeStatusRecord(current, {
      id: 'server-user-id',
      accountStatus: 'disabled',
      isActive: false,
    });

    expect(updated).toEqual({
      ...current,
      accountStatus: 'disabled',
      isActive: false,
    });
    expect(updated.id).toBe('user-public-id');
  });

  it('keeps wallet row details while applying the new freeze state', () => {
    const current = {
      id: 'wallet-public-id',
      currency: 'NGN' as const,
      balance: '500.00',
      isLocked: false,
      status: 'active' as string,
      user: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.test', changpayId: 'CP1', avatar: null },
      lastActivityAt: '2026-11-16T12:00:00Z',
    };

    const updated = mergeStatusRecord(current, {
      id: 'wallet-public-id',
      isLocked: true,
      status: 'frozen',
    });

    expect(updated.isLocked).toBe(true);
    expect(updated.status).toBe('frozen');
    expect(updated.user).toEqual(current.user);
    expect(updated.lastActivityAt).toBe(current.lastActivityAt);
  });
});
