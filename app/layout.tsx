import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: "ChangPay Admin",
  description: "ChangPay admin dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
