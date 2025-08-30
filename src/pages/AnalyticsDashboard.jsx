import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllChamadosForAnalytics, getAllUsers } from '../services/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { startOfYear, startOfMonth, startOfWeek, endOfDay, isWithinInterval } from 'date-fns';
import { Loader2, TrendingUp, Clock, Users, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// ✅ 1. FUNÇÃO DE FORMATAR O TEMPO SIMPLIFICADA
const formatTime = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined) return '00:00:00';
  // Agora assume que o valor é sempre em segundos
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);
  return [hours, minutes, secs].map(v => v < 10 ? "0" + v : v).join(":");
};

const formatDecimalHours = (decimalHours) => {
  if (decimalHours === null || decimalHours === undefined || isNaN(decimalHours)) return "0h 0m";
  const hours = Math.floor(decimalHours);
  const minutes = Math.round((decimalHours - hours) * 60);
  return `${hours}h ${minutes}m`;
};


export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('all');
  const [openRow, setOpenRow] = useState(null); 

  const { data: allChamados, isLoading: isLoadingChamados } = useQuery({
    queryKey: ['allChamados'],
    queryFn: getAllChamadosForAnalytics
  });

  const { data: allUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['allUsers'],
    queryFn: getAllUsers
  });

  const metrics = useMemo(() => {
    if (!allChamados || !allUsers) return null;

    const now = new Date();
    const filteredChamados = allChamados.filter(chamado => {
      if (dateRange === 'all') return true;
      if (!chamado.criadoEm?.toDate) return false;
      const criadoDate = chamado.criadoEm.toDate();
      let interval;
      if (dateRange === 'year') interval = { start: startOfYear(now), end: endOfDay(now) };
      if (dateRange === 'month') interval = { start: startOfMonth(now), end: endOfDay(now) };
      if (dateRange === 'week') interval = { start: startOfWeek(now), end: endOfDay(now) };
      return isWithinInterval(criadoDate, interval);
    });

    const chamadosAprovados = filteredChamados.filter(
      c => c.status === 'Aprovado' && typeof c.tempoGasto === 'number' && c.tempoGasto > 0
    );

    // ✅ 2. LÓGICA DE CÁLCULO SIMPLIFICADA
    // Removemos a verificação de dados legados e somamos diretamente os segundos
    const totalSegundosGastos = chamadosAprovados.reduce((acc, c) => acc + c.tempoGasto, 0);

    const mediaTempoResolucaoDecimal = chamadosAprovados.length > 0
      ? (totalSegundosGastos / chamadosAprovados.length / 3600)
      : 0;

    const dataStatus = Object.entries(filteredChamados.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1; return acc;
    }, {})).map(([name, value]) => ({ name, value }));
    
    const dataPrioridade = Object.entries(filteredChamados.reduce((acc, c) => {
      acc[c.prioridade] = (acc[c.prioridade] || 0) + 1; return acc;
    }, {})).map(([name, value]) => ({ name, value }));

    const userMetrics = allUsers.map(user => {
      const resolvidos = filteredChamados.filter(c => c.executorId === user.uid && c.status === 'Aprovado');
      // ✅ 3. LÓGICA DE CÁLCULO SIMPLIFICADA AQUI TAMBÉM
      const totalTempoSegundos = resolvidos.reduce((acc, c) => acc + (c.tempoGasto || 0), 0);
      const mediaTempoDecimal = resolvidos.length > 0 ? (totalTempoSegundos / resolvidos.length / 3600) : 0;
      return {
        nome: user.nome,
        chamadosResolvidos: resolvidos.length,
        mediaTempoGastoDecimal: mediaTempoDecimal,
        listaDeChamados: resolvidos
      };
    }).sort((a, b) => b.chamadosResolvidos - a.chamadosResolvidos);

    return { totalChamados: filteredChamados.length, mediaTempoResolucaoDecimal, dataStatus, dataPrioridade, userMetrics };
  }, [allChamados, allUsers, dateRange]);

  if (isLoadingChamados || isLoadingUsers) {
    return <div className="flex justify-center py-12"><Loader2 className="h-16 w-16 animate-spin text-blue-600" /></div>;
  }
  
  if (!metrics) return null;

  return (
    <div className="space-y-8">
      {/* ... (Cabeçalho e KPIs - sem alterações) ... */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard Analítico</h2>
          <p className="text-gray-600">Visão geral da performance da equipe e dos chamados.</p>
        </div>
        
        <div className="flex items-center gap-2 p-1 bg-gray-100 rounded-lg">
          <Button size="sm" variant={dateRange === 'all' ? 'default' : 'ghost'} onClick={() => setDateRange('all')}>Total</Button>
          <Button size="sm" variant={dateRange === 'year' ? 'default' : 'ghost'} onClick={() => setDateRange('year')}>Este Ano</Button>
          <Button size="sm" variant={dateRange === 'month' ? 'default' : 'ghost'} onClick={() => setDateRange('month')}>Este Mês</Button>
          <Button size="sm" variant={dateRange === 'week' ? 'default' : 'ghost'} onClick={() => setDateRange('week')}>Esta Semana</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp/> Total de Chamados</CardTitle><CardDescription className="text-3xl font-bold">{metrics.totalChamados}</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock/> Tempo Médio de Resolução</CardTitle><CardDescription className="text-3xl font-bold">{formatDecimalHours(metrics.mediaTempoResolucaoDecimal)}</CardDescription></CardHeader></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users/> Total de Usuários</CardTitle><CardDescription className="text-3xl font-bold">{allUsers.length}</CardDescription></CardHeader></Card>
      </div>


      {/* ... (Gráficos e Tabela - sem alterações) ... */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Chamados por Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={metrics.dataStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {metrics.dataStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Chamados por Prioridade</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.dataPrioridade}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Performance por Usuário</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">Usuário</TableHead>
                <TableHead className="text-center">Chamados Aprovados</TableHead>
                <TableHead className="text-right">Tempo Médio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.userMetrics.map(user => {
                const isOpen = openRow === user.nome;
                return (
                  <React.Fragment key={user.nome}>
                    <TableRow 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setOpenRow(isOpen ? null : user.nome)}
                    >
                      <TableCell className="font-medium flex items-center gap-2">
                         <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                         {user.nome}
                      </TableCell>
                      <TableCell className="text-center">{user.chamadosResolvidos}</TableCell>
                      <TableCell className="text-right">{formatDecimalHours(user.mediaTempoGastoDecimal)}</TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow>
                        <TableCell colSpan={3} className="p-0 bg-gray-50/50">
                          <div className="p-4">
                            <h4 className="font-semibold mb-2 ml-2">Chamados Resolvidos por {user.nome}</h4>
                            {user.listaDeChamados.length > 0 ? (
                              <div className="space-y-2">
                                {user.listaDeChamados.map(chamado => (
                                  <div key={chamado.id} className="flex justify-between items-center p-2 border-b last:border-b-0">
                                    <span className="text-sm text-gray-700 truncate pr-4">{chamado.titulo}</span>
                                    <span className="text-sm font-mono text-gray-900 bg-gray-200 px-2 py-1 rounded-md">{formatTime(chamado.tempoGasto)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4">Nenhum chamado para exibir neste período.</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
