import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createChamado } from '../services/firestore';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function NewChamado() {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    prioridade: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  function handlePrioridadeChange(value) {
    setFormData({
      ...formData,
      prioridade: value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!formData.prioridade) {
      return setError('Selecione uma prioridade');
    }

    // Apenas Gestores podem criar chamados
    if (userProfile?.perfil !== 'Gestor') {
      return setError('Apenas gestores podem criar chamados.');
    }

    try {
      setError('');
      setLoading(true);
      
      const chamadoData = {
        titulo: formData.titulo,
        descricao: formData.descricao,
        prioridade: formData.prioridade,
        // O solicitante agora é o próprio gestor que está criando o chamado
        solicitanteId: currentUser.uid 
      };

      await createChamado(chamadoData);
      navigate('/dashboard');
    } catch (error) {
      setError('Erro ao criar chamado. Tente novamente.');
      console.error('Error creating chamado:', error);
    }

    setLoading(false);
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
            <h1 className="text-xl font-semibold text-gray-900">Novo Chamado</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Chamado</CardTitle>
            <CardDescription>
              Preencha as informações abaixo para criar um novo chamado
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="titulo">Título do Chamado</Label>
                <Input
                  id="titulo"
                  name="titulo"
                  type="text"
                  placeholder="Descreva brevemente o problema ou solicitação"
                  value={formData.titulo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Detalhada</Label>
                <Textarea
                  id="descricao"
                  name="descricao"
                  placeholder="Forneça uma descrição detalhada do problema, incluindo passos para reproduzir, contexto e qualquer informação relevante"
                  value={formData.descricao}
                  onChange={handleChange}
                  rows={6}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioridade">Prioridade</Label>
                <Select onValueChange={handlePrioridadeChange} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                        Baixa - Não urgente, pode aguardar
                      </div>
                    </SelectItem>
                    <SelectItem value="Média">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                        Média - Importante, mas não crítico
                      </div>
                    </SelectItem>
                    <SelectItem value="Alta">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                        Alta - Urgente, precisa de atenção imediata
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    'Criar Chamado'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
