import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AguardandoAprovacao from './pages/AguardandoAprovacao';
import Dashboard from './pages/Dashboard';
import Aprovacoes from './pages/Aprovacoes';
import NewChamado from './pages/NewChamado';
import Arquivados from './pages/Arquivados';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import Agenda from './pages/Agenda';
import ChamadoDetails from './pages/ChamadoDetails';
import './App.css';

// Agrupa rotas que usam o mesmo Layout
const AppLayout = () => (
  <Layout><Outlet /></Layout>
);

function App() {
  return (
    <AuthProvider>
      <Router basename="/TaskFlow">
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />

          {/* Rotas Protegidas com Layout */}
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/aprovacoes" element={<Aprovacoes />} />
            <Route path="/arquivados" element={<Arquivados />} />
            <Route path="/analytics" element={<AnalyticsDashboard />} />
            <Route path="/agenda" element={<Agenda />} />
          </Route>
          
          {/* Rotas Protegidas sem Layout (tela cheia) */}
          <Route path="/novo-chamado" element={<ProtectedRoute><NewChamado /></ProtectedRoute>} />
          <Route path="/chamado/:id" element={<ProtectedRoute><ChamadoDetails /></ProtectedRoute>} />
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;