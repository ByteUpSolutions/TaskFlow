import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { LogOut, Clock } from 'lucide-react';

export default function AguardandoAprovacao() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <Clock className="mx-auto h-12 w-12 text-yellow-500" />
          <CardTitle className="mt-4">Aguardando Aprovação</CardTitle>
          <CardDescription>
            Olá, {userProfile?.nome}! Sua conta foi criada com sucesso e está pendente de aprovação por um gestor.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-6">
            Você pode fechar esta página e tentar fazer login novamente mais tarde.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}