'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { setBackendToken } from '@/lib/api';
import type { Employee } from '@/types';

type Role = 'employee' | 'admin' | 'viewer';

interface RoleContextValue {
  role: Role;
  employeeId: string | null;
  employee: Employee | null;
  employees: Employee[];
  // Legacy setters (no-op — role comes from session now)
  setRole: (role: Role) => void;
  setEmployeeId: (id: string | null) => void;
}

const RoleContext = createContext<RoleContextValue>({
  role: 'employee',
  employeeId: null,
  employee: null,
  employees: [],
  setRole: () => {},
  setEmployeeId: () => {},
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  const role = (session?.user?.role as Role) ?? 'employee';
  const employeeId = session?.user?.employeeId ?? null;

  // Keep backend token in sync
  useEffect(() => {
    setBackendToken(session?.backendToken ?? null);
  }, [session?.backendToken]);

  return (
    <RoleContext.Provider value={{
      role,
      employeeId,
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
