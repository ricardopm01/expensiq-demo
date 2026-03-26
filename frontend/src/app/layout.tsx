import type { Metadata } from 'next';
import { ToastProvider } from '@/components/toast';
import { RoleProvider } from '@/lib/role-context';
import { LayoutShell } from '@/components/layout-shell';
import './globals.css';

export const metadata: Metadata = {
  title: 'ExpensIQ — Gestion Inteligente de Gastos',
  description: 'Sistema de gestion de gastos empresariales con IA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>
          <RoleProvider>
            <LayoutShell>{children}</LayoutShell>
          </RoleProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
