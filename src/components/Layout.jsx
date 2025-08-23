import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from './ui/button';
import { LogOut, User, UserCheck, Archive, LineChart } from 'lucide-react';
import { getUsuariosPendentes } from '../services/firestore';
import { useQuery } from '@tanstack/react-query';

export default function Layout({ children }) {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const { data: pendentesCount } = useQuery({
    queryKey: ['usuariosPendentesCount'],
    queryFn: getUsuariosPendentes,
    enabled: userProfile?.perfil === 'Gestor',
    select: (data) => data.length,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/dashboard" className="text-xl font-semibold text-gray-900">TaskFlow</Link>
            <div className="flex items-center space-x-2"> {/* Reduzido o space-x para caber mais itens */}
              
              {/* ✅ Link para o Dashboard Analítico (só para Gestores) */}
              {userProfile?.perfil === 'Gestor' && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/analytics">
                    <LineChart className="h-4 w-4 mr-2" />
                    Analytics
                  </Link>
                </Button>
              )}

              {/* ✅ ADICIONADO: Link para a nova página de Arquivados */}
              <Button variant="ghost" size="sm" asChild>
                <Link to="/arquivados">
                  <Archive className="h-4 w-4 mr-2" />
                  Arquivados
                </Link>
              </Button>

              {userProfile?.perfil === 'Gestor' && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/aprovacoes" className="relative">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Aprovações
                    {pendentesCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {pendentesCount}
                      </span>
                    )}
                  </Link>
                </Button>
              )}
              <div className="flex items-center space-x-2"><User className="h-4 w-4 text-gray-500" /><span className="text-sm text-gray-700 hidden sm:inline">{userProfile?.nome}</span></div>
              <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Sair</span></Button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
    </div>
  );
}