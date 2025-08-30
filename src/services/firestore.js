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
  arrayUnion,
  deleteField
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Chamados
export const createChamado = async (chamadoData) => {
  try {
    const docRef = await addDoc(collection(db, 'chamados'), {
      ...chamadoData,
      status: 'Aberto',
      executorIds: [],
      arquivado: false,
      tempoGasto: 0,
      workIntervals: [],
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

// ✅ FUNÇÃO CORRIGIDA
export const updateChamado = async (chamadoId, updates, userId, acao) => {
  try {
    const chamadoRef = doc(db, 'chamados', chamadoId);
    
    // Busca o estado atual do chamado para tomar a decisão correta
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
    
    // --- LÓGICA CORRIGIDA ---
    // Apenas define o executorId e a data se o chamado estiver sendo ASSUMIDO (vindo de 'Aberto')
    if (updates.status === 'Em Andamento' && currentData.status === 'Aberto') {
      updatedData.assumidoEm = serverTimestamp();
      updatedData.executorId = userId;
    } else if (updates.status === 'Resolvido') {
      updatedData.resolvidoEm = serverTimestamp();
    }
    // Se um chamado for RECUSADO (status atual 'Resolvido' -> novo status 'Em Andamento'),
    // a condição acima será falsa e o executorId NÃO será alterado, preservando o executor original.
    
    await updateDoc(chamadoRef, updatedData);
  } catch (error) {
    console.error('Error updating chamado:', error);
    throw error;
  }
};

export const subscribeToChamados = (filters, callback) => {
  try {
    let q = collection(db, "chamados");

    // Filtra para mostrar apenas chamados não arquivados
    q = query(q, where("arquivado", "==", false));

    if (filters.solicitanteId) {
      q = query(q, where("solicitanteId", "==", filters.solicitanteId));
    }

    // ✅ ALTERAÇÃO APLICADA AQUI
    // Se o filtro executorIdContains for passado (para o perfil Executor),
    // busca apenas os chamados onde o array 'executorIds' contém o ID do usuário.
    if (filters.executorIdContains) {
      q = query(
        q,
        where("executorIds", "array-contains", filters.executorIdContains)
      );
    }

    if (filters.status) {
      q = query(q, where("status", "==", filters.status));
    }

    q = query(q, orderBy("criadoEm", "desc"));

    return onSnapshot(q, (querySnapshot) => {
      const chamados = [];
      querySnapshot.forEach((doc) => {
        chamados.push({ id: doc.id, ...doc.data() });
      });
      callback(chamados);
    });
  } catch (error) {
    console.error("Error subscribing to chamados:", error);
    // Lembre-se que pode ser necessário criar um novo índice no Firestore.
    // O console do navegador mostrará um link para criá-lo com um clique.
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

// ✅ NOVA FUNÇÃO: Buscar usuários com acesso pendente
export const getUsuariosPendentes = async () => {
  try {
    const q = query(collection(db, 'usuarios'), where('acesso', '==', 'pendente'));
    const querySnapshot = await getDocs(q);
    const usuarios = [];
    querySnapshot.forEach((doc) => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });
    return usuarios;
  } catch (error) {
    console.error('Erro ao buscar usuários pendentes:', error);
    throw error;
  }
};

// ✅ NOVA FUNÇÃO: Atualizar o status de acesso de um usuário
export const updateUserAccessStatus = async (userId, newStatus) => {
  try {
    const userRef = doc(db, 'usuarios', userId);
    await updateDoc(userRef, {
      acesso: newStatus
    });
  } catch (error) {
    console.error('Erro ao atualizar status de acesso do usuário:', error);
    throw error;
  }
};

// ✅ NOVA FUNÇÃO: Buscar todos os usuários que podem receber um chamado
export const getAssignableUsers = async () => {
  try {
    // Busca os executores
    const executoresQuery = query(collection(db, 'usuarios'), where('perfil', '==', 'Executor'));
    // Busca os gestores
    const gestoresQuery = query(collection(db, 'usuarios'), where('perfil', '==', 'Gestor'));

    const [executoresSnapshot, gestoresSnapshot] = await Promise.all([
      getDocs(executoresQuery),
      getDocs(gestoresQuery)
    ]);

    const usuarios = [];
    executoresSnapshot.forEach((doc) => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });
    gestoresSnapshot.forEach((doc) => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });

    // Ordena por nome para a lista aparecer organizada
    return usuarios.sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    console.error('Erro ao buscar usuários para transferência:', error);
    throw error;
  }
};

// ✅ NOVA FUNÇÃO: Buscar chamados que estão arquivados
export const subscribeToArquivados = (callback) => {
  try {
    const q = query(
      collection(db, 'chamados'), 
      where('arquivado', '==', true),
      orderBy('criadoEm', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const chamados = [];
      querySnapshot.forEach((doc) => {
        chamados.push({ id: doc.id, ...doc.data() });
      });
      callback(chamados);
    });
  } catch (error) {
    console.error('Erro ao buscar chamados arquivados:', error);
    // Lembre-se de criar o índice no Firebase se o console pedir!
    throw error;
  }
};

// ✅ NOVA FUNÇÃO: Buscar TODOS os chamados para análise
export const getAllChamadosForAnalytics = async () => {
  try {
    const q = query(collection(db, 'chamados'), orderBy('criadoEm', 'desc'));
    const querySnapshot = await getDocs(q);
    const chamados = [];
    querySnapshot.forEach((doc) => {
      chamados.push({ id: doc.id, ...doc.data() });
    });
    return chamados;
  } catch (error) {
    console.error('Erro ao buscar todos os chamados:', error);
    throw error;
  }
};

// ✅ NOVA FUNÇÃO: Buscar TODOS os usuários para análise
export const getAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'usuarios'));
    const usuarios = [];
    querySnapshot.forEach((doc) => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });
    return usuarios;
  } catch (error) {
    console.error('Erro ao buscar todos os usuários:', error);
    throw error;
  }
};

// ✅ NOVA FUNÇÃO AUXILIAR: Pára o cronômetro e atualiza o tempo total
export const stopAndCalculateTime = async (chamadoId) => {
  const chamadoRef = doc(db, 'chamados', chamadoId);
  const chamadoDoc = await getDoc(chamadoRef);
  const chamadoData = chamadoDoc.data();

  // Se não houver um timer rodando, não faz nada
  if (!chamadoData.timerStartedAt) {
    return chamadoData.tempoGasto || 0;
  }

  const startTime = chamadoData.timerStartedAt.toDate();
  const endTime = new Date();
  const durationInSeconds = Math.round((endTime - startTime) / 1000);
  const newTotalTime = (chamadoData.tempoGasto || 0) + durationInSeconds;

  await updateDoc(chamadoRef, {
    // Adiciona o intervalo de trabalho ao histórico
    workIntervals: arrayUnion({
      start: startTime,
      end: endTime,
      durationInSeconds: durationInSeconds
    }),
    tempoGasto: newTotalTime, // Atualiza o total de segundos
    timerStartedAt: deleteField() // ✅ Remove o campo que marca o início do timer
  });

  return newTotalTime;
};