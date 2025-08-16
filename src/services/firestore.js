import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Chamados
export const createChamado = async (chamadoData) => {
  try {
    const docRef = await addDoc(collection(db, 'chamados'), {
      ...chamadoData,
      status: 'Aberto',
      criadoEm: serverTimestamp(),
      historico: [{
        autor: chamadoData.solicitanteId,
        acao: 'Criado',
        timestamp: new Date(),
        detalhes: 'Chamado criado'
      }]
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating chamado:', error);
    throw error;
  }
};

export const getChamados = async (filters = {}) => {
  try {
    let q = collection(db, 'chamados');
    
    if (filters.solicitanteId) {
      q = query(q, where('solicitanteId', '==', filters.solicitanteId));
    }
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    q = query(q, orderBy('criadoEm', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const chamados = [];
    querySnapshot.forEach((doc) => {
      chamados.push({ id: doc.id, ...doc.data() });
    });
    
    return chamados;
  } catch (error) {
    console.error('Error getting chamados:', error);
    throw error;
  }
};

export const updateChamado = async (chamadoId, updates, userId, acao) => {
  try {
    const chamadoRef = doc(db, 'chamados', chamadoId);
    
    // Get current chamado to update history
    const chamadoDoc = await getDoc(chamadoRef);
    const currentData = chamadoDoc.data();
    
    const newHistoryEntry = {
      autor: userId,
      acao: acao,
      timestamp: new Date(),
      detalhes: `Status alterado para ${updates.status || 'atualizado'}`
    };
    
    const updatedData = {
      ...updates,
      historico: [...(currentData.historico || []), newHistoryEntry]
    };
    
    // Add timestamps based on status
    if (updates.status === 'Em Andamento') {
      updatedData.assumidoEm = serverTimestamp();
      updatedData.executorId = userId;
    } else if (updates.status === 'Resolvido') {
      updatedData.resolvidoEm = serverTimestamp();
    }
    
    await updateDoc(chamadoRef, updatedData);
  } catch (error) {
    console.error('Error updating chamado:', error);
    throw error;
  }
};

export const subscribeToChamados = (filters, callback) => {
  try {
    let q = collection(db, 'chamados');
    
    if (filters.solicitanteId) {
      q = query(q, where('solicitanteId', '==', filters.solicitanteId));
    }
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    
    q = query(q, orderBy('criadoEm', 'desc'));
    
    return onSnapshot(q, (querySnapshot) => {
      const chamados = [];
      querySnapshot.forEach((doc) => {
        chamados.push({ id: doc.id, ...doc.data() });
      });
      callback(chamados);
    });
  } catch (error) {
    console.error('Error subscribing to chamados:', error);
    throw error;
  }
};
// NOVA FUNÇÃO: Buscar todos os usuários com um perfil específico (ex: 'Executor')
export const getUsuariosPorPerfil = async (perfil) => {
  try {
    const q = query(collection(db, 'usuarios'), where('perfil', '==', perfil));
    const querySnapshot = await getDocs(q);
    const usuarios = [];
    querySnapshot.forEach((doc) => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });
    return usuarios;
  } catch (error) {
    console.error('Erro ao buscar usuários por perfil:', error);
    throw error;
  }
};

// NOVA FUNÇÃO: Adicionar um comentário a um chamado
export const addComentario = async (chamadoId, comentarioData) => {
    try {
        const chamadoRef = doc(db, 'chamados', chamadoId);
        await updateDoc(chamadoRef, {
            comentarios: arrayUnion(comentarioData) // Adiciona o objeto ao array de comentários
        });
    } catch (error) {
        console.error('Erro ao adicionar comentário:', error);
        throw error;
    }
};

// Usuários
export const getUsuario = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting usuario:', error);
    throw error;
  }
};

