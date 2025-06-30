// src/lib/types.ts

export type Disciplina = {
  id: number;
  nome: string;
  emoji: string;
};

export type SessaoEstudo = {
  id: number;
  hora_no_ciclo: number;
  foco: string | null;
  diario_de_bordo: string | null;
  questoes_acertos: number | null;
  questoes_total: number | null;
  data_estudo: string | null;
  data_revisao_1: string | null;
  r1_concluida: boolean;
  data_revisao_2: string | null;
  r2_concluida: boolean;
  data_revisao_3: string | null;
  r3_concluida: boolean;
  concluido: boolean;
  materia_finalizada: boolean;
  disciplina_id: number | null;
  disciplina?: Disciplina | null; // Opcional, para o JOIN
};