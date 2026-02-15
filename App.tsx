
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Layout } from './components/Layout';
import { RoleBasedRoute } from './components/RouteGuards';
import { LoginPage } from './features/auth/LoginPage';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { ProfessorDashboard } from './features/professor/ProfessorDashboard';
import { AlunoDashboard } from './features/aluno/AlunoDashboard';

const Navigation: React.FC = () => {
  const { user, firebaseUser, isPendingApproval, isLoading } = useAuth();

  if (isLoading) return (
    <div className="h-screen w-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // Se não houver usuário logado OU se o usuário estiver logado mas pendente de aprovação, mostra a LoginPage
  // A LoginPage agora lida internamente com o estado de "Aguardando Liberação"
  if (!firebaseUser || isPendingApproval || !user) return <LoginPage />;

  return (
    <Layout>
      {user.role === 'admin' && (
        <RoleBasedRoute allowed={['admin']}>
          <AdminDashboard />
        </RoleBasedRoute>
      )}
      {user.role === 'professor' && (
        <RoleBasedRoute allowed={['professor']}>
          <ProfessorDashboard />
        </RoleBasedRoute>
      )}
      {user.role === 'aluno' && (
        <RoleBasedRoute allowed={['aluno']}>
          <AlunoDashboard />
        </RoleBasedRoute>
      )}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
