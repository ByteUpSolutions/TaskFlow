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
  // ✅ 1. O estado 'prazo' agora guardará a data como uma string (ex: "2025-12-31")
  const [prazo, setPrazo] = useState(''); 
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
    if (!prazo) {
      return setError('Selecione um prazo para a conclusão');
    }
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
        // ✅ 2. Converte a string de data para um objeto Date antes de salvar
        prazo: new Date(prazo), 
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
                  placeholder="Forneça uma descrição detalhada do problema..."
                  value={formData.descricao}
                  onChange={handleChange}
                  rows={6}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="prioridade">Prioridade</Label>
                  <Select onValueChange={handlePrioridadeChange} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a prioridade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* ✅ 3. CAMPO DE PRAZO SUBSTITUÍDO PELO INPUT NATIVO */}
                <div className="space-y-2">
                  <Label htmlFor="prazo">Prazo de Conclusão</Label>
                  <Input
                    id="prazo"
                    type="date"
                    value={prazo}
                    onChange={(e) => setPrazo(e.target.value)}
                    required
                    className="block w-full"
                  />
                </div>
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
