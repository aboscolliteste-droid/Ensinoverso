
import { db } from '../firebase/config';
import { Lesson, Questao, Resultado } from '../types';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, query, where, orderBy, getDoc } from 'firebase/firestore';

export const LessonService = {
  listAll: async () => {
    const snapshot = await getDocs(collection(db, "lessons"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
  },
  
  getById: async (id: string) => {
    const docSnap = await getDoc(doc(db, "lessons", id));
    if (!docSnap.exists()) return null;
    
    const lesson = { id: docSnap.id, ...docSnap.data() } as Lesson;
    const q = query(collection(db, "questoes"), where("aulaId", "==", id));
    const qSnapshot = await getDocs(q);
    const questoes = qSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Questao));
    
    return { ...lesson, questoes };
  },

  listByProfessor: async (profId: string) => {
    const q = query(collection(db, "lessons"), where("professorId", "==", profId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
  },

  listForStudent: async (studentTurmaIds: string[]) => {
    const snapshot = await getDocs(collection(db, "lessons"));
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as Lesson))
      .filter(l => l.status === 'publicada' && l.turmaIds.some(tid => studentTurmaIds.includes(tid)));
  },

  saveLesson: async (lessonData: Omit<Lesson, 'id' | 'createdAt'>, questoes: (Omit<Questao, 'id' | 'aulaId'> | Questao)[], id?: string) => {
    let lessonId = id;
    const createdAt = id ? lessonData['createdAt'] || Date.now() : Date.now();
    const dataToSave = { ...lessonData, createdAt };

    if (id) {
      await setDoc(doc(db, "lessons", id), dataToSave, { merge: true });
    } else {
      const docRef = await addDoc(collection(db, "lessons"), dataToSave);
      lessonId = docRef.id;
    }

    // Salvar questões
    for (const [idx, q] of questoes.entries()) {
      const qId = (q as Questao).id || `q_${lessonId}_${idx}`;
      await setDoc(doc(db, "questoes", qId), { ...q, aulaId: lessonId, id: qId }, { merge: true });
    }
    
    return { ...dataToSave, id: lessonId } as Lesson;
  },

  deleteLessonWithCascade: async (lessonId: string): Promise<boolean> => {
    try {
      await deleteDoc(doc(db, "lessons", lessonId));
      // Cascatas manuais simplificadas
      const qSnapshot = await getDocs(query(collection(db, "questoes"), where("aulaId", "==", lessonId)));
      qSnapshot.docs.forEach(async d => await deleteDoc(doc(db, "questoes", d.id)));
      
      const rSnapshot = await getDocs(query(collection(db, "resultados"), where("aulaId", "==", lessonId)));
      rSnapshot.docs.forEach(async d => await deleteDoc(doc(db, "resultados", d.id)));
      
      return true;
    } catch (error) {
      console.error(`Erro ao excluir aula ${lessonId}:`, error);
      return false;
    }
  },

  saveResult: async (alunoId: string, aulaId: string, acertos: number, total: number, detalhes: boolean[]) => {
    const resData = {
      alunoId,
      aulaId,
      acertos,
      total,
      detalhes,
      data: Date.now()
    };
    
    const docRef = await addDoc(collection(db, "resultados"), resData);
    return { ...resData, id: docRef.id } as Resultado;
  },

  getResultsByLesson: async (aulaId: string) => {
    const q = query(collection(db, "resultados"), where("aulaId", "==", aulaId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resultado));
  },

  getResultsByStudent: async (alunoId: string) => {
    const q = query(collection(db, "resultados"), where("alunoId", "==", alunoId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resultado));
  },
};
