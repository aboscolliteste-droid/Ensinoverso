
import { db } from '../firebase/config';
import { User } from '../types';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, addDoc, query, orderBy } from 'firebase/firestore';

export const UserService = {
  listAll: async () => {
    const q = query(collection(db, "users"), orderBy("nome"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  },

  // Usado pelo Admin para criar/editar usuários
  save: async (data: Omit<User, 'id'>, id?: string) => {
    if (id) {
      const userRef = doc(db, "users", id);
      await setDoc(userRef, data, { merge: true });
      return { ...data, id } as User;
    } else {
      // Nota: Para criação via admin, idealmente usaria Firebase Admin SDK ou 
      // o usuário teria que se cadastrar sozinho para gerar o Auth ID.
      // Aqui usamos addDoc apenas como fallback para documentos sem Auth vinculado.
      const docRef = await addDoc(collection(db, "users"), data);
      return { ...data, id: docRef.id } as User;
    }
  },

  delete: async (id: string) => {
    await deleteDoc(doc(db, "users", id));
  },

  updateStatus: async (userId: string, ativo: boolean) => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { ativo });
  }
};
