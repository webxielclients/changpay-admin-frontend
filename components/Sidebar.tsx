'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { JSX } from 'react';
import Image from 'next/image';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: (isActive: boolean) => JSX.Element;
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: () => <Image src="/Grid.png" alt="" width={20} height={20} />,
  },
  {
    id: 'users',
    label: 'Users & Accounts',
    path: '/dashboard/users',
    icon: () => <Image src="/UsersAcct.png" alt="" width={20} height={20} />,
  },
  {
    id: 'transactions',
    label: 'Transactions',
    path: '/dashboard/transactions',
    icon: () => <Image src="/UsersAcct.png" alt="" width={20} height={20} />,
  },
  {
    id: 'wallet-management',
    label: 'Wallet Management',
    path: '/dashboard/wallet-management',
    icon: () => <Image src="/walletmag.png" alt="" width={20} height={20} />,
  },
  {
    id: 'fx-engine',
    label: 'FX Engine',
    path: '/dashboard/fx-engine',
    icon: () => <Image src="/fxeng.png" alt="" width={20} height={20} />,
  },
  {
    id: 'banks-payouts',
    label: 'Banks and Payouts',
    path: '/dashboard/banks-payouts',
    icon: () => <Image src="/bankpay.png" alt="" width={20} height={20} />,
  },
  // {
  //   id: 'gift-cards',
  //   label: 'Gift Card Engine',
  //   path: '/dashboard/gift-cards',
  //   icon: () => <Image src="/gear.png" alt="" width={20} height={20} />,
  // },
  {
    id: 'compliance-risk',
    label: 'Compliance & Risk',
    path: '/dashboard/kyc-verification',
    icon: () => <Image src="/gear.png" alt="" width={20} height={20} />,
  },
  {
    id: 'promotions',
    label: 'Promotions',
    path: '/dashboard/promotions',
    icon: () => <Image src="/gear.png" alt="" width={20} height={20} />,
  },
  {
    id: 'support',
    label: 'Support & Disputes',
    path: '/dashboard/support',
    icon: () => <Image src="/gear.png" alt="" width={20} height={20} />,
  },
  {
    id: 'roles',
    label: 'Roles & Permissions',
    path: '/dashboard/roles',
    icon: () => <Image src="/gear.png" alt="" width={20} height={20} />,
  },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { handleLogout } = useAuth();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <aside className="w-64 bg-[#012D32] text-white flex flex-col">
      <div className="p-6">
        <Image src="/Group.svg" alt="Changpay Logo" width={150} height={40} className="object-contain" />
      </div>
      <nav className="flex-1 py-2 px-3 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.path || pathname?.startsWith(item.path + '/');
          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all text-left ${
                isActive ? 'bg-[#009F51] text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.icon(isActive)}
              <span className="text-sm font-normal">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}