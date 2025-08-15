import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToChamados } from '../services/firestore';
import ChamadoCard from '../components/ChamadoCard';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, LogOut, User } from 'lucide-react';

export default function Dashboard() {
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || !userProfile) return;

    let filters = {};
    
    // Solicitante foi removido, agora todos os chamados são visíveis para Executor e Gestor
    // Se houver necessidade de filtrar por usuário, a lógica deve ser mais complexa
    // Por exemplo, Executor vê chamados que ele assumiu ou que estão abertos
    // Gestor vê todos

    const unsubscribe = subscribeToChamados(filters, (chamadosData) => {
      setChamados(chamadosData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, userProfile]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleViewDetails = (chamado) => {
    navigate(`/chamado/${chamado.id}`);
  };

  const handleTakeAction = (chamado) => {
    navigate(`/chamado/${chamado.id}?action=true`);
  };

  const handleNewChamado = () => {
    navigate('/novo-chamado');
  };

  const getChamadosByStatus = (status) => {
    return chamados.filter(chamado => chamado.status === status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">TaskFlow</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 mr-1 text-gray-500" />
                <span className="text-sm text-gray-700">{userProfile?.nome}</span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {userProfile?.perfil}
                </span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-600">Gerencie seus chamados e tarefas</p>
          </div>
          {userProfile?.perfil === 'Gestor' && (
            <Button onClick={handleNewChamado}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Chamado
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Chamados</CardDescription>
              <CardTitle className="text-2xl">{chamados.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Abertos</CardDescription>
              <CardTitle className="text-2xl text-blue-600">
                {getChamadosByStatus('Aberto').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Em Andamento</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">
                {getChamadosByStatus('Em Andamento').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Resolvidos</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {getChamadosByStatus('Resolvido').length + getChamadosByStatus('Aprovado').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Chamados List (Kanban for all remaining profiles) */}
        <Tabs defaultValue="kanban" className="space-y-4">
          <TabsList>
            <TabsTrigger value="kanban">Visão Kanban</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>
          
          <TabsContent value="kanban">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {['Aberto', 'Em Andamento', 'Resolvido', 'Aprovado', 'Recusado'].map((status) => (
                <div key={status} className="space-y-4">
                  <h3 className="font-semibold text-center p-3 bg-gray-100 rounded-lg">
                    {status} ({getChamadosByStatus(status).length})
                  </h3>
                  <div className="space-y-3">
                    {chamados.filter(chamado => chamado.status === status).map((chamado) => (
                      <ChamadoCard
                        key={chamado.id}
                        chamado={chamado}
                        onViewDetails={handleViewDetails}
                        onTakeAction={handleTakeAction}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="list">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chamados.map((chamado) => (
                <ChamadoCard
                  key={chamado.id}
                  chamado={chamado}
                  onViewDetails={handleViewDetails}
                  onTakeAction={handleTakeAction}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}