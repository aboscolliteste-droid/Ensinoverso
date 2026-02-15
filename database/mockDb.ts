
import { User, Turma, Lesson, Questao, Resultado } from '../types';

const DB_KEYS = {
  USERS: 'kv_users',
  TURMAS: 'kv_turmas',
  LESSONS: 'kv_lessons',
  QUESTOES: 'kv_questoes',
  RESULTADOS: 'kv_resultados',
};

const initialUsers: User[] = [
  { id: '1', nome: 'Administrador', email: 'admin@kassioverso.com', role: 'admin', ativo: true, turmas: [] },
  { id: '2', nome: 'Prof. Kassio', email: 'prof@kassioverso.com', role: 'professor', ativo: true, turmas: ['t1'] },
  { id: '3', nome: 'Aluno Teste', email: 'aluno@kassioverso.com', role: 'aluno', ativo: true, turmas: ['t1'] },
];

const initialTurmas: Turma[] = [
  { id: 't1', nome: '9º Ano A', ano: '2024', descricao: 'Turma focal de Ciências e Tecnologia.' },
];

export const mockDb = {
  init: () => {
    if (!localStorage.getItem(DB_KEYS.USERS)) localStorage.setItem(DB_KEYS.USERS, JSON.stringify(initialUsers));
    if (!localStorage.getItem(DB_KEYS.TURMAS)) localStorage.setItem(DB_KEYS.TURMAS, JSON.stringify(initialTurmas));
    if (!localStorage.getItem(DB_KEYS.LESSONS)) localStorage.setItem(DB_KEYS.LESSONS, JSON.stringify([]));
    if (!localStorage.getItem(DB_KEYS.QUESTOES)) localStorage.setItem(DB_KEYS.QUESTOES, JSON.stringify([]));
    if (!localStorage.getItem(DB_KEYS.RESULTADOS)) localStorage.setItem(DB_KEYS.RESULTADOS, JSON.stringify([]));
  },

  get: <T,>(key: string): T[] => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  },

  save: <T,>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
  },

  users: {
    all: () => mockDb.get<User>(DB_KEYS.USERS),
    save: (users: User[]) => mockDb.save(DB_KEYS.USERS, users),
  },

  turmas: {
    all: () => mockDb.get<Turma>(DB_KEYS.TURMAS),
    save: (turmas: Turma[]) => mockDb.save(DB_KEYS.TURMAS, turmas),
  },

  lessons: {
    all: () => mockDb.get<Lesson>(DB_KEYS.LESSONS),
    save: (lessons: Lesson[]) => mockDb.save(DB_KEYS.LESSONS, lessons),
  },

  questoes: {
    all: () => mockDb.get<Questao>(DB_KEYS.QUESTOES),
    save: (questoes: Questao[]) => mockDb.save(DB_KEYS.QUESTOES, questoes),
  },

  resultados: {
    all: () => mockDb.get<Resultado>(DB_KEYS.RESULTADOS),
    save: (resultados: Resultado[]) => mockDb.save(DB_KEYS.RESULTADOS, resultados),
  }
};
