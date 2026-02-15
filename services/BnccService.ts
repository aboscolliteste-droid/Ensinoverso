import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc } from 'firebase/firestore';

export interface BnccSkill {
  code: string;
  description: string;
  component: string;
  year: string;
}

export const BnccService = {
  /**
   * Busca todas as habilidades BNCC agrupadas por componente curricular.
   */
  getAll: async (): Promise<Record<string, BnccSkill[]>> => {
    try {
      const snapshot = await getDocs(collection(db, "bncc"));
      const data: Record<string, BnccSkill[]> = {};
      snapshot.forEach(doc => {
        data[doc.id] = doc.data().skills as BnccSkill[];
      });
      return data;
    } catch (error) {
      console.error("Erro ao buscar BNCC do Firebase:", error);
      return {};
    }
  },

  /**
   * Salva as habilidades de um componente específico no Firestore.
   */
  saveComponent: async (component: string, skills: BnccSkill[]) => {
    try {
      // Normaliza o nome do componente para usar como ID do documento
      const docId = component.trim().replace(/\//g, '-');
      await setDoc(doc(db, "bncc", docId), { skills });
    } catch (error) {
      console.error(`Erro ao salvar componente ${component} no Firebase:`, error);
      throw error;
    }
  }
};