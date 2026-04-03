'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
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
  setRole: (role: Role) => void;
  setEmployeeId: (id: string | null) => void;
}

const RoleContext = createContext<RoleContextValue>({
  role: 'employee',
  employeeId: null,
  employeeName: null,
  employee: null,
  employees: [],
  setRole: () => {},
  setEmployeeId: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  const role = (session?.user?.role as Role) ?? 'employee';
  const employeeId = session?.user?.employeeId ?? null;
  const employeeName = session?.user?.name ?? null;

  useEffect(() => {
    setBackendToken(session?.backendToken ?? null);
  }, [session?.backendToken]);

  return (
    <RoleContext.Provider value={{
      role,
      employeeId,
      employeeName,
      employee: null,
      employees: [],
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
