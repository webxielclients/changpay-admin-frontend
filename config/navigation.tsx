import Image from 'next/image';
import type { JSX } from 'react';
import type { FrontendFeatureFlag } from './env';

export interface AdminNavigationItem {
  id: string;
  label: string;
  path: string;
  requiredPermission?: string;
  featureFlag?: FrontendFeatureFlag;
  icon: (isActive: boolean) => JSX.Element;
}

function NavigationIcon({ source }: { source: string }) {
  return <Image src={source} alt="" width={20} height={20} style={{ width: '20px', height: '20px' }} />;
}

const icon = (source: string) => {
  function Icon(_isActive: boolean) {
    void _isActive;
    return <NavigationIcon source={source} />;
  }
  Icon.displayName = `NavigationIcon(${source})`;
  return Icon;
};

export const ADMIN_NAVIGATION: readonly AdminNavigationItem[] = [
  // Dashboard is currently protected by the authenticated admin route. A dedicated
  // dashboard.view permission should be added server-side before this is narrowed.
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: icon('/Grid.png') },
  { id: 'users', label: 'Users & Accounts', path: '/dashboard/users', requiredPermission: 'user_management.view', icon: icon('/UsersAcct.png') },
  { id: 'transactions', label: 'Transactions', path: '/dashboard/transactions', requiredPermission: 'transactions.view', icon: icon('/UsersAcct.png') },
  { id: 'wallet-management', label: 'Wallet Management', path: '/dashboard/wallet-management', requiredPermission: 'wallet_management.view', icon: icon('/walletmag.png') },
  { id: 'fx-engine', label: 'FX Engine', path: '/dashboard/fx-engine', requiredPermission: 'fx_engine.view', icon: icon('/fxeng.png') },
  { id: 'treasury', label: 'Treasury', path: '/dashboard/treasury', requiredPermission: 'treasury.view', featureFlag: 'adminTreasuryEnabled', icon: icon('/bankpay.png') },
  { id: 'reconciliation', label: 'Reconciliation', path: '/dashboard/reconciliation', requiredPermission: 'wallet_management.view', featureFlag: 'reconciliationEnabled', icon: icon('/gear.png') },
  { id: 'banks-payouts', label: 'Banks and Payouts', path: '/dashboard/banks-payouts', requiredPermission: 'banks_payouts.view_payouts', icon: icon('/bankpay.png') },
  { id: 'compliance-risk', label: 'Compliance & risk KYC/KYB', path: '/dashboard/kyc-verification', requiredPermission: 'kyb_kyc.view_kyc', icon: icon('/gear.png') },
  { id: 'promotions', label: 'Promotions', path: '/dashboard/promotions', requiredPermission: 'promotions.view', icon: icon('/gear.png') },
  { id: 'support', label: 'Support & Disputes', path: '/dashboard/support', requiredPermission: 'support.view', icon: icon('/gear.png') },
  { id: 'roles', label: 'Roles & Permissions', path: '/dashboard/roles', requiredPermission: 'roles_permissions.view', icon: icon('/gear.png') },
  { id: 'settings', label: 'Profile & Settings', path: '/dashboard/settings', icon: icon('/gear.png') },
];
