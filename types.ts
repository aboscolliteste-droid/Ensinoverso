
export type UserRole = 'admin' | 'professor' | 'aluno';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  ativo: boolean;
  turmas: string[]; 
}

export interface Turma {
  id: string;
  nome: string;
  ano: string;
  imagemUrl?: string;
  descricao?: string;
}

export type LessonStatus = 'rascunho' | 'publicada';

export interface Lesson {
  id: string;
  titulo: string;
  texto: string;
  escola: string;
  componenteCurricular: string;
  professorId: string;
  turmaIds: string[]; // Alterado para suportar múltiplas turmas
  status: LessonStatus;
  habilidades: string[];
  imagemUrl?: string;
  materiaisExtras?: string[];
  palavrasChave?: string[];
  createdAt: number;
}

export interface Questao {
  id: string;
  aulaId: string;
  pergunta: string;
  alternativas: [string, string, string, string];
  respostaCorreta: number;
}

export interface Resultado {
  id: string;
  alunoId: string;
  aulaId: string;
  acertos: number;
  total: number;
  detalhes?: boolean[]; // Array indicando se cada questão (pelo índice) foi acertada
  data: number;
}

export interface LessonWithQuestions extends Lesson {
  questoes: Questao[];
}
