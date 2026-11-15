import { expect, test, type Page, type Route } from '@playwright/test';

const admin = {
  publicId: 'admin-e2e-public-id',
  email: 'admin@example.com',
  firstName: 'Test',
  lastName: 'Administrator',
  isActive: true,
  permissions: ['*', 'treasury.view'],
  sessionExpiresAt: '2099-01-01T00:00:00.000Z',
};

function pageData(url: string): unknown {
  if (url.includes('/auth/me')) return admin;
  if (url.includes('/dashboard/chart')) return { data: [] };
  if (url.endsWith('/dashboard') || url.includes('/dashboard?')) return { pools: [], issues: [], recent_transactions: [], stats: {} };
  if (url.includes('/verifications/stats')) return { kyc: {}, kyb: {} };
  if (url.includes('/verifications')) return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  if (url.includes('/wallets/stats')) return {};
  if (url.includes('/wallets/currency/')) return { wallets: [], balances: {} };
  if (url.includes('/wallets/reconciliation')) return { is_reconciled: true, discrepancies: [], auto_job: {} };
  if (url.includes('/wallets')) return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  if (url.includes('/treasury/operations/overview')) return { pools: [], issues: [], state: 'ready', alert_settings: {} };
  if (url.includes('/treasury/operations/capabilities')) return { 'treasury.view': true };
  if (url.includes('/treasury')) return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  if (url.includes('/fx/overview')) return {};
  if (url.includes('/fx')) return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  if (url.includes('/transactions/stats')) return {};
  if (url.includes('/transactions')) return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  if (url.includes('/banks')) return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  if (url.includes('/reconciliation')) return { state: 'ready', items: [], data: [] };
  if (url.includes('/support')) return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  if (url.includes('/promotions')) return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  if (url.includes('/roles')) return { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  return {};
}

async function mockBackend(route: Route): Promise<void> {
  const request = route.request();
  if (!request.url().includes('/api/proxy/')) return route.continue();
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ status: true, message: 'ok', data: pageData(request.url()) }),
  });
}

async function authenticate(page: Page): Promise<void> {
  await page.addInitScript((profile) => {
    localStorage.setItem('token', 'admin-e2e-token');
    localStorage.setItem('changpay_admin_auth', JSON.stringify({
      state: { user: profile, token: 'admin-e2e-token', isAuthenticated: true, sessionExpiresAt: profile.sessionExpiresAt },
      version: 0,
    }));
  }, admin);
  if (process.env.ADMIN_E2E_LIVE !== 'true') {
    await page.route('**/api/proxy/**', mockBackend);
  }
}

async function visit(page: Page, path: string, marker: string): Promise<void> {
  await authenticate(page);
  await page.goto(path);
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();
}

test.describe('dashboard and customer administration', () => {
  test('dashboard loads overview and remains authenticated', async ({ page }) => {
    await visit(page, '/dashboard', 'Here is your dashboard overview');
  });

  test('users page loads search and customer controls', async ({ page }) => {
    await visit(page, '/dashboard/users', 'Users');
    await expect(page.getByRole('textbox').first()).toBeVisible();
  });

  test('wallet management loads wallet controls', async ({ page }) => {
    await visit(page, '/dashboard/wallet-management', 'Wallet Management System');
  });

  test('transactions page loads transaction controls', async ({ page }) => {
    await visit(page, '/dashboard/transactions', 'Transactions');
  });
});

test.describe('treasury and settlement', () => {
  test('treasury loads overview and feature navigation', async ({ page }) => {
    await visit(page, '/dashboard/treasury', 'Treasury & settlement');
    await expect(page.getByRole('button', { name: 'Internal FX liquidity' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Locations' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'FX wallet rollout' })).toBeVisible();
  });

  test('treasury liquidity, locations, and wallet rollout pages load', async ({ page }) => {
    for (const [path, marker] of [
      ['/dashboard/treasury/liquidity', 'Internal FX liquidity'],
      ['/dashboard/treasury/locations', 'Treasury locations'],
      ['/dashboard/treasury/wallet-rollout', 'FX wallet rollout'],
    ] as const) {
      await visit(page, path, marker);
    }
  });
});

test.describe('verification, rates, and banking', () => {
  test('KYC and KYB verification page loads review controls', async ({ page }) => {
    await visit(page, '/dashboard/kyc-verification', 'KYC/KYB Verification');
  });

  test('FX engine loads rate-management controls', async ({ page }) => {
    await visit(page, '/dashboard/fx-engine', 'FX Engine');
  });

  test('banks and payouts page loads provider controls', async ({ page }) => {
    await visit(page, '/dashboard/banks-payouts', 'Banks & Payouts');
  });
});

test.describe('operations, support, promotions, and administration', () => {
  test('reconciliation page loads operational review controls', async ({ page }) => {
    await visit(page, '/dashboard/reconciliation', 'Reconciliation');
  });

  test('support and disputes page loads service controls', async ({ page }) => {
    await visit(page, '/dashboard/support', 'Support & Disputes');
  });

  test('promotions page loads campaign controls', async ({ page }) => {
    await visit(page, '/dashboard/promotions', 'Promotions');
  });

  test('roles page loads permission-management controls', async ({ page }) => {
    await visit(page, '/dashboard/roles', 'Roles & Permissions');
  });
});

test('expired bearer token is rejected and redirects the admin to login', async ({ page }) => {
  await page.addInitScript((profile) => {
    localStorage.setItem('token', 'expired-admin-token');
    localStorage.setItem('changpay_admin_auth', JSON.stringify({
      state: { user: profile, token: 'expired-admin-token', isAuthenticated: true, sessionExpiresAt: profile.sessionExpiresAt },
      version: 0,
    }));
  }, admin);

  let profileRequests = 0;
  await page.route('**/api/proxy/**', async (route) => {
    if (route.request().url().includes('/auth/me') && profileRequests++ > 0) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ status: false, message: 'Unauthenticated.' }),
      });
      return;
    }
    await mockBackend(route);
  });

  await page.goto('/dashboard');
  await expect(page).not.toHaveURL(/\/login/);
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
});
