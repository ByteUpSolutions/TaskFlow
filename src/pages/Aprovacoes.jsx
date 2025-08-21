import React, { useState, useEffect } from 'react';
import { getUsuariosPendentes, updateUserAccessStatus } from '../services/firestore';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2 } from 'lucide-react';

export default function Aprovacoes() {
  const [usuariosPendentes, setUsuariosPendentes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendentes = async () => {
    setLoading(true);
    const pendentes = await getUsuariosPendentes();
    setUsuariosPendentes(pendentes);
    setLoading(false);
  };

  useEffect(() => {
    fetchPendentes();
  }, []);

  const handleApproval = async (userId, newStatus) => {
    try {
      await updateUserAccessStatus(userId, newStatus);
      setUsuariosPendentes(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      console.error("Erro ao atualizar status do usuário:", error);
      alert("Ocorreu um erro ao processar a solicitação.");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-16 w-16 animate-spin text-blue-600" /></div>;
  }

  return (
    <>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Aprovações Pendentes</h2>
        <p className="text-gray-600">Gerencie o acesso de novos usuários ao sistema</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {usuariosPendentes.length > 0 ? (
              usuariosPendentes.map(user => (
                <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div>
                    <p className="font-medium">{user.nome}</p>
                    <p className="text-sm text-gray-500">{user.email} - ({user.perfil})</p>
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <Button size="sm" onClick={() => handleApproval(user.id, 'aprovado')}>Aprovar</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleApproval(user.id, 'rejeitado')}>Rejeitar</Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">Nenhum usuário pendente de aprovação.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}