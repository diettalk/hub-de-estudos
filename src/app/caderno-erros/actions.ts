'use server';

import { addDays, format, parseISO } from 'date-fns';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { LIMITES_ERRO, MOTIVOS_ERRO } from '@/lib/caderno-erros';
import { type MotivoErro } from '@/lib/types';

type DadosCadernoErro = {
  disciplina_id: number | null;
  disciplina_nome: string;
  assunto: string;
  banca: string | null;
  ano: number | null;
  enunciado: string | null;
  o_que_errei: string;
  motivo: MotivoErro;
  aprendizado: string;
};

function parseCadernoErroForm(formData: FormData): { data: DadosCadernoErro } | { error: string } {
  const getString = (name: string) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };

  const disciplinaNome = getString('disciplina_nome');
  const assunto = getString('assunto');
  const banca = getString('banca');
  const anoValue = getString('ano');
  const enunciado = getString('enunciado');
  const oQueErrei = getString('o_que_errei');
  const motivoOption = MOTIVOS_ERRO.find(({ value }) => value === getString('motivo'));
  const aprendizado = getString('aprendizado');
  const disciplinaIdValue = getString('disciplina_id');

  if (!disciplinaNome || !assunto || !oQueErrei || !aprendizado) {
    return { error: 'Preencha os campos obrigatórios.' };
  }

  if (
    disciplinaNome.length > LIMITES_ERRO.disciplina_nome ||
    assunto.length > LIMITES_ERRO.assunto ||
    banca.length > LIMITES_ERRO.banca ||
    enunciado.length > LIMITES_ERRO.enunciado ||
    oQueErrei.length > LIMITES_ERRO.o_que_errei ||
    aprendizado.length > LIMITES_ERRO.aprendizado
  ) {
    return { error: 'Um ou mais campos excedem o limite de caracteres.' };
  }

  const ano = anoValue === '' ? null : Number(anoValue);
  if (ano !== null && (!Number.isInteger(ano) || ano < 1990 || ano > 2100)) {
    return { error: 'Ano inválido. Informe um ano entre 1990 e 2100.' };
  }

  if (!motivoOption) {
    return { error: 'Motivo inválido.' };
  }

  const disciplinaId = disciplinaIdValue === '' ? null : Number(disciplinaIdValue);
  if (disciplinaId !== null && (!Number.isInteger(disciplinaId) || disciplinaId <= 0)) {
    return { error: 'Disciplina inválida.' };
  }

  return {
    data: {
      disciplina_id: disciplinaId,
      disciplina_nome: disciplinaNome,
      assunto,
      banca: banca || null,
      ano,
      enunciado: enunciado || null,
      o_que_errei: oQueErrei,
      motivo: motivoOption.value,
      aprendizado,
    },
  };
}

async function validarDisciplina(
  data: DadosCadernoErro,
  userId: string,
): Promise<{ data: DadosCadernoErro } | { error: string }> {
  if (data.disciplina_id === null) return { data };

  const supabase = await createClient();
  const { data: disciplina, error } = await supabase
    .from('paginas')
    .select('id, title')
    .eq('id', data.disciplina_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Erro ao validar disciplina do Caderno de Erros:', error);
    return { error: 'Não foi possível validar a disciplina.' };
  }
  if (!disciplina) return { error: 'Disciplina inválida.' };

  return {
    data: {
      ...data,
      disciplina_nome: String(disciplina.title).slice(0, LIMITES_ERRO.disciplina_nome),
    },
  };
}

function revalidateCadernoErros() {
  revalidatePath('/caderno-erros');
  revalidatePath('/revisoes');
  revalidatePath('/');
}

function reviewDates() {
  const hoje = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
  }).format(new Date());

  return [
    { days: 1, tipo_revisao: '24h' },
    { days: 7, tipo_revisao: '7 dias' },
    { days: 30, tipo_revisao: '30 dias' },
  ].map(({ days, tipo_revisao }) => ({
    data_revisao: format(addDays(parseISO(hoje), days), 'yyyy-MM-dd'),
    tipo_revisao,
  }));
}

