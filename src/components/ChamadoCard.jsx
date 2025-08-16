import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
// ✅ 1. Importar o ícone de alerta
import { Clock, User, AlertCircle, AlertTriangle } from 'lucide-react'; 
import { useAuth } from '../contexts/AuthContext';
import { getUsuario } from '../services/firestore';

const statusColors = {
  'Aberto': 'bg-blue-100 text-blue-800',
  'Em Andamento': 'bg-yellow-100 text-yellow-800',
  'Pausado': 'bg-gray-100 text-gray-800', // ✅ Adicionada cor para o status Pausado
  'Resolvido': 'bg-purple-100 text-purple-800', // Alterado para Roxo para diferenciar de Aprovado
  'Aprovado': 'bg-green-100 text-green-800',
  'Recusado': 'bg-red-100 text-red-800'
};

const prioridadeColors = {
  'Baixa': 'bg-gray-100 text-gray-800',
  'Média': 'bg-yellow-100 text-yellow-800',
  'Alta': 'bg-red-100 text-red-800'
};

export default function ChamadoCard({ chamado, onViewDetails, onTakeAction }) {
  const { userProfile, currentUser } = useAuth(); // Adicionado currentUser
  const [executorName, setExecutorName] = useState(null);

  useEffect(() => {
    const fetchExecutorName = async () => {
      if (chamado.executorId) {
        const executor = await getUsuario(chamado.executorId);
        if (executor) {
          setExecutorName(executor.nome);
        }
      } else {
        setExecutorName(null);
      }
    };

    fetchExecutorName();
  }, [chamado.executorId]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
  };

  const canTakeAction = () => {
    if (!userProfile) return false;
    
    if (userProfile.perfil === 'Gestor') {
        if (chamado.status === 'Resolvido') return true;
        if (chamado.status === 'Aberto') return true;
    }

    if (userProfile.perfil === 'Executor') {
      return chamado.status === 'Aberto' || 
             (chamado.status === 'Em Andamento' && chamado.executorId === currentUser.uid);
    }
    
    return false;
  };

  const getActionText = () => {
    if (chamado.status === 'Resolvido' && userProfile?.perfil === 'Gestor') return 'Revisar';
    if (chamado.status === 'Aberto') return 'Assumir';
    if (chamado.status === 'Em Andamento' && chamado.executorId === currentUser.uid) return 'Resolver';
    return '';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg flex items-center gap-2">
            {chamado.titulo}
            {/* ✅ 2. ADICIONADO: Bloco para a flag visual de revisão */}
            {chamado.recusadoAnteriormente && chamado.status === 'Em Andamento' && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Revisão
              </Badge>
            )}
          </CardTitle>
          <div className="flex flex-col items-end gap-2">
            <Badge className={statusColors[chamado.status] || 'bg-gray-100 text-gray-800'}>
              {chamado.status}
            </Badge>
            <Badge className={prioridadeColors[chamado.prioridade] || 'bg-gray-100 text-gray-800'}>
              {chamado.prioridade}
            </Badge>
          </div>
        </div>
        <CardDescription className="line-clamp-2 mt-1">
          {chamado.descricao}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>Criado em: {formatDate(chamado.criadoEm)}</span>
          </div>
          {chamado.executorId && executorName && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Executor: {executorName}</span>
            </div>
          )}
          {chamado.tempoGasto && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Tempo gasto: {chamado.tempoGasto}h</span>
            </div>
          )}
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewDetails(chamado)}
            className="flex-1"
          >
            Ver Detalhes
          </Button>
          {canTakeAction() && getActionText() && (
            <Button 
              size="sm" 
              onClick={() => onTakeAction(chamado)}
              className="flex-1"
            >
              {getActionText()}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}