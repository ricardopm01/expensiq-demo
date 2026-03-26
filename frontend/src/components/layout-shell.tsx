'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:ml-60 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 md:p-7">{children}</main>
        <footer className="px-4 md:px-7 py-3 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-300">
            ExpensIQ v2.0 · Gestion Inteligente de Gastos con IA
          </p>
          <div className="flex items-center gap-4">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors hidden sm:inline"
            >
              API Docs
            </a>
            <a
              href="http://localhost:9001"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-400 hover:text-indigo-600 transition-colors hidden sm:inline"
            >
              MinIO
            </a>
          </div>
        </footer>
      </div>
    </>
  );
}
