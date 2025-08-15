import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup'; // ✅ 1. DESCOMENTE ESTA LINHA
import Dashboard from './pages/Dashboard';
import NewChamado from './pages/NewChamado';
import ChamadoDetails from './pages/ChamadoDetails';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* --- Rotas Públicas --- */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} /> {/* ✅ 2. DESCOMENTE ESTA LINHA */}

            {/* --- Rotas Protegidas (só para usuários logados) --- */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/novo-chamado" 
              element={
                <ProtectedRoute>
                  <NewChamado />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chamado/:id" 
              element={
                <ProtectedRoute>
                  <ChamadoDetails />
                </ProtectedRoute>
              } 
            />
            
            {/* --- Rota Padrão --- */}
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;