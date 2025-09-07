import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Plus, Play, Pause, Trash2, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { addAgendaTarefa, subscribeToMonthAgendaTarefas, updateAgendaTarefa, deleteAgendaTarefa } from '../services/firestore';
import { ptBR } from 'date-fns/locale';
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, getDay, isSameDay, isToday } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

// Função para formatar o tempo
const formatTime = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined) return '00:00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return [hours, minutes, seconds].map(v => v < 10 ? "0" + v : v).join(":");
};

// Componente para a lista de tarefas do dia (dentro do Modal)
const DayTasks = ({ tarefas, selectedDate, onAdd, onToggle, onTimer, onDelete, tarefaAtivaId, currentUser, userProfile }) => {
    const [newTarefaTitle, setNewTarefaTitle] = useState('');

    const handleAdd = () => {
        if (newTarefaTitle.trim() === '') return;
        onAdd(newTarefaTitle);
        setNewTarefaTitle('');
    };

    return (
        <div>
            <DialogHeader>
                <DialogTitle>Tarefas para {format(selectedDate, "PPP", { locale: ptBR })}</DialogTitle>
                <DialogDescription>
                    Adicione ou gira as tarefas da equipa para este dia.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <div className="flex gap-2 mb-4">
                    <Input
                        placeholder="Adicionar nova tarefa..."
                        value={newTarefaTitle}
                        onChange={(e) => setNewTarefaTitle(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <Button onClick={handleAdd} size="icon"><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                {tarefas.length > 0 ? tarefas.map(tarefa => {
                    const canModify = userProfile?.perfil === 'Gestor' || tarefa.criadorId === currentUser.uid;
                    return (
                        <div key={tarefa.id} className="flex items-center gap-3 p-2 border rounded-lg hover:bg-gray-50">
                            <Checkbox checked={tarefa.concluida} onCheckedChange={() => onToggle(tarefa)} disabled={!canModify} />
                            <div className="flex-grow">
                                <span className={`${tarefa.concluida ? 'line-through text-gray-500' : ''}`}>{tarefa.titulo}</span>
                                <p className="text-xs text-gray-400">Criado por: {tarefa.criadorNome}</p>
                            </div>
                            <span className="text-sm font-mono text-gray-600">{formatTime(tarefa.tempoGastoSegundos)}</span>
                            <Button variant="ghost" size="icon" onClick={() => onTimer(tarefa)} disabled={!canModify || tarefa.concluida}>
                                {tarefaAtivaId === tarefa.id ? <Pause className="h-4 w-4 text-red-500" /> : <Play className="h-4 w-4" />}
                            </Button>
                            {canModify && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4"/></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        <DropdownMenuItem onClick={() => onDelete(tarefa.id)} className="text-red-600 focus:bg-red-50 focus:text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" /> Apagar
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    );
                }) : (
                    <p className="text-center text-gray-500 py-4">Nenhuma tarefa para este dia.</p>
                )}
                </div>
            </div>
        </div>
    );
};

export default function Agenda() {
  const { currentUser, userProfile } = useAuth(); // ✅ Adicionado userProfile
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [tarefasDoMes, setTarefasDoMes] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tarefaAtivaId, setTarefaAtivaId] = useState(null);

  useEffect(() => {
    if (currentUser) {
      // ✅ A subscrição agora é global, sem passar o ID do utilizador
      const unsubscribe = subscribeToMonthAgendaTarefas(currentMonth, setTarefasDoMes);
      return () => unsubscribe();
    }
  }, [currentUser, currentMonth]);

  useEffect(() => {
    let interval = null;
    if (tarefaAtivaId) {
      interval = setInterval(() => {
        setTarefasDoMes(prev => prev.map(t => 
            t.id === tarefaAtivaId ? { ...t, tempoGastoSegundos: (t.tempoGastoSegundos || 0) + 1 } : t
        ));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tarefaAtivaId]);

  const handleAddTarefa = async (titulo) => {
    // ✅ Agora guarda o criador da tarefa
    const tarefaData = { criadorId: currentUser.uid, criadorNome: userProfile.nome, titulo, data: selectedDate };
    await addAgendaTarefa(tarefaData);
  };
  const handleToggleConcluida = async (tarefa) => {
    if (tarefa.id === tarefaAtivaId) handleToggleTimer(tarefa);
    await updateAgendaTarefa(tarefa.id, { concluida: !tarefa.concluida });
  };
  const handleToggleTimer = async (tarefa) => {
    if (tarefaAtivaId && tarefaAtivaId !== tarefa.id) {
        const tarefaAntiga = tarefasDoMes.find(t => t.id === tarefaAtivaId);
        if (tarefaAntiga) {
            await updateAgendaTarefa(tarefaAntiga.id, { tempoGastoSegundos: tarefaAntiga.tempoGastoSegundos });
        }
    }
    if (tarefa.id === tarefaAtivaId) {
      setTarefaAtivaId(null);
      await updateAgendaTarefa(tarefa.id, { tempoGastoSegundos: tarefa.tempoGastoSegundos });
    } else {
      setTarefaAtivaId(tarefa.id);
    }
  };
  const handleDeleteTarefa = async (tarefaId) => deleteAgendaTarefa(tarefaId);

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDayOfMonth = getDay(startOfMonth(currentMonth));
  const calendarDays = Array.from({ length: firstDayOfMonth }, () => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));
  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft/></Button>
            <CardTitle className="text-xl capitalize">{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</CardTitle>
            <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight/></Button>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-7 gap-1 text-center">
                {weekdays.map(day => <div key={day} className="font-bold text-sm p-2">{day}</div>)}
                {calendarDays.map((day, index) => {
                    const date = day ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) : null;
                    const tarefasDoDia = date ? tarefasDoMes.filter(t => isSameDay(t.data.toDate(), date)) : [];
                    const isCurrentDay = date && isToday(date);

                    return (
                        <div 
                            key={index} 
                            className={`h-28 border rounded-md p-2 text-left flex flex-col cursor-pointer hover:bg-gray-100 transition-colors ${isCurrentDay ? 'bg-blue-50 border-blue-200' : ''}`}
                            onClick={() => { if(date) { setSelectedDate(date); setIsModalOpen(true); }}}
                        >
                            {day && (
                                <>
                                    <span className={`font-medium ${isCurrentDay ? 'text-blue-600' : ''}`}>{day}</span>
                                    {tarefasDoDia.length > 0 && (
                                        <div className="mt-auto text-xs text-center">
                                            <span className="bg-gray-200 px-2 py-0.5 rounded-full">{tarefasDoDia.length} tarefa(s)</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            {selectedDate && (
                <DayTasks 
                    tarefas={tarefasDoMes.filter(t => isSameDay(t.data.toDate(), selectedDate))}
                    selectedDate={selectedDate}
                    onAdd={handleAddTarefa}
                    onToggle={handleToggleConcluida}
                    onTimer={handleToggleTimer}
                    onDelete={handleDeleteTarefa}
                    tarefaAtivaId={tarefaAtivaId}
                    currentUser={currentUser}
                    userProfile={userProfile}
                />
            )}
          </DialogContent>
      </Dialog>
    </div>
  );
}

