import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Clock, User, AlertCircle, AlertTriangle, CalendarDays } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUsuario } from '../services/firestore';

const statusColors = {
  'Aberto': 'bg-blue-100 text-blue-800',
  'Em Andamento': 'bg-yellow-100 text-yellow-800',
  'Pausado': 'bg-gray-100 text-gray-800',
  'Resolvido': 'bg-purple-100 text-purple-800',
  'Aprovado': 'bg-green-100 text-green-800',
  'Recusado': 'bg-red-100 text-red-800'
};

const prioridadeColors = {
  'Baixa': 'bg-gray-100 text-gray-800',
  'Média': 'bg-yellow-100 text-yellow-800',
  'Alta': 'bg-red-100 text-red-800'
};

export default function ChamadoCard({ chamado, onViewDetails, onTakeAction }) {
  const { userProfile, currentUser } = useAuth();
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

  const formatTime = (totalSeconds) => {
    if (totalSeconds === null || totalSeconds === undefined || totalSeconds === 0) return null;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(v => v < 10 ? "0" + v : v).join(":");
  };

  // ✅ Lógica para formatar e verificar o prazo (já estava no seu código)
  const formatPrazo = (timestamp) => {
    if (!timestamp) return null;
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
  };
  
  const isOverdue = chamado.prazo && new Date() > chamado.prazo.toDate() && chamado.status !== 'Aprovado';


  const canTakeAction = () => {
    if (chamado.arquivado) return false;
    if (!userProfile) return false;
    if (userProfile.perfil === 'Gestor') {
      if (chamado.status === 'Resolvido' || chamado.status === 'Aberto') return true;
    }
    if (userProfile.perfil === 'Executor') {
      return chamado.status === 'Aberto' || (chamado.status === 'Em Andamento' && chamado.executorId === currentUser.uid);
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
    <Card className="hover:shadow-md transition-shadow flex flex-col h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg break-words">
          {chamado.titulo}
        </CardTitle>
        
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Badge className={statusColors[chamado.status] || 'bg-gray-100 text-gray-800'}>
            {chamado.status}
          </Badge>
          <Badge className={prioridadeColors[chamado.prioridade] || 'bg-gray-100 text-gray-800'}>
            {chamado.prioridade}
          </Badge>
          {chamado.recusadoAnteriormente && chamado.status === 'Em Andamento' && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Revisão
            </Badge>
          )}
        </div>
        
        <CardDescription className="line-clamp-2 pt-2">
          {chamado.descricao}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex flex-col flex-grow mt-auto">
        <div className="space-y-2 text-sm text-gray-600 flex-grow">
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
          {formatTime(chamado.tempoGasto) && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>Tempo gasto: {formatTime(chamado.tempoGasto)}</span>
            </div>
          )}
          {/* ✅ ALTERAÇÃO APLICADA AQUI: Exibição do prazo */}
          {chamado.prazo && (
            <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
              <CalendarDays className="h-4 w-4" />
              <span>Prazo: {formatPrazo(chamado.prazo)}</span>
            </div>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onViewDetails(chamado)}
            className="flex-grow min-w-[120px]"
          >
            Ver Detalhes
          </Button>
          {canTakeAction() && getActionText() && (
            <Button 
              size="sm" 
              onClick={() => onTakeAction(chamado)}
              className="flex-grow min-w-[120px]"
            >
              {getActionText()}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}