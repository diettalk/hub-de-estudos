// src/lib/types.ts

// Define a estrutura para as suas Disciplinas/Páginas
export type Disciplina = {
  id: number;
  nome: string;
  emoji?: string;
};

// Define a estrutura completa para cada linha do seu Ciclo de Estudos
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
};

// Define a estrutura para os eventos de revisão que serão gerados
// Esta é a nossa ÚNICA fonte da verdade para o que é uma revisão.
export type EventoRevisao = {
  id: number;
  sessao_id: number; // ID da sessão de estudo original
  title: string;
  type: '24h' | '7 dias' | '30 dias'; // Tipos corretos
  completed: boolean;
  color: string;
  data: string; // Data no formato ISO (ex: "2025-07-01T...")
};