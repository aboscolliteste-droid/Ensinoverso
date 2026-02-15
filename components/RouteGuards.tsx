
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="p-8 text-center">Carregando...</div>;
  if (!user) return <div className="p-8 text-center">Acesso negado. Por favor, faça login.</div>;

  return <>{children}</>;
};

export const RoleBasedRoute: React.FC<{ children: React.ReactNode; allowed: UserRole[] }> = ({ children, allowed }) => {
  const { user } = useAuth();

  if (!user || !allowed.includes(user.role)) {
    return (
      <div className="p-8 text-center text-red-600">
        Você não tem permissão para acessar esta área.
      </div>
    );
  }

  return <>{children}</>;
};
