'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  msg: string;
  type: ToastType;
}

interface ToastContextType {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warn: (msg: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  success: () => {},
  error: () => {},
  info: () => {},
  warn: () => {},
});

export const useToast = () => useContext(ToastContext);

const TOAST_CONFIG: Record<ToastType, { bg: string; Icon: typeof CheckCircle }> = {
  success: { bg: 'bg-emerald-500', Icon: CheckCircle },
  error:   { bg: 'bg-red-500',     Icon: XCircle },
  info:    { bg: 'bg-slate-700',   Icon: Info },
  warning: { bg: 'bg-amber-500',   Icon: AlertTriangle },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((msg: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const toast: ToastContextType = {
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warn: (msg) => addToast(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const cfg = TOAST_CONFIG[t.type];
          return (
            <div
              key={t.id}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm shadow-xl pointer-events-auto animate-in slide-in-from-bottom-2',
                cfg.bg
              )}
            >
              <cfg.Icon className="w-4 h-4 flex-shrink-0" />
              <span>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
