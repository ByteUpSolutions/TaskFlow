import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, serverTimestamp } from 'firebase/firestore'; // Importar serverTimestamp
import { useAuth } from '../contexts/AuthContext';
import { 
  updateChamado, 
  getUsuario,
  getAssignableUsers,
  addComentario,
  stopAndCalculateTime // ✅ Importar a nova função
} from '../services/firestore';
import { db } from '../lib/firebase';

// Componentes da UI
import { Button } from '../components/ui/button';
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
  const navigate = useNavigate();
  const { currentUser, userProfile } = useAuth();
  
  const [chamado, setChamado] = useState(null);
  const [solicitante, setSolicitante] = useState(null);
  const [executor, setExecutor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  
  // ✅ Removido 'tempoGasto' do estado inicial
  const [actionData, setActionData] = useState({
    notasResolucao: '',
    justificativa: ''
  });

  const [executores, setExecutores] = useState([]); 
  const [selectedExecutor, setSelectedExecutor] = useState('');
  const [novoComentario, setNovoComentario] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'chamados', id), async (doc) => {
      if (doc.exists()) {
        const chamadoData = { id: doc.id, ...doc.data() };
        setChamado(chamadoData);
        if (chamadoData.solicitanteId) setSolicitante(await getUsuario(chamadoData.solicitanteId));
        if (chamadoData.executorId) setExecutor(await getUsuario(chamadoData.executorId));
        else setExecutor(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);
  
  useEffect(() => {
    if (userProfile?.perfil === 'Gestor') {
      const fetchAssignableUsers = async () => setExecutores(await getAssignableUsers());
      fetchAssignableUsers();
    }
  }, [userProfile]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate ? timestamp.toDate().toLocaleString('pt-BR') : new Date(timestamp).toLocaleString('pt-BR');
  };

  // ✅ NOVA FUNÇÃO: Formatar segundos para HH:MM:SS
  const formatTime = (totalSeconds) => {
    if (totalSeconds === null || totalSeconds === undefined) return '00:00:00';
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map(v => v < 10 ? "0" + v : v).join(":");
  };
  
  // --- Funções de Ação ATUALIZADAS para o cronômetro ---

  const handleStartTimer = async () => {
    const updates = {
      status: 'Em Andamento',
      timerStartedAt: serverTimestamp()
    };
    if (!chamado.executorId) {
      updates.executorId = currentUser.uid;
    }
    await updateChamado(id, updates, currentUser.uid, 'Iniciou o trabalho no chamado');
  };

  const handlePauseTimer = async () => {
    await stopAndCalculateTime(id);
    await updateChamado(id, { status: 'Pausado' }, currentUser.uid, 'Pausou o trabalho no chamado');
  };

  const handleResolveChamado = async () => {
    setActionLoading(true);
    const finalTime = await stopAndCalculateTime(id);
    await updateChamado(id, {
      status: 'Resolvido',
      tempoGasto: finalTime,
      notasResolucao: actionData.notasResolucao
    }, currentUser.uid, 'Resolveu o chamado');
    setActionLoading(false);
    navigate('/dashboard');
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
      navigate('/dashboard'); 
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
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mr-4">
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
                    {/* ✅ INDICADOR DE CRONÔMETRO ATIVO */}
                    {chamado.timerStartedAt && (
                      <div className="flex items-center gap-2 text-green-600 mt-2 animate-pulse">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium">Cronômetro ativo...</span>
                      </div>
                    )}
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

            {!chamado.arquivado && (userProfile?.perfil === 'Executor' || userProfile?.perfil === 'Gestor') && (
              <Card>
                <CardHeader><CardTitle>Ações do Chamado</CardTitle></CardHeader>
                <CardContent>
                  {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                  
                  {/* ✅ LÓGICA DE AÇÕES ATUALIZADA */}
                  {chamado.status === 'Aberto' && (
                    <Button onClick={handleStartTimer} disabled={actionLoading} className="w-full">
                      {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Iniciando...</> : 'Assumir e Iniciar Trabalho'}
                    </Button>
                  )}

                  {chamado.status === 'Em Andamento' && chamado.executorId === currentUser.uid && (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="notasResolucao">Notas de Resolução (Obrigatório para resolver)</Label>
                        <Textarea id="notasResolucao" value={actionData.notasResolucao} onChange={(e) => setActionData({...actionData, notasResolucao: e.target.value})} />
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={handlePauseTimer} disabled={actionLoading} variant="outline" className="flex-1">Pausar</Button>
                        <Button onClick={handleResolveChamado} disabled={actionLoading || !actionData.notasResolucao} className="flex-1">Marcar como Resolvido</Button>
                      </div>
                    </div>
                  )}

                  {chamado.status === 'Pausado' && chamado.executorId === currentUser.uid && (
                    <Button onClick={handleStartTimer} disabled={actionLoading} className="w-full">
                      {actionLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retomando...</> : 'Retomar Trabalho'}
                    </Button>
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
                    {userProfile?.perfil === 'Gestor' && ['Em Andamento', 'Pausado'].includes(chamado.status) && (
                      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
                        <DialogTrigger asChild><Button variant="outline">Transferir</Button></DialogTrigger>
                        <DialogContent>
                          <DialogHeader><DialogTitle>Transferir Chamado</DialogTitle></DialogHeader>
                          <div className="space-y-4 py-4">
                            <Label>Selecione o novo responsável</Label>
                            <Select onValueChange={setSelectedExecutor}>
                              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                              <SelectContent>
                                {executores.map(user => (
                                  <SelectItem key={user.id} value={user.id}>
                                    {user.nome} ({user.perfil})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button onClick={handleTransferirChamado} className="w-full">Confirmar</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                  
                  {chamado.status === 'Aprovado' && userProfile?.perfil === 'Gestor' && !chamado.arquivado && (
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

            {chamado.arquivado && (
              <Alert variant="default" className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-700" />
                <AlertDescription className="text-blue-800">
                  Este chamado está arquivado e serve apenas para consulta. Nenhuma nova ação pode ser realizada.
                </AlertDescription>
              </Alert>
            )}

          </div>
          
          <div className="space-y-6">
            <Card><CardHeader><CardTitle className="text-lg">Informações</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Criado em</p><p className="text-sm text-gray-600">{formatDate(chamado.criadoEm)}</p></div></div><div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Solicitante</p><p className="text-sm text-gray-600">{solicitante?.nome || 'Carregando...'}</p></div></div>{executor && (<div className="flex items-center gap-2"><User className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Executor</p><p className="text-sm text-gray-600">{executor.nome}</p></div></div>)}{chamado.assumidoEm && (<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Assumido em</p><p className="text-sm text-gray-600">{formatDate(chamado.assumidoEm)}</p></div></div>)}{chamado.resolvidoEm && (<div className="flex items-center gap-2"><Clock className="h-4 w-4 text-gray-500" /><div><p className="text-sm font-medium">Resolvido em</p><p className="text-sm text-gray-600">{formatDate(chamado.resolvidoEm)}</p></div></div>)}
                {/* ✅ EXIBIÇÃO DO TEMPO FORMATADO */}
                {chamado.tempoGasto > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Tempo Gasto</p>
                      <p className="text-sm text-gray-600 font-mono">{formatTime(chamado.tempoGasto)}</p>
                    </div>
                  </div>
                )}
              </CardContent></Card>
            <Card><CardHeader><CardTitle className="text-lg">Histórico</CardTitle></CardHeader><CardContent><div className="space-y-3 max-h-60 overflow-y-auto pr-2">{chamado.historico?.sort((a, b) => b.timestamp.toDate() - a.timestamp.toDate()).map((evento, index) => (<div key={index} className="border-l-2 border-gray-200 pl-4 pb-3"><p className="text-sm font-medium">{evento.acao}</p><p className="text-xs text-gray-500">{formatDate(evento.timestamp)}</p>{evento.detalhes && (<p className="text-xs text-gray-600 mt-1">{evento.detalhes}</p>)}</div>))}</div></CardContent></Card>
          </div>
        </div>
      </main>
    </div>
  );
}