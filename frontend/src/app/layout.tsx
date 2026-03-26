import type { Metadata } from 'next';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { ToastProvider } from '@/components/toast';
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
          <Sidebar />
          <div className="ml-60 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-7">{children}</main>
            <footer className="px-7 py-3 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-300">
                ExpensIQ v2.0 · Gestion Inteligente de Gastos con IA
              </p>
              <div className="flex items-center gap-4">
                <a
                  href="http://localhost:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  API Docs
                </a>
                <a
                  href="http://localhost:9001"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  MinIO
                </a>
              </div>
            </footer>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
