'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { setApiRole, setApiEmployeeId } from '@/lib/api';
import type { Employee } from '@/types';

type Role = 'employee' | 'manager' | 'admin';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
  employeeId: string | null;
  setEmployeeId: (id: string | null) => void;
  employee: Employee | null;
  employees: Employee[];
}

const RoleContext = createContext<RoleContextValue>({
  role: 'admin',
  setRole: () => {},
  employeeId: null,
  setEmployeeId: () => {},
  employee: null,
  employees: [],
});

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>('admin');
  const [employeeId, setEmployeeIdState] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);

  // Load employees list once
  useEffect(() => {
    api.get<Employee[]>('/employees')
      .then((emps) => {
        const list = Array.isArray(emps) ? emps : [];
        setEmployees(list);
      })
      .catch(() => {});
  }, []);

  // When employeeId changes, fetch employee detail
  useEffect(() => {
    if (employeeId) {
      const found = employees.find((e) => String(e.id) === String(employeeId));
      setEmployee(found || null);
    } else {
      setEmployee(null);
    }
  }, [employeeId, employees]);

  const setRole = useCallback((newRole: Role) => {
    setRoleState(newRole);
    setApiRole(newRole);
    if (newRole !== 'employee') {
      setEmployeeIdState(null);
      setApiEmployeeId(null);
    }
  }, []);

  const setEmployeeId = useCallback((id: string | null) => {
    setEmployeeIdState(id);
    setApiEmployeeId(id);
  }, []);

  // Auto-select first employee when switching to employee role
  useEffect(() => {
    if (role === 'employee' && !employeeId && employees.length > 0) {
      setEmployeeId(String(employees[0].id));
    }
  }, [role, employeeId, employees, setEmployeeId]);

  return (
    <RoleContext.Provider value={{ role, setRole, employeeId, setEmployeeId, employee, employees }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
