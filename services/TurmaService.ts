
import { db } from '../firebase/config';
import { Turma } from '../types';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';

export const TurmaService = {
  listAll: async () => {
    const q = query(collection(db, "turmas"), orderBy("nome"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Turma));
  },

  create: async (data: Omit<Turma, 'id'>) => {
    const docRef = await addDoc(collection(db, "turmas"), data);
    return { ...data, id: docRef.id };
  },

  update: async (id: string, data: Partial<Omit<Turma, 'id'>>) => {
    const turmaRef = doc(db, "turmas", id);
    await setDoc(turmaRef, data, { merge: true });
  },

  delete: async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      await deleteDoc(doc(db, "turmas", id));
      // Nota: No Firebase, a remoção em cascata geralmente é tratada por Functions ou lógica de serviço adicional.
      // Para manter minimalista, focamos na remoção da entidade principal.
      return true;
    } catch (error) {
      console.error("Erro ao excluir turma no Firebase:", error);
      return false;
    }
  }
};
