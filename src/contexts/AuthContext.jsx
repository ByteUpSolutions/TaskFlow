import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase'; // Certifique-se que o caminho está correto

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função de Login real com Firebase
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Função de Logout real com Firebase
  const logout = () => {
    setUserProfile(null); // Limpa o perfil imediatamente
    return signOut(auth);
  };

  // Função de Cadastro real com Firebase
  const signup = async (email, password, userData) => {
    // 1. Cria o usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Salva os dados adicionais (perfil, nome) no Firestore
    const userDocRef = doc(db, 'usuarios', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email,
      nome: userData.nome,
      perfil: userData.perfil,
    });

    return userCredential;
  };

  // Efeito que monitora o estado da autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Se houver um usuário, busca seu perfil no Firestore
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        } else {
          // Opcional: Lidar com caso de usuário autenticado sem perfil no DB
          console.error("Usuário autenticado não possui perfil no Firestore.");
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Função de limpeza que é executada quando o componente é desmontado
    return unsubscribe;
  }, []);


  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}