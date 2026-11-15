'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { ADMIN_NAVIGATION } from '@/config/navigation';
import { canView } from '@/lib/permissions';
import { useAuthStore } from '@/store/authStore';
import { frontendConfig } from '@/config/env';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const permissions = useAuthStore((state) => state.user?.permissions ?? []);
  const hasPermissionData = permissions.length > 0;

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <aside className="w-64 h-screen max-h-screen min-h-0 shrink-0 overflow-hidden bg-[#012D32] text-white flex flex-col">
      <div className="p-6">
        <Image src="/Group.svg" alt="Changpay Logo" width={150} height={34} className="object-contain" style={{ width: '150px', height: '34px' }} />
      </div>
      <nav className="admin-sidebar-nav min-h-0 flex-1 py-2 px-3 overflow-y-auto overscroll-contain">
        {ADMIN_NAVIGATION.filter((item) => {
          if (item.featureFlag && !frontendConfig[item.featureFlag]) return false;
          if (!hasPermissionData) return item.id === 'settings';
          return canView(permissions, item.requiredPermission);
        }).map((item) => {
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
