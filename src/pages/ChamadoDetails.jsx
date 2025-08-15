import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { updateChamado, getUsuario } from '../services/firestore';
import { db } from '../lib/firebase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ArrowLeft, Clock, User, AlertCircle, Loader2 } from 'lucide-react';

export default function ChamadoDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  const [chamado, setChamado] = useState(null);
  const [solicitante, setSolicitante] = useState(null);
  const [executor, setExecutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionData, setActionData] = useState({
    tempoGasto: '',
    notasResolucao: '',
    justificativa: ''
  });

  const showAction = searchParams.get('action') === 'true';

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'chamados', id), async (doc) => {
      if (doc.exists()) {
        const chamadoData = { id: doc.id, ...doc.data() };
        setChamado(chamadoData);

        // Buscar dados do solicitante
        if (chamadoData.solicitanteId) {
          const solicitanteData = await getUsuario(chamadoData.solicitanteId);
          setSolicitante(solicitanteData);
        }

        // Buscar dados do executor se existir
        if (chamadoData.executorId) {
          const executorData = await getUsuario(chamadoData.executorId);
          setExecutor(executorData);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('pt-BR');
  };

  const canTakeAction = () => {
    if (!userProfile || !chamado) return false;
    
    if (userProfile.perfil === 'Executor' || userProfile.perfil === 'Gestor') {
      return chamado.status === 'Aberto' || 
             (chamado.status === 'Em Andamento' && chamado.executorId === currentUser.uid) ||
             (chamado.status === 'Resolvido' && userProfile.perfil === 'Gestor');
    }
    
    return false;
  };

  const getNextStatus = () => {
    if (chamado.status === 'Aberto') return 'Em Andamento';
    if (chamado.status === 'Em Andamento') return 'Resolvido';
    return null;
  };

  const getActionText = () => {
    if (chamado.status === 'Aberto') return 'Assumir Chamado';
    if (chamado.status === 'Em Andamento') return 'Marcar como Resolvido';
    if (chamado.status === 'Resolvido' && userProfile?.perfil === 'Gestor') return 'Revisar';
    return '';
  };

  const handleAction = async () => {
    if (!chamado || !currentUser) return;

    try {
      setActionLoading(true);
      setError('');

      if (chamado.status === 'Aberto') {
        // Assumir chamado
        await updateChamado(chamado.id, {
          status: 'Em Andamento',
          executorId: currentUser.uid
        }, currentUser.uid, 'Assumiu o chamado');
      } else if (chamado.status === 'Em Andamento') {
        // Resolver chamado
        if (!actionData.tempoGasto) {
          setError('Tempo gasto é obrigatório');
          return;
        }
        
        await updateChamado(chamado.id, {
          status: 'Resolvido',
          tempoGasto: parseFloat(actionData.tempoGasto),
          notasResolucao: actionData.notasResolucao
        }, currentUser.uid, 'Resolveu o chamado');
      }

      navigate('/dashboard');
    } catch (error) {
      setError('Erro ao executar ação. Tente novamente.');
      console.error('Error taking action:', error);
    }

    setActionLoading(false);
  };

  const handleGestorAction = async (novoStatus) => {
    if (!chamado || !currentUser) return;

    try {
      setActionLoading(true);
      setError('');

      await updateChamado(chamado.id, {
        status: novoStatus,
        justificativaGestor: actionData.justificativa
      }, currentUser.uid, novoStatus === 'Aprovado' ? 'Aprovou o chamado' : 'Recusou o chamado');

      navigate('/dashboard');
    } catch (error) {
      setError('Erro ao executar ação. Tente novamente.');
      console.error('Error taking gestor action:', error);
    }

    setActionLoading(false);
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

  if (!chamado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Chamado não encontrado.</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Detalhes do Chamado</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informações Principais */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{chamado.titulo}</CardTitle>
                    <CardDescription className="mt-2">
                      Chamado #{chamado.id.slice(-8)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`${
                      chamado.status === 'Aberto' ? 'bg-blue-100 text-blue-800' :
                      chamado.status === 'Em Andamento' ? 'bg-yellow-100 text-yellow-800' :
                      chamado.status === 'Resolvido' ? 'bg-green-100 text-green-800' :
                      chamado.status === 'Aprovado' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {chamado.status}
                    </Badge>
                    <Badge className={`${
                      chamado.prioridade === 'Baixa' ? 'bg-gray-100 text-gray-800' :
                      chamado.prioridade === 'Média' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {chamado.prioridade}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Descrição</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{chamado.descricao}</p>
                  </div>
                  
                  {chamado.notasResolucao && (
                    <div>
                      <h4 className="font-semibold mb-2">Notas de Resolução</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{chamado.notasResolucao}</p>
                    </div>
                  )}

                  {chamado.justificativaGestor && (
                    <div>
                      <h4 className="font-semibold mb-2">Justificativa do Gestor</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{chamado.justificativaGestor}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            {(showAction || canTakeAction()) && (
              <Card>
                <CardHeader>
                  <CardTitle>Ações</CardTitle>
                </CardHeader>
                <CardContent>
                  {error && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {chamado.status === 'Em Andamento' && chamado.executorId === currentUser.uid && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="tempoGasto">Tempo Gasto (horas)</Label>
                        <Input
                          id="tempoGasto"
                          type="number"
                          step="0.5"
                          placeholder="Ex: 2.5"
                          value={actionData.tempoGasto}
                          onChange={(e) => setActionData({...actionData, tempoGasto: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="notasResolucao">Notas de Resolução</Label>
                        <Textarea
                          id="notasResolucao"
                          placeholder="Descreva como o problema foi resolvido..."
                          value={actionData.notasResolucao}
                          onChange={(e) => setActionData({...actionData, notasResolucao: e.target.value})}
                          rows={4}
                        />
                      </div>
                      <Button 
                        onClick={handleAction} 
                        disabled={actionLoading}
                        className="w-full"
                      >
                        {actionLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          getActionText()
                        )}
                      </Button>
                    </div>
                  )}

                  {chamado.status === 'Aberto' && canTakeAction() && (
                    <Button 
                      onClick={handleAction} 
                      disabled={actionLoading}
                      className="w-full"
                    >
                      {actionLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        getActionText()
                      )}
                    </Button>
                  )}

                  {chamado.status === 'Resolvido' && userProfile?.perfil === 'Gestor' && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="justificativa">Justificativa (opcional)</Label>
                        <Textarea
                          id="justificativa"
                          placeholder="Adicione uma justificativa para sua decisão..."
                          value={actionData.justificativa}
                          onChange={(e) => setActionData({...actionData, justificativa: e.target.value})}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleGestorAction('Aprovado')} 
                          disabled={actionLoading}
                          className="flex-1"
                        >
                          {actionLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            'Aprovar'
                          )}
                        </Button>
                        <Button 
                          onClick={() => handleGestorAction('Recusado')} 
                          disabled={actionLoading}
                          variant="destructive"
                          className="flex-1"
                        >
                          {actionLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            'Recusar'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Informações do Chamado */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Criado em</p>
                    <p className="text-sm text-gray-600">{formatDate(chamado.criadoEm)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Solicitante</p>
                    <p className="text-sm text-gray-600">{solicitante?.nome || 'Carregando...'}</p>
                  </div>
                </div>

                {executor && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Executor</p>
                      <p className="text-sm text-gray-600">{executor.nome}</p>
                    </div>
                  </div>
                )}

                {chamado.assumidoEm && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Assumido em</p>
                      <p className="text-sm text-gray-600">{formatDate(chamado.assumidoEm)}</p>
                    </div>
                  </div>
                )}

                {chamado.resolvidoEm && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Resolvido em</p>
                      <p className="text-sm text-gray-600">{formatDate(chamado.resolvidoEm)}</p>
                    </div>
                  </div>
                )}

                {chamado.tempoGasto && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Tempo Gasto</p>
                      <p className="text-sm text-gray-600">{chamado.tempoGasto}h</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Histórico */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chamado.historico?.map((evento, index) => (
                    <div key={index} className="border-l-2 border-gray-200 pl-4 pb-3">
                      <p className="text-sm font-medium">{evento.acao}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(evento.timestamp)}
                      </p>
                      {evento.detalhes && (
                        <p className="text-xs text-gray-600 mt-1">{evento.detalhes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

