import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
  const { currentUser, userProfile, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-32 w-32 animate-spin text-blue-600" /></div>;
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // ✅ VALIDAÇÃO DE ACESSO
  if (userProfile?.acesso === 'pendente') {
    return <Navigate to="/aguardando-aprovacao" />;
  }
  
  return children;
}