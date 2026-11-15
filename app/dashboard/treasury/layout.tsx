import { redirect } from 'next/navigation';
import { frontendConfig } from '@/config/env';

export default function TreasuryLayout({ children }: { children: React.ReactNode }) {
  if (!frontendConfig.adminTreasuryEnabled) {
    redirect('/dashboard');
  }

  return children;
}
