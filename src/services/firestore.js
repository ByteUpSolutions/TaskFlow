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
  deleteField,
} from "firebase/firestore";
import { db } from "../lib/firebase";

// --- Funções de Chamado ---

export const createChamado = async (chamadoData) => {
  try {
    const docRef = await addDoc(collection(db, "chamados"), {
      ...chamadoData,
      status: "Aberto",
      executorIds: [],
      arquivado: false,
      tempoGasto: 0,
      timeTracking: {}, // Objeto para guardar o tempo de cada usuario
      criadoEm: serverTimestamp(),
      historico: [
        {
          autor: chamadoData.solicitanteId,
          acao: "Criado",
          timestamp: new Date(),
          detalhes: "Chamado criado",
        },
      ],
    });
    return docRef.id;
  } catch (error) {
    console.error("Error creating chamado:", error);
    throw error;
  }
};

// ✅ FUNÇÃO ATUALIZADA: Simplificada para focar em status e histórico
export const updateChamado = async (chamadoId, updates, userId, acao) => {
  try {
    const chamadoRef = doc(db, "chamados", chamadoId);

    const newHistoryEntry = {
      autor: userId,
      acao: acao,
      timestamp: new Date(),
    };

    const updatedData = {
      ...updates,
      historico: arrayUnion(newHistoryEntry), // Usa arrayUnion para mais segurança
    };

    // Apenas adiciona o timestamp de resolução se o status estiver sendo mudado para 'Resolvido'
    if (updates.status === "Resolvido") {
      const chamadoDoc = await getDoc(chamadoRef);
      if (chamadoDoc.exists() && chamadoDoc.data().status !== "Resolvido") {
        updatedData.resolvidoEm = serverTimestamp();
      }
    }

    await updateDoc(chamadoRef, updatedData);
  } catch (error) {
    console.error("Error updating chamado:", error);
    throw error;
  }
};

export const subscribeToChamados = (filters, callback) => {
  try {
    let q = collection(db, "chamados");

    q = query(q, where("arquivado", "==", false));

    if (filters.executorIdContains) {
      q = query(
        q,
        where("executorIds", "array-contains", filters.executorIdContains)
      );
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
    throw error;
  }
};

export const subscribeToArquivados = (callback) => {
  try {
    const q = query(
      collection(db, "chamados"),
      where("arquivado", "==", true),
      orderBy("criadoEm", "desc")
    );

    return onSnapshot(q, (querySnapshot) => {
      const chamados = [];
      querySnapshot.forEach((doc) => {
        chamados.push({ id: doc.id, ...doc.data() });
      });
      callback(chamados);
    });
  } catch (error) {
    console.error("Erro ao buscar chamados arquivados:", error);
    throw error;
  }
};

export const addComentario = async (chamadoId, comentarioData) => {
  try {
    const chamadoRef = doc(db, "chamados", chamadoId);
    await updateDoc(chamadoRef, {
      comentarios: arrayUnion(comentarioData),
    });
  } catch (error) {
    console.error("Erro ao adicionar comentário:", error);
    throw error;
  }
};

// --- Funções de Contagem de Tempo Individual ---

export const startUserTimer = async (chamadoId, userId) => {
  const chamadoRef = doc(db, "chamados", chamadoId);
  await updateDoc(chamadoRef, {
    [`timeTracking.${userId}.status`]: "tracking",
    [`timeTracking.${userId}.lastStart`]: serverTimestamp(),
  });
};

export const stopUserTimer = async (chamadoId, userId) => {
  const chamadoRef = doc(db, "chamados", chamadoId);
  const chamadoDoc = await getDoc(chamadoRef);
  const chamadoData = chamadoDoc.data();

  const userTimeData = chamadoData.timeTracking?.[userId];

  if (!userTimeData || !userTimeData.lastStart) {
    return;
  }

  const startTime = userTimeData.lastStart.toDate();
  const endTime = new Date();
  const durationInSeconds = Math.round((endTime - startTime) / 1000);

  const currentTotalSeconds = userTimeData.totalSeconds || 0;
  const newTotalSeconds = currentTotalSeconds + durationInSeconds;

  const newProjectTotalTime = (chamadoData.tempoGasto || 0) + durationInSeconds;

  await updateDoc(chamadoRef, {
    [`timeTracking.${userId}.totalSeconds`]: newTotalSeconds,
    [`timeTracking.${userId}.status`]: "paused",
    [`timeTracking.${userId}.intervals`]: arrayUnion({
      start: startTime,
      end: endTime,
      duration: durationInSeconds,
    }),
    [`timeTracking.${userId}.lastStart`]: deleteField(),
    tempoGasto: newProjectTotalTime,
  });
};

// --- Funções de Usuário ---

export const getUsuario = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "usuarios", userId));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting usuario:", error);
    throw error;
  }
};

export const getUsuariosPendentes = async () => {
  try {
    const q = query(
      collection(db, "usuarios"),
      where("acesso", "==", "pendente")
    );
    const querySnapshot = await getDocs(q);
    const usuarios = [];
    querySnapshot.forEach((doc) => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });
    return usuarios;
  } catch (error) {
    console.error("Erro ao buscar usuários pendentes:", error);
    throw error;
  }
};

export const updateUserAccessStatus = async (userId, newStatus) => {
  try {
    const userRef = doc(db, "usuarios", userId);
    await updateDoc(userRef, {
      acesso: newStatus,
    });
  } catch (error) {
    console.error("Erro ao atualizar status de acesso do usuário:", error);
    throw error;
  }
};

export const getAssignableUsers = async () => {
  try {
    const executoresQuery = query(
      collection(db, "usuarios"),
      where("perfil", "==", "Executor")
    );
    const gestoresQuery = query(
      collection(db, "usuarios"),
      where("perfil", "==", "Gestor")
    );

    const [executoresSnapshot, gestoresSnapshot] = await Promise.all([
      getDocs(executoresQuery),
      getDocs(gestoresQuery),
    ]);

    const usuarios = [];
    executoresSnapshot.forEach((doc) => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });
    gestoresSnapshot.forEach((doc) => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });

    return usuarios.sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    console.error("Erro ao buscar usuários para transferência:", error);
    throw error;
  }
};

// --- Funções para Analytics ---

export const getAllChamadosForAnalytics = async () => {
  try {
    const q = query(collection(db, "chamados"), orderBy("criadoEm", "desc"));
    const querySnapshot = await getDocs(q);
    const chamados = [];
    querySnapshot.forEach((doc) => {
      chamados.push({ id: doc.id, ...doc.data() });
    });
    return chamados;
  } catch (error) {
    console.error("Erro ao buscar todos os chamados:", error);
    throw error;
  }
};

export const getAllUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "usuarios"));
    const usuarios = [];
    querySnapshot.forEach((doc) => {
      usuarios.push({ id: doc.id, ...doc.data() });
    });
    return usuarios;
  } catch (error) {
    console.error("Erro ao buscar todos os usuários:", error);
    throw error;
  }
};
