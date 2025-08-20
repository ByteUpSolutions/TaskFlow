import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { 
  updateChamado, 
  getUsuario,
  getUsuariosPorPerfil,
  addComentario 
} from '../services/firestore';
import { db } from '../lib/firebase';

// Componentes da UI
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Clock, User, AlertCircle, Loader2 } from 'lucide-react';

export default function ChamadoDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  // Estados do componente
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

  const [executores, setExecutores] = useState([]);
  const [selectedExecutor, setSelectedExecutor] = useState('');
  const [novoComentario, setNovoComentario] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const showAction = searchParams.get('action') === 'true';

  useEffect(() => {
    if (!id) return;

    // Monitora o chamado em tempo real
    const unsubscribe = onSnapshot(doc(db, 'chamados', id), async (doc) => {
      if (doc.exists()) {
        const chamadoData = { id: doc.id, ...doc.data() };
        setChamado(chamadoData);

        if (chamadoData.solicitanteId) {
          setSolicitante(await getUsuario(chamadoData.solicitanteId));
        }
        if (chamadoData.executorId) {
          setExecutor(await getUsuario(chamadoData.executorId));
        } else {
          setExecutor(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id]);
  
  useEffect(() => {
    if (userProfile?.perfil === 'Gestor') {
      const fetchExecutores = async () => {
        setExecutores(await getUsuariosPorPerfil('Executor'));
      };
      fetchExecutores();
    }
  }, [userProfile]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('pt-BR');
  };

  const getActionText = () => {
    if (chamado.status === 'Aberto') return 'Assumir Chamado';
    if (chamado.status === 'Em Andamento') return 'Marcar como Resolvido';
    return '';
  };
  
  // --- Funções de Ação ---

  const handleAction = async () => {
    if (!chamado || !currentUser) return;

    try {
      setActionLoading(true);
      setError('');

      if (chamado.status === 'Aberto') {
        await updateChamado(chamado.id, {
          status: 'Em Andamento',
          executorId: currentUser.uid
        }, currentUser.uid, 'Assumiu o chamado');
      } else if (chamado.status === 'Em Andamento') {
        if (!actionData.tempoGasto) {
          setError('Tempo gasto é obrigatório');
          setActionLoading(false);
          return;
        }
        await updateChamado(chamado.id, {
          status: 'Resolvido',
          tempoGasto: parseFloat(actionData.tempoGasto),
          notasResolucao: actionData.notasResolucao
        }, currentUser.uid, 'Resolveu o chamado');
      }
      navigate('/dashboard');
    } catch (err) {
      setError('Erro ao executar ação. Tente novamente.');
      console.error('Error taking action:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGestorAction = async (novoStatus) => {
    if (!chamado || !currentUser) return;

    let updates = {
      justificativaGestor: actionData.justificativa,
    };

    if (novoStatus === 'Aprovado') {
      updates.status = 'Aprovado';
    } else if (novoStatus === 'Recusado') {
      updates.status = 'Em Andamento';
      updates.recusadoAnteriormente = true;
    }

    try {
      setActionLoading(true);
      setError('');
      await updateChamado(chamado.id, updates, currentUser.uid, novoStatus === 'Aprovado' ? 'Aprovou o chamado' : `Recusou o chamado: ${actionData.justificativa}`);
      navigate('/dashboard');
    } catch (error) {
      setError('Erro ao executar ação. Tente novamente.');
      console.error('Error taking gestor action:', error);
    } finally {
      setActionLoading(false);
    }
  };
  
  const handlePauseToggle = async () => {
    if (!chamado) return;
    const novoStatus = chamado.status === 'Pausado' ? 'Em Andamento' : 'Pausado';
    const acao = novoStatus === 'Pausado' ? 'Pausou o chamado' : 'Retomou o chamado';
    await updateChamado(id, { status: novoStatus }, currentUser.uid, acao);
  };

  const handleTransferirChamado = async () => {
    if (!selectedExecutor) return setError('Selecione um novo executor.');
    const novoExecutor = executores.find(e => e.id === selectedExecutor);
    await updateChamado(id, { executorId: selectedExecutor }, currentUser.uid, `Transferiu para ${novoExecutor?.nome}`);
    setIsTransferModalOpen(false);
  };

  const handleAddComentario = async () => {
    if (novoComentario.trim() === '') return;
    const comentarioData = {
      texto: novoComentario,
      autorNome: userProfile.nome,
      autorId: currentUser.uid,
      timestamp: new Date()
    };
    await addComentario(id, comentarioData);
    setNovoComentario('');
  };

  // ✅ NOVA FUNÇÃO PARA ARQUIVAR O CHAMADO
  const handleArquivar = async () => {
    if (!chamado || userProfile.perfil !== 'Gestor') return;

    setActionLoading(true);
    try {
      await updateChamado(
        chamado.id,
        { arquivado: true },
        currentUser.uid,
        'Arquivou o chamado'
      );
      navigate('/dashboard'); // Volta para o dashboard após arquivar
    } catch (error) {
      setError('Erro ao arquivar o chamado.');
      console.error('Error archiving chamado:', error);
    }
    setActionLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-32 w-32 animate-spin text-blue-600" /></div>;
  }

  if (!chamado) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Chamado não encontrado.</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">Voltar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">Detalhes do Chamado</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl">{chamado.titulo}</CardTitle>
                    <CardDescription className="mt-2">Chamado #{chamado.id.slice(-8)}</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`${
                      chamado.status === 'Aberto' ? 'bg-blue-100 text-blue-800' :
                      chamado.status === 'Em Andamento' ? 'bg-yellow-100 text-yellow-800' :
                      chamado.status === 'Pausado' ? 'bg-gray-100 text-gray-800' :
                      chamado.status === 'Resolvido' ? 'bg-purple-100 text-purple-800' :
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
                  {chamado.notasResolucao && (<div><h4 className="font-semibold mb-2">Notas de Resolução</h4><p className="text-gray-700 whitespace-pre-wrap">{chamado.notasResolucao}</p></div>)}
                  {chamado.justificativaGestor && (<div><h4 className="font-semibold mb-2">Justificativa do Gestor</h4><p className="text-gray-700 whitespace-pre-wrap">{chamado.justificativaGestor}</p></div>)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Comentários</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2">
                  {chamado.comentarios && chamado.comentarios.length > 0 ? (
                    chamado.comentarios.map((comentario, index) => (
                      <div key={index} className="border-l-2 pl-3"><p className="text-sm">{comentario.texto}</p><p className="text-xs text-gray-500 mt-1">- {comentario.autorNome} em {formatDate(comentario.timestamp)}</p></div>
                    ))
                  ) : (<p className="text-sm text-gray-500">Nenhum comentário ainda.</p>)}
                </div>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <Label htmlFor="novoComentario">Adicionar Resposta</Label>
                  <Textarea id="novoComentario" placeholder="Digite sua resposta..." value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} rows={3} />
                  <Button onClick={handleAddComentario} disabled={!novoComentario.trim()}>Enviar</Button>
                </div>
              </CardContent>
            </Card>

            {(showAction || (userProfile?.perfil === 'Executor' || userProfile?.perfil === 'Gestor')) && (
              <Card>
                <CardHeader><CardTitle>Ações do Chamado</CardTitle></CardHeader>
                <CardContent>
                  {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                  
                  {chamado.status === 'Aberto' && (userProfile?.perfil === 'Executor' || userProfile?.perfil === 'Gestor') && (
                    <Button onClick={handleAction} disabled={actionLoading} className="w-full">{actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : getActionText()}</Button>
                  )}

                  {chamado.status === 'Em Andamento' && chamado.executorId === currentUser.uid && (
                    <div className="space-y-4">
                      <div><Label htmlFor="tempoGasto">Tempo Gasto (horas)</Label><Input id="tempoGasto" type="number" step="0.5" placeholder="Ex: 2.5" value={actionData.tempoGasto} onChange={(e) => setActionData({...actionData, tempoGasto: e.target.value})} /></div>
                      <div><Label htmlFor="notasResolucao">Notas de Resolução</Label><Textarea id="notasResolucao" placeholder="Descreva como o problema foi resolvido..." value={actionData.notasResolucao} onChange={(e) => setActionData({...actionData, notasResolucao: e.target.value})} rows={4}/></div>
                      <Button onClick={handleAction} disabled={actionLoading} className="w-full">{actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : getActionText()}</Button>
                    </div>
                  )}

                  {chamado.status === 'Resolvido' && userProfile?.perfil === 'Gestor' && (
                    <div className="space-y-4">
                      <div><Label htmlFor="justificativa">Justificativa (obrigatório para recusar)</Label><Textarea id="justificativa" placeholder="Adicione uma justificativa para sua decisão..." value={actionData.justificativa} onChange={(e) => setActionData({...actionData, justificativa: e.target.value})} rows={3}/></div>
                      <div className="flex gap-2">
                        <Button onClick={() => handleGestorAction('Aprovado')} disabled={actionLoading} className="flex-1">{actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Aprovar'}</Button>
                        <Button onClick={() => handleGestorAction('Recusado')} disabled={actionLoading || !actionData.justificativa} variant="destructive" className="flex-1">{actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Recusar'}</Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    {['Em Andamento', 'Pausado'].includes(chamado.status) && chamado.executorId === currentUser.uid && (
                      <Button onClick={handlePauseToggle} variant="outline">{chamado.status === 'Pausado' ? 'Retomar' : 'Pausar'}</Button>
                    )}
                    {userProfile?.perfil === 'Gestor' && ['Em Andamento', 'Pausado'].includes(chamado.status) && (
                      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
                        <DialogTrigger asChild><Button variant="outline">Transferir</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Transferir Chamado</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-4">
                            <Label>Selecione o novo executor</Label>
                            <Select onValueChange={setSelectedExecutor}>
                              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>{executores.map(exec => (<SelectItem key={exec.id} value={exec.id}>{exec.nome}</SelectItem>))}</SelectContent>
                            </Select>
                            <Button onClick={handleTransferirChamado} className="w-full">Confirmar</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  
                  {/* ✅ BOTÃO E LÓGICA DE ARQUIVAMENTO */}
                  {chamado.status === 'Aprovado' && userProfile?.perfil === 'Gestor' && (
                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        variant="outline"
                        onClick={handleArquivar}
                        disabled={actionLoading}
                        className="w-full"
                      >
                        {actionLoading ? (
                           <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Arquivando...</>
                        ) : 'Arquivar Chamado'}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Esta ação irá remover o chamado do dashboard principal.
                      </p>
                    </div>
                  )}

                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="space-y-6">
            <Card><CardHeader><CardTitle className="text-lg">Informações</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Criado em</p><p className="text-sm text-gray-600">{formatDate(chamado.criadoEm)}</p></div></div><div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Solicitante</p><p className="text-sm text-gray-600">{solicitante?.nome || 'Carregando...'}</p></div></div>{executor && (<div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Executor</p><p className="text-sm text-gray-600">{executor.nome}</p></div></div>)}{chamado.assumidoEm && (<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Assumido em</p><p className="text-sm text-gray-600">{formatDate(chamado.assumidoEm)}</p></div></div>)}{chamado.resolvidoEm && (<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Resolvido em</p><p className="text-sm text-gray-600">{formatDate(chamado.resolvidoEm)}</p></div></div>)}{chamado.tempoGasto && (<div className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Tempo Gasto</p><p className="text-sm text-gray-600">{chamado.tempoGasto}h</p></div></div>)}</CardContent></Card>
            <Card><CardHeader><CardTitle className="text-lg">Histórico</CardTitle></CardHeader><CardContent><div className="space-y-3 max-h-60 overflow-y-auto pr-2">{chamado.historico?.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate()).map((evento, index) => (<div key={index} className="border-l-2 border-gray-200 pl-4 pb-3"><p className="text-sm font-medium">{evento.acao}</p><p className="text-xs text-gray-500">{formatDate(evento.timestamp)}</p>{evento.detalhes && (<p className="text-xs text-gray-600 mt-1">{evento.detalhes}</p>)}</div>))}</div></CardContent></Card>
          </div>
        </div>
      </main>
    </div>
  );
}