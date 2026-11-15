import AuthGuard from '@/components/AuthGuard';
import SessionFooter from '@/components/SessionFooter';
import OfflineBanner from '@/components/OfflineBanner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard><OfflineBanner />{children}<SessionFooter /></AuthGuard>;
}