export async function createCadernoErro(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) console.error('Erro ao autenticar criação no Caderno de Erros:', authError);
  if (!user) return { error: 'Usuário não autenticado.' };

  const parsed = parseCadernoErroForm(formData);
  if ('error' in parsed) return parsed;

  const validated = await validarDisciplina(parsed.data, user.id);
  if ('error' in validated) return validated;

  const { data: erro, error: insertError } = await supabase
    .from('caderno_erros')
    .insert({ ...validated.data, user_id: user.id })
    .select('id')
    .single();

  if (insertError || !erro) {
    console.error('Erro ao criar registro no Caderno de Erros:', insertError);
    return { error: 'Não foi possível salvar o erro.' };
  }

  const revisoes = reviewDates().map(({ data_revisao, tipo_revisao }) => ({
    user_id: user.id,
    caderno_erro_id: erro.id,
    ciclo_sessao_id: null,
    data_revisao,
    tipo_revisao,
    concluida: false,
    materia_nome: validated.data.disciplina_nome,
    foco_sugerido: `Caderno de Erros: ${validated.data.assunto}`,
  }));

  const { error: revisoesError } = await supabase.from('revisoes').insert(revisoes);
  if (revisoesError) {
    console.error('Erro ao criar revisões do Caderno de Erros:', revisoesError);
    const { error: cleanupError } = await supabase
      .from('caderno_erros')
      .delete()
      .eq('id', erro.id)
      .eq('user_id', user.id);
    if (cleanupError) console.error('Erro ao remover registro após falha nas revisões:', cleanupError);
    return { error: 'Não foi possível criar as revisões do erro.' };
  }

  revalidateCadernoErros();
  return { success: true };
}

export async function updateCadernoErro(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) console.error('Erro ao autenticar atualização no Caderno de Erros:', authError);
  if (!user) return { error: 'Usuário não autenticado.' };

  const idValue = formData.get('id');
  const id = typeof idValue === 'string' ? Number(idValue.trim()) : NaN;
  if (!Number.isInteger(id) || id <= 0) return { error: 'Erro inválido.' };

  const parsed = parseCadernoErroForm(formData);
  if ('error' in parsed) return parsed;

  const validated = await validarDisciplina(parsed.data, user.id);
  if ('error' in validated) return validated;

  const { data: erro, error: updateError } = await supabase
    .from('caderno_erros')
    .update({ ...validated.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (updateError) {
    console.error('Erro ao atualizar registro no Caderno de Erros:', updateError);
    return { error: 'Não foi possível atualizar o erro.' };
  }
  if (!erro) return { error: 'Erro não encontrado.' };

  const { error: revisoesError } = await supabase
    .from('revisoes')
    .update({
      materia_nome: validated.data.disciplina_nome,
      foco_sugerido: `Caderno de Erros: ${validated.data.assunto}`,
    })
    .eq('caderno_erro_id', id)
    .eq('user_id', user.id)
    .eq('concluida', false);

  if (revisoesError) {
    console.error('Erro ao atualizar revisões do Caderno de Erros:', revisoesError);
    return { error: 'Não foi possível atualizar as revisões do erro.' };
  }

  revalidateCadernoErros();
  return { success: true };
}

export async function deleteCadernoErro(id: number): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError) console.error('Erro ao autenticar exclusão no Caderno de Erros:', authError);
  if (!user) return { error: 'Usuário não autenticado.' };
  if (!Number.isInteger(id) || id <= 0) return { error: 'Erro inválido.' };

  const { error: revisoesError } = await supabase
    .from('revisoes')
    .delete()
    .eq('caderno_erro_id', id)
    .eq('user_id', user.id);
  if (revisoesError) {
    console.error('Erro ao excluir revisões do Caderno de Erros:', revisoesError);
    return { error: 'Não foi possível excluir as revisões do erro.' };
  }

  const { error: deleteError } = await supabase
    .from('caderno_erros')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (deleteError) {
    console.error('Erro ao excluir registro do Caderno de Erros:', deleteError);
    return { error: 'Não foi possível excluir o erro.' };
  }

  revalidateCadernoErros();
  return { success: true };
}
