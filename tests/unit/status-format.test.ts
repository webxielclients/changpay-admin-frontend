import { describe, expect, it } from 'vitest';
import { formatStatusLabel } from '@/lib/formatters/status';

describe('status labels', () => {
  it('converts API status tokens into readable labels', () => {
    expect(formatStatusLabel('status_waiting')).toBe('Status Waiting');
    expect(formatStatusLabel('sell-crypto_awaiting')).toBe('Sell Crypto Awaiting');
  });
});
