// src/lib/types.ts
export type Disciplina = {
  id: number;
  nome: string;
  emoji: string;
};

export type Concurso = {
  id: number;
  nome: string;
  banca: string;
  data_prova: string;
  prioridades: string[] | null;
  concurso_disciplinas: { disciplinas: Disciplina | null }[];
};

export type EnrichedConcurso = Concurso & {
  linkedDisciplinaIds: number[];
};

export type SessaoEstudo = {
  id: number;
  hora_no_ciclo: number;
  foco: string;
  concluido: boolean;
  materia_finalizada: boolean;
  data_estudo: string | null;
  diario_de_bordo: string | null;
  questoes_acertos: number | null;
  questoes_total: number | null;
  data_revisao_1: string | null;
  r1_concluida: boolean;
  data_revisao_2: string | null;
  r2_concluida: boolean;
  data_revisao_3: string | null;
  r3_concluida: boolean;
  disciplinas: {
    nome: string;
    emoji: string;
  } | null;
};