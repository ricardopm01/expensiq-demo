'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { setBackendToken } from '@/lib/api';
import type { Employee } from '@/types';

type Role = 'employee' | 'admin' | 'viewer';

interface RoleContextValue {
  role: Role;
  employeeId: string | null;
  employeeName: string | null;
  employee: Employee | null;
  employees: Employee[];
  /** Token JWT del backend. null mientras la sesión no esté lista. */
  backendToken: string | null;
  setRole: (role: Role) => void;
  setEmployeeId: (id: string | null) => void;
}

const RoleContext = createContext<RoleContextValue>({
  role: 'employee',
  employeeId: null,
  employeeName: null,
  employee: null,
  employees: [],
  backendToken: null,
  setRole: () => {},
  setEmployeeId: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [backendToken, setToken] = useState<string | null>(null);

  const role = (session?.user?.role as Role) ?? 'employee';
  const employeeId = session?.user?.employeeId ?? null;
  const employeeName = session?.user?.name ?? null;

  useEffect(() => {
    const token = session?.backendToken ?? null;
    setBackendToken(token);   // módulo api.ts
    setToken(token);          // estado reactivo para consumers
  }, [session?.backendToken]);

  return (
    <RoleContext.Provider value={{
      role,
      employeeId,
      employeeName,
      employee: null,
      employees: [],
      backendToken,
      setRole: () => {},
      setEmployeeId: () => {},
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
