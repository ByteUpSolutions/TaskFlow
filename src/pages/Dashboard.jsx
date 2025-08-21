import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToChamados } from '../services/firestore';
import ChamadoCard from '../components/ChamadoCard';
import { Button } from '../components/ui/button';
import { Card, CardHeader, CardDescription, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [chamados, setChamados] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser || !userProfile) return;
    const unsubscribe = subscribeToChamados({}, (chamadosData) => {
      setChamados(chamadosData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [currentUser, userProfile]);

  const handleViewDetails = (chamado) => navigate(`/chamado/${chamado.id}`);
  const handleTakeAction = (chamado) => navigate(`/chamado/${chamado.id}?action=true`);
  const handleNewChamado = () => navigate('/novo-chamado');

  const getChamadosByStatus = (status) => chamados.filter(c => c.status === status);

  if (loading) {
    return (
        <div className="flex items-center justify-center py-12">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
        </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard de Chamados</h2>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription><CardTitle className="text-2xl">{chamados.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Abertos</CardDescription><CardTitle className="text-2xl text-blue-600">{getChamadosByStatus('Aberto').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Em Progresso</CardDescription><CardTitle className="text-2xl text-yellow-600">{getChamadosByStatus('Em Andamento').length + getChamadosByStatus('Pausado').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Finalizados</CardDescription><CardTitle className="text-2xl text-green-600">{getChamadosByStatus('Aprovado').length}</CardTitle></CardHeader></Card>
      </div>

      {/* ✅ TABS CORRIGIDOS COM AS DUAS VISÕES */}
      <Tabs defaultValue="kanban" className="space-y-4">
        <TabsList>
          <TabsTrigger value="kanban">Visão Kanban</TabsTrigger>
          <TabsTrigger value="list">Lista</TabsTrigger>
        </TabsList>
        
        <TabsContent value="kanban">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {['Aberto', 'Em Andamento', 'Pausado', 'Resolvido', 'Aprovado'].map((status) => (
              <div key={status} className="space-y-4 bg-gray-100 p-2 rounded-lg">
                <h3 className="font-semibold text-center p-2 rounded-md">
                  {status} ({getChamadosByStatus(status).length})
                </h3>
                <div className="space-y-3 min-h-[100px]">
                  {getChamadosByStatus(status).map((chamado) => (
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
    </>
  );
}