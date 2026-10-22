import { type MotivoErro } from '@/lib/types';

export const MOTIVOS_ERRO: { value: MotivoErro; label: string }[] = [
  { value: 'atencao', label: 'Falta de atenção' },
  { value: 'conteudo', label: 'Não sabia o conteúdo' },
  { value: 'interpretacao', label: 'Erro de interpretação' },
  { value: 'chute', label: 'Chute' },
  { value: 'outro', label: 'Outro' },
];

export const LIMITES_ERRO = {
  disciplina_nome: 200,
  assunto: 200,
  banca: 100,
  enunciado: 2000,
  o_que_errei: 2000,
  aprendizado: 2000,
} as const;
