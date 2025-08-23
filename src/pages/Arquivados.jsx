import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscribeToArquivados } from '../services/firestore';
import ChamadoCard from '../components/ChamadoCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2 } from 'lucide-react';
import { Input } from '../components/ui/input';

export default function Arquivados() {
  const [chamadosArquivados, setChamadosArquivados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = subscribeToArquivados((data) => {
      setChamadosArquivados(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleViewDetails = (chamado) => {
    navigate(`/chamado/${chamado.id}`);
  };

  const filteredChamados = chamadosArquivados.filter(chamado =>
    chamado.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    chamado.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-16 w-16 animate-spin text-blue-600" /></div>;
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Chamados Arquivados</h2>
          <p className="text-gray-600">Consulte o histórico de chamados finalizados.</p>
        </div>
        <Input
          type="text"
          placeholder="Pesquisar por título ou descrição..."
          className="max-w-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          {filteredChamados.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChamados.map((chamado) => (
                <ChamadoCard
                  key={chamado.id}
                  chamado={chamado}
                  onViewDetails={handleViewDetails}
                  // Não passamos onTakeAction, pois chamados arquivados não têm ações
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              {searchTerm ? 'Nenhum chamado encontrado com o termo pesquisado.' : 'Nenhum chamado foi arquivado ainda.'}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}