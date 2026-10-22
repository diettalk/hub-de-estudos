import { type JSONContent } from '@tiptap/react';

// O tipo Node agora é mais genérico para representar qualquer item hierárquico
export type Node = {
  id: number;
  parent_id: number | null;
  title: string;
  children: Node[];
  is_favorite?: boolean;
  emoji?: string | null;
  content?: JSONContent | null;
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
  caderno_erro_id?: number | null;
  data_revisao: string;
  tipo_revisao: string;
  concluida: boolean;
  materia_nome: string | null;
  foco_sugerido: string | null;
};

export type MotivoErro = 'atencao' | 'conteudo' | 'interpretacao' | 'chute' | 'outro';

export type CadernoErro = {
  id: number;
  disciplina_id: number | null;
  disciplina_nome: string;
  assunto: string;
  banca: string | null;
  ano: number | null;
  enunciado: string | null;
  o_que_errei: string;
  motivo: MotivoErro;
  aprendizado: string;
  created_at: string;
  updated_at: string;
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

// Adicione este tipo no final do ficheiro src/lib/types.ts

export type ConfirmationDialogState = {
  isOpen: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
};
