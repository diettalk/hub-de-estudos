import { type JSONContent } from '@tiptap/react';

// O tipo Node agora é mais genérico para representar qualquer item hierárquico
export type Node = {
  id: number;
  parent_id: number | null;
  title: string;
  children: Node[];
  // Campos opcionais de Disciplinas/Documentos
  emoji?: string | null;
  content?: JSONContent | null;
  // Campos opcionais de Recursos
  type?: 'link' | 'pdf' | 'folder';
  url?: string | null;
  file_path?: string | null;
  description?: string | null;
};

// O tipo Disciplina agora estende o Node para maior consistência
export type Disciplina = Node;

export type SessaoEstudo = {
  id: number;
  ordem: number;
  disciplina_id: number | null;
  materia_nome: string | null;
  foco_sugerido: string | null;
  diario_de_bordo: string | null;
  questoes_acertos: number | null;
  questoes_total: number | null;
  concluida: boolean;
  data_estudo: string | null;
  data_revisao_1: string | null;
  data_revisao_2: string | null;
  data_revisao_3: string | null;
  materia_finalizada: boolean;
  disciplinas?: { nome: string, emoji: string | null } | null;
};

export type Revisao = {
  id: number;
  ciclo_sessao_id: number | null;
  data_revisao: string;
  tipo_revisao: string;
  concluida: boolean;
  materia_nome: string | null;
  foco_sugerido: string | null;
};

export type Tarefa = {
  id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  created_at: string;
  status?: 'pendente' | 'concluida' | 'arquivada';
};

export type Anotacao = {
  id: number;
  content: string | null;
  created_at: string;
};

export type Lembrete = {
  id: number;
  titulo: string;
  data: string;
  cor: string | null;
};

export type Concurso = {
  id: number;
  nome: string;
  banca: string | null;
  data_prova: string | null;
  status: 'ativo' | 'previsto' | 'arquivado';
  edital_url: string | null;
  prioridades: string[] | null;
  concurso_paginas: { paginas: Disciplina | null }[]; 
};

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

// NOVO TIPO: Define a estrutura de um Recurso da Biblioteca
export type Resource = Node; // Um Recurso é um tipo de Nó

// Adicione este tipo no final do ficheiro src/lib/types.ts

export type ConfirmationDialogState = {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
};
