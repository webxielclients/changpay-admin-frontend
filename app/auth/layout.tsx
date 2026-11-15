import { AuthLayout } from '@/components/auth/AuthLayout';

export default function AuthPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}