import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const pageRoutes = [
  'app/page.tsx',
  'app/login/page.tsx',
  'app/auth/register/page.tsx',
  'app/auth/setup-pin/page.tsx',
  'app/auth/verify/page.tsx',
  'app/forgot-password/page.tsx',
  'app/dashboard/page.tsx',
  'app/dashboard/users/page.tsx',
  'app/dashboard/users/[userId]/page.tsx',
  'app/dashboard/users/[userId]/transactions/[walletType]/page.tsx',
  'app/dashboard/wallet-management/page.tsx',
  'app/dashboard/transactions/page.tsx',
  'app/dashboard/treasury/page.tsx',
  'app/dashboard/treasury/liquidity/page.tsx',
  'app/dashboard/treasury/locations/page.tsx',
  'app/dashboard/treasury/wallet-rollout/page.tsx',
  'app/dashboard/kyc-verification/page.tsx',
  'app/dashboard/fx-engine/page.tsx',
  'app/dashboard/banks-payouts/page.tsx',
  'app/dashboard/reconciliation/page.tsx',
  'app/dashboard/support/page.tsx',
  'app/dashboard/promotions/page.tsx',
  'app/dashboard/gift-cards/page.tsx',
  'app/dashboard/settings/page.tsx',
  'app/dashboard/roles/page.tsx',
  'app/dashboard/roles/admin-users/[id]/page.tsx',
  'app/dashboard/assign-role/page.tsx',
];

describe('admin page coverage manifest', () => {
  it('keeps every dashboard feature route backed by a page component', () => {
    for (const route of pageRoutes) {
      const source = fs.readFileSync(path.resolve(process.cwd(), route), 'utf8');
      expect(source, route).toContain('export default');
    }
  });

  it('covers the operational feature groups', () => {
    const groups = {
      users: pageRoutes.filter((route) => route.includes('users')),
      wallets: pageRoutes.filter((route) => route.includes('wallet')),
      treasury: pageRoutes.filter((route) => route.includes('treasury')),
      verification: pageRoutes.filter((route) => route.includes('kyc')),
      administration: pageRoutes.filter((route) => route.includes('roles') || route.includes('assign-role')),
    };

    expect(Object.values(groups).every((routes) => routes.length > 0)).toBe(true);
  });
});
