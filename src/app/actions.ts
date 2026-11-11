'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { add } from 'date-fns';
import { type SessaoEstudo } from '@/lib/types';
import { JSONContent } from '@tiptap/react';

type Flashcard = {
  question: string;
  answer: string;
};

async function getAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function isOwnedParent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'paginas',
  parentId: number | null,
  userId: string
): Promise<boolean> {
  if (parentId === null) return true;
  if (!Number.isInteger(parentId)) return false;
  const { data } = await supabase
    .from(table)
    .select('id')
    .eq('id', parentId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

// --- AÇÕES DE CONCURSOS / PLANOS ---
export async function addConcurso(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };

  const nome = ((formData.get('nome') as string) || '').trim();
  const banca = ((formData.get('banca') as string) || '').trim();
  const dataProva = ((formData.get('data_prova') as string) || '').trim();
  const status = ((formData.get('status') as string) || 'ativo').trim();
  const edital_url = ((formData.get('edital_url') as string) || '').trim();
  const prioridadesRaw = (formData.get('prioridades') as string) || '';
  const prioridades = prioridadesRaw
    ? prioridadesRaw
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  if (!nome || !status) {
    return { error: 'Informe pelo menos o nome e o status do plano.' };
  }

  const { error } = await supabase.from('concursos').insert({
    nome,
    banca: banca || null,
    data_prova: dataProva || null,
    status,
    edital_url: edital_url || null,
    prioridades,
    user_id: user.id,
  });

  if (error) {
    console.error('Erro ao adicionar concurso:', error);
    return { error: 'Não foi possível adicionar o plano.' };
  }

  revalidatePath('/guia-estudos');
  revalidatePath('/');
  return { success: true };
}

export async function updateConcurso(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };

  const id = Number(formData.get('id'));
  const nome = ((formData.get('nome') as string) || '').trim();
  const banca = ((formData.get('banca') as string) || '').trim();
  const dataProva = ((formData.get('data_prova') as string) || '').trim();
  const status = ((formData.get('status') as string) || 'ativo').trim();
  const edital_url = ((formData.get('edital_url') as string) || '').trim();
  const prioridadesRaw = (formData.get('prioridades') as string) || '';
  const prioridades = prioridadesRaw
    ? prioridadesRaw
        .split('\n')
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
    : [];

  if (!id || !nome || !status) {
    return { error: 'Preencha o nome e o status do plano.' };
  }

  const { error } = await supabase
    .from('concursos')
    .update({
      nome,
      banca: banca || null,
      data_prova: dataProva || null,
      status,
      edital_url: edital_url || null,
      prioridades,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Erro ao atualizar concurso:', error);
    return { error: 'Não foi possível atualizar o plano.' };
  }

  revalidatePath('/guia-estudos');
  revalidatePath('/');
  return { success: true };
}

export async function updateConcursoStatus(
  id: number,
  status: 'ativo' | 'previsto' | 'arquivado'
) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  await supabase
    .from('concursos')
    .update({ status })
    .eq('id', id)
    .eq('user_id', user.id);
  revalidatePath('/guia-estudos');
  revalidatePath('/');
}

export async function deleteConcurso(id: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  await supabase.from('concursos').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/guia-estudos');
  revalidatePath('/');
}

// --- AÇÕES DE DISCIPLINAS E SUBTÓPICOS ---
export async function createPagina(
  parentId: number | null,
  title: string,
  emoji: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };
  if (!(await isOwnedParent(supabase, 'paginas', parentId, user.id))) {
    return { error: 'Pasta de destino inválida.' };
  }

  const { data, error } = await supabase
    .from('paginas')
    .insert({
      title,
      emoji,
      parent_id: parentId,
      user_id: user.id,
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
    })
    .select()
    .single();

  if (error) return { error: error.message };

  revalidatePath('/disciplinas');
  revalidatePath('/guia-estudos');
  return { data };
}

export async function updatePaginaContent(id: number, content: string) {
  if (isNaN(id)) return { error: 'ID da página inválido.' };

  let parsedContent: JSONContent;
  try {
    parsedContent = JSON.parse(content);
  } catch {
    return { error: 'Conteúdo inválido.' };
  }

  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { error } = await supabase
    .from('paginas')
    .update({ content: parsedContent })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Erro ao salvar conteúdo da página:', error);
    return { error: error.message };
  }

  return { success: true };
}

export async function deletePagina(id: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  await supabase.from('paginas').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/disciplinas');
  revalidatePath('/guia-estudos');
}

// --- AÇÕES DE VÍNCULO PLANO <-> DISCIPLINA ---
export async function linkPastaToConcurso(concursoId: number, paginaId: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  const [{ data: concurso }, { data: pagina }] = await Promise.all([
    supabase
      .from('concursos')
      .select('id')
      .eq('id', concursoId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('paginas')
      .select('id')
      .eq('id', paginaId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);
  if (!concurso || !pagina) return;

  const { data: existingLink } = await supabase
    .from('concurso_paginas')
    .select()
    .match({ concurso_id: concursoId, pagina_id: paginaId })
    .maybeSingle();

  if (existingLink) return;

  await supabase
    .from('concurso_paginas')
    .insert({ concurso_id: concursoId, pagina_id: paginaId });
  revalidatePath('/guia-estudos');
  revalidatePath('/');
}

export async function unlinkPastaFromConcurso(
  concursoId: number,
  paginaId: number
) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  const [{ data: concurso }, { data: pagina }] = await Promise.all([
    supabase
      .from('concursos')
      .select('id')
      .eq('id', concursoId)
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase
      .from('paginas')
      .select('id')
      .eq('id', paginaId)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);
  if (!concurso || !pagina) return;
  await supabase
    .from('concurso_paginas')
    .delete()
    .match({ concurso_id: concursoId, pagina_id: paginaId });
  revalidatePath('/guia-estudos');
  revalidatePath('/');
}

// --- AÇÕES DO CICLO / PLANEJAMENTO ---
export async function updateSessaoEstudo(
  sessaoData: Partial<SessaoEstudo> & { id: number }
) {
  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };
  const { id, ...data } = sessaoData;
  if (!id) return { error: 'ID da sessão é necessário para atualização.' };

  const updateData = {
    disciplina_id: data.disciplina_id,
    materia_nome: data.materia_nome,
    foco_sugerido: data.foco_sugerido,
    diario_de_bordo: data.diario_de_bordo,
    questoes_acertos: data.questoes_acertos,
    questoes_total: data.questoes_total,
    materia_finalizada: data.materia_finalizada,
  };

  const { error } = await supabase
    .from('ciclo_sessoes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    console.error('Erro no auto-save da sessão:', error);
    return { error: 'Falha ao salvar alterações da sessão.' };
  }
  revalidatePath('/ciclo');
  revalidatePath('/historico');
  revalidatePath('/estatisticas');
  revalidatePath('/');
}

export async function updateDatasSessaoEstudo(
  sessaoId: number,
  campoAlterado:
    | 'data_estudo'
    | 'data_revisao_1'
    | 'data_revisao_2'
    | 'data_revisao_3',
  novaData: string
) {
  if (!novaData) return { error: 'Data inválida.' };

  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };
  const dataFormatada = new Date(novaData + 'T03:00:00');

  try {
    if (campoAlterado === 'data_estudo') {
      const rev1 = add(dataFormatada, { days: 1 });
      const rev7 = add(dataFormatada, { days: 7 });
      const rev30 = add(dataFormatada, { days: 30 });

      await supabase
        .from('ciclo_sessoes')
        .update({
          data_estudo: dataFormatada.toISOString(),
          data_revisao_1: rev1.toISOString(),
          data_revisao_2: rev7.toISOString(),
          data_revisao_3: rev30.toISOString(),
        })
        .eq('id', sessaoId)
        .eq('user_id', user.id);

      await Promise.all([
        supabase
          .from('revisoes')
          .update({ data_revisao: rev1.toISOString().split('T')[0] })
          .match({
            ciclo_sessao_id: sessaoId,
            tipo_revisao: '24h',
            user_id: user.id,
          }),
        supabase
          .from('revisoes')
          .update({ data_revisao: rev7.toISOString().split('T')[0] })
          .match({
            ciclo_sessao_id: sessaoId,
            tipo_revisao: '7 dias',
            user_id: user.id,
          }),
        supabase
          .from('revisoes')
          .update({ data_revisao: rev30.toISOString().split('T')[0] })
          .match({
            ciclo_sessao_id: sessaoId,
            tipo_revisao: '30 dias',
            user_id: user.id,
          }),
      ]);
    } else {
      const mapaRevisao = {
        data_revisao_1: { tipo: '24h', campoDB: 'data_revisao_1' },
        data_revisao_2: { tipo: '7 dias', campoDB: 'data_revisao_2' },
        data_revisao_3: { tipo: '30 dias', campoDB: 'data_revisao_3' },
      };
      const infoRevisao = mapaRevisao[campoAlterado];

      await supabase
        .from('ciclo_sessoes')
        .update({
          [infoRevisao.campoDB]: dataFormatada.toISOString(),
        })
        .eq('id', sessaoId)
        .eq('user_id', user.id);

      await supabase
        .from('revisoes')
        .update({
          data_revisao: dataFormatada.toISOString().split('T')[0],
        })
        .match({
          ciclo_sessao_id: sessaoId,
          tipo_revisao: infoRevisao.tipo,
          user_id: user.id,
        });
    }

    revalidatePath('/ciclo');
    revalidatePath('/revisoes');
    revalidatePath('/calendario');
    revalidatePath('/historico');
    revalidatePath('/estatisticas');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao atualizar datas:', errorMessage);
    return { error: errorMessage };
  }
}

export async function toggleConclusaoSessao(
  sessaoId: number,
  isCompleting: boolean
) {
  const { supabase, user } = await getAuth();

  if (!user) return { error: 'Usuário não autenticado.' };
  if (isNaN(sessaoId)) return { error: 'Ação inválida.' };

  try {
    if (isCompleting) {
      const studyDate = new Date();
      const { data: sessao, error: sessaoError } = await supabase
        .from('ciclo_sessoes')
        .select('disciplina_id, foco_sugerido, materia_nome')
        .eq('id', sessaoId)
        .eq('user_id', user.id)
        .single();
      if (sessaoError)
        throw new Error(`Falha ao buscar sessão: ${sessaoError.message}`);
      if (!sessao) throw new Error('Sessão de estudo não encontrada.');

      const rev1 = add(studyDate, { days: 1 });
      const rev7 = add(studyDate, { days: 7 });
      const rev30 = add(studyDate, { days: 30 });

      await supabase
        .from('ciclo_sessoes')
        .update({
          concluida: true,
          data_estudo: studyDate.toISOString(),
          data_revisao_1: rev1.toISOString(),
          data_revisao_2: rev7.toISOString(),
          data_revisao_3: rev30.toISOString(),
        })
        .eq('id', sessaoId)
        .eq('user_id', user.id);

      await supabase
        .from('revisoes')
        .delete()
        .eq('ciclo_sessao_id', sessaoId)
        .eq('user_id', user.id);

      const revisoesParaInserir = [
        {
          ciclo_sessao_id: sessaoId,
          user_id: user.id,
          data_revisao: rev1.toISOString().split('T')[0],
          tipo_revisao: '24h',
          concluida: false,
          materia_nome: sessao.materia_nome,
          foco_sugerido: sessao.foco_sugerido,
        },
        {
          ciclo_sessao_id: sessaoId,
          user_id: user.id,
          data_revisao: rev7.toISOString().split('T')[0],
          tipo_revisao: '7 dias',
          concluida: false,
          materia_nome: sessao.materia_nome,
          foco_sugerido: sessao.foco_sugerido,
        },
        {
          ciclo_sessao_id: sessaoId,
          user_id: user.id,
          data_revisao: rev30.toISOString().split('T')[0],
          tipo_revisao: '30 dias',
          concluida: false,
          materia_nome: sessao.materia_nome,
          foco_sugerido: sessao.foco_sugerido,
        },
      ];

      const { error: insertError } = await supabase
        .from('revisoes')
        .insert(revisoesParaInserir);
      if (insertError)
        throw new Error(`Falha ao inserir novas revisões: ${insertError.message}`);
    } else {
      await supabase
        .from('ciclo_sessoes')
        .update({
          concluida: false,
          data_estudo: null,
          data_revisao_1: null,
          data_revisao_2: null,
          data_revisao_3: null,
        })
        .eq('id', sessaoId)
        .eq('user_id', user.id);
      await supabase
        .from('revisoes')
        .delete()
        .eq('ciclo_sessao_id', sessaoId)
        .eq('user_id', user.id);
    }

    revalidatePath('/ciclo');
    revalidatePath('/revisoes');
    revalidatePath('/calendario');
    revalidatePath('/historico');
    revalidatePath('/estatisticas');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    console.error('[toggleConclusaoSessao] Erro Capturado:', errorMessage);
    return { error: errorMessage };
  }
}

export async function toggleFinalizarSessao(id: number, finalizada: boolean) {
  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { error } = await supabase
    .from('ciclo_sessoes')
    .update({ materia_finalizada: finalizada })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Erro ao atualizar finalização da sessão:', error);
    return { error: 'Falha ao atualizar a sessão.' };
  }

  revalidatePath('/ciclo');
  return { success: true };
}

export async function seedFase1Ciclo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { count } = await supabase
    .from('ciclo_sessoes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if (count && count > 0) return { message: 'O ciclo já possui dados.' };

  const fase1Template = [
    {
      ordem: 1,
      materia_nome: 'LP',
      foco_sugerido:
        '1.1 Interpretação de Textos: Análise de textos complexos (jornalísticos).',
    },
  ];
  const sessoesParaInserir = fase1Template.map((sessao) => ({
    ...sessao,
    user_id: user.id,
  }));
  await supabase.from('ciclo_sessoes').insert(sessoesParaInserir);
  revalidatePath('/ciclo');
}

export async function addSessaoCiclo() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: ultimaSessao } = await supabase
    .from('ciclo_sessoes')
    .select('ordem')
    .eq('user_id', user.id)
    .order('ordem', { ascending: false })
    .limit(1)
    .single();
  const proximaOrdem = (ultimaSessao?.ordem || 0) + 1;
  await supabase
    .from('ciclo_sessoes')
    .insert({ ordem: proximaOrdem, user_id: user.id });
  revalidatePath('/ciclo');
}

export async function deleteSessaoCiclo(id: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  if (isNaN(id)) return;
  await supabase
    .from('ciclo_sessoes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  revalidatePath('/ciclo');
  revalidatePath('/historico');
  revalidatePath('/estatisticas');
  revalidatePath('/simulados');
  revalidatePath('/');
}

export async function deleteSessoesEmMassa(ids: number[]) {
  if (!ids || ids.length === 0) {
    return { error: 'Nenhum ID fornecido para exclusão.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  try {
    const { error } = await supabase
      .from('ciclo_sessoes')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/ciclo');
    revalidatePath('/historico');
    revalidatePath('/estatisticas');
    revalidatePath('/simulados');
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Falha ao excluir sessoes em massa:', message);
    return { error: message };
  }
}

// --- AÇÕES DO CALENDÁRIO ---
export async function addLembrete(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };
  const titulo = formData.get('titulo') as string;
  const data = formData.get('data') as string;
  const cor = formData.get('cor') as string;
  if (!titulo || !data)
    return { error: 'Preencha o título e a data do lembrete.' };
  const { error } = await supabase
    .from('lembretes')
    .insert({ titulo, data, cor, user_id: user.id });
  if (error) {
    console.error('Erro ao adicionar lembrete:', error);
    return { error: 'Não foi possível adicionar o lembrete.' };
  }
  revalidatePath('/calendario');
  revalidatePath('/');
  return { success: true };
}

export async function updateLembrete(
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };
  const id = Number(formData.get('id'));
  const titulo = formData.get('titulo') as string;
  const cor = formData.get('cor') as string;
  if (!id || !titulo)
    return { error: 'Informe um título e um lembrete válido.' };
  const { error } = await supabase
    .from('lembretes')
    .update({ titulo, cor })
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) {
    console.error('Erro ao atualizar lembrete:', error);
    return { error: 'Não foi possível atualizar o lembrete.' };
  }
  revalidatePath('/calendario');
  revalidatePath('/');
  return { success: true };
}

export async function deleteLembrete(id: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  if (isNaN(id)) return;
  await supabase.from('lembretes').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/calendario');
  revalidatePath('/');
}

export async function updateRevisaoStatus(revisaoId: number, status: boolean) {
  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };
  const { error } = await supabase
    .from('revisoes')
    .update({ concluida: status })
    .eq('id', revisaoId)
    .eq('user_id', user.id);
  if (error) return { error: error.message };
  revalidatePath('/revisoes');
  revalidatePath('/calendario');
  revalidatePath('/');
  return { success: true };
}

type TableName = 'paginas';

export async function createItem(table: TableName, parentId: number | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };
  if (!(await isOwnedParent(supabase, table, parentId, user.id))) {
    return { error: 'Pasta de destino inválida.' };
  }

  const newItemData = {
    title: 'Novo Item',
    user_id: user.id,
    parent_id: parentId,
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    emoji: '📄',
  };

  try {
    const { data, error } = await supabase
      .from(table)
      .insert(newItemData)
      .select('id')
      .single();

    if (error) throw error;
    revalidatePath('/disciplinas');
    return { success: true, newItem: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(`Falha ao criar item na tabela ${table}:`, error);
    return { error: `Falha ao criar: ${message}` };
  }
}

export async function updateItemTitle(
  table: TableName,
  id: number,
  newTitle: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  try {
    const { error } = await supabase
      .from(table)
      .update({ title: newTitle })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/disciplinas');
    revalidatePath('/guia-estudos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return { error: `Falha ao salvar título: ${message}` };
  }
}

export async function deleteItem(table: TableName, id: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;

    revalidatePath('/disciplinas');
    revalidatePath('/guia-estudos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return { error: `Falha ao deletar: ${message}` };
  }
}

export async function toggleFavoriteStatus(table: TableName, id: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  try {
    const { data: currentItem, error: fetchError } = await supabase
      .from(table)
      .select('is_favorite')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentItem) {
      throw new Error('Item não encontrado ou falha ao obter dados.');
    }

    const newFavoriteStatus = !currentItem.is_favorite;

    const { error: updateError } = await supabase
      .from(table)
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    revalidatePath('/disciplinas');
    return { success: true, isFavorite: newFavoriteStatus };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return { error: `Falha ao alternar favorito: ${message}` };
  }
}

// --- AÇÕES PARA TAREFAS ---
export async function addTarefa(formData: FormData) {
  const title = formData.get('title') as string;
  const dueDate = formData.get('due_date') as string;
  if (!title) return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('tarefas')
    .insert({ title, due_date: dueDate || null, user_id: user.id });
  revalidatePath('/tarefas');
  revalidatePath('/');
}

export async function toggleTarefa(id: number, currentState: boolean) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  await supabase
    .from('tarefas')
    .update({ completed: !currentState })
    .eq('id', id)
    .eq('user_id', user.id);
  revalidatePath('/tarefas');
  revalidatePath('/');
}

export async function deleteTarefa(id: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  await supabase.from('tarefas').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/tarefas');
  revalidatePath('/');
}

export async function updateTarefaStatus(
  id: number,
  status: 'pendente' | 'concluida' | 'arquivada'
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const isCompleted = status === 'concluida';

  const { error } = await supabase
    .from('tarefas')
    .update({ status: status, completed: isCompleted })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Falha ao atualizar o status da tarefa.' };
  }

  revalidatePath('/tarefas');
  revalidatePath('/');
  return { success: true };
}

// --- AÇÕES DE PERFIL ---
export async function updateProfile({
  id,
  fullName,
  avatarUrl,
}: {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}) {
  const { supabase, user } = await getAuth();

  if (!user) return { error: 'Usuário não autenticado.' };
  if (user.id !== id) {
    return { error: 'Operação não autorizada.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/perfil');
  revalidatePath('/');
  return { success: true };
}

// --- AÇÕES DE HIERARQUIA PARA DISCIPLINAS ---
export async function updateItemParent(
  table: TableName,
  itemId: number,
  newParentId: number | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };
  if (
    newParentId === itemId ||
    !(await isOwnedParent(supabase, table, newParentId, user.id))
  ) {
    return { error: 'Pasta de destino inválida.' };
  }

  try {
    const { error } = await supabase
      .from(table)
      .update({ parent_id: newParentId })
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/disciplinas');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return { error: `Falha ao mover: ${message}` };
  }
}

// ==================================================================
// --- AÇÕES PARA GERADOR DE ANKI (COM DESCOBERTA AUTOMÁTICA DE MODELO GEMINI) ---
export async function generateAnkiCards(formData: FormData) {
  const sourceTextValue = formData.get('sourceText');
  const sourceText =
    typeof sourceTextValue === 'string' ? sourceTextValue.trim() : '';
  const numCards = Number(formData.get('numCards'));
  const cardStyle = (formData.get('cardStyle') as string) || 'objetivo';

  const { user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };
  if (!sourceText) return { error: 'Informe um texto de estudo.' };
  if (sourceText.length > 25000)
    return { error: 'O texto deve ter no máximo 25000 caracteres.' };
  if (!Number.isInteger(numCards) || numCards < 1 || numCards > 50) {
    return { error: 'O número de flashcards deve ser entre 1 e 50.' };
  }

  const rawKey = process.env.GEMINI_API_KEY || '';
  const apiKey = rawKey.replace(/["']/g, '').trim();
  if (!apiKey)
    return { error: 'Chave GEMINI_API_KEY não configurada no ambiente.' };

  const styleInstruction =
    cardStyle === 'cespe'
      ? 'Crie afirmações no estilo Certo/Errado de banca de concurso (Cebraspe), colocando na resposta o gabarito (CERTO ou ERRADO) seguido da justificativa.'
      : cardStyle === 'pratico'
      ? 'Crie perguntas focadas em casos práticos, exceções de lei, prazos e pegadinhas clássicas de concursos.'
      : 'Crie perguntas diretas, claras e objetivas na frente, e respostas concisas e completas no verso.';

  const prompt = `Você é um especialista em preparação para concursos públicos e repetição espaçada (Anki).
${styleInstruction}
Baseado no texto de estudo abaixo, gere exatamente ${numCards} flashcards em português.
Retorne EXCLUSIVAMENTE um objeto JSON válido no formato:
{"cards": [{"question": "pergunta aqui", "answer": "resposta aqui"}]}

Texto de estudo:
"""
${sourceText}
"""`;

  const payload = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.4,
      responseMimeType: 'application/json',
    },
  };

  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash-latest',
  ];

  const callModel = async (modelName: string) => {
    const cleanModel = modelName.replace(/^models\//, '');
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  };

  try {
    let response: Response | null = null;

    for (const model of candidateModels) {
      response = await callModel(model);
      if (response.status !== 404) {
        break;
      }
    }

    if (!response || response.status === 404) {
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(
          apiKey
        )}`
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        const availableModel = (listData?.models || []).find(
          (m: any) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes('generateContent') &&
            m.name?.includes('gemini')
        );
        if (availableModel?.name) {
          response = await callModel(availableModel.name);
        }
      }
    }

    if (!response || !response.ok) {
      const status = response?.status || 500;
      const errorBody = response ? await response.text() : '';
      console.error('Erro na API do Gemini:', status, errorBody);

      if (status === 429) {
        return {
          error:
            'Limite de uso gratuito da IA atingido. Aguarde 1 minuto e tente novamente.',
        };
      }
      if (status === 400 || status === 403) {
        return {
          error:
            'Chave GEMINI_API_KEY inválida ou sem permissão no Google AI Studio.',
        };
      }
      return {
        error: `Falha ao gerar flashcards (código ${status}). Verifique sua GEMINI_API_KEY.`,
      };
    }

    const result = await response.json();
    const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof rawText !== 'string' || !rawText.trim()) {
      return { error: 'A IA retornou uma resposta vazia. Tente novamente.' };
    }

    const cleanJsonText = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const parsed = JSON.parse(cleanJsonText);
    const cardsArray = Array.isArray(parsed) ? parsed : parsed?.cards;

    if (!Array.isArray(cardsArray) || cardsArray.length === 0) {
      return { error: 'Formato inesperado da IA. Tente gerar novamente.' };
    }

    const validCards: Flashcard[] = cardsArray
      .filter(
        (c: any) =>
          c && typeof c.question === 'string' && typeof c.answer === 'string'
      )
      .map((c: any) => ({
        question: c.question.trim(),
        answer: c.answer.trim(),
      }));

    return { data: validCards };
  } catch (error) {
    console.error('Falha ao gerar flashcards:', error);
    return {
      error: 'Erro de conexão ao gerar flashcards. Tente novamente.',
    };
  }
}

export async function saveAnkiDeck(title: string, cards: Flashcard[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };
  if (!title.trim()) return { error: 'O título é obrigatório.' };
  if (cards.length === 0) return { error: 'Não há flashcards para guardar.' };

  const { data, error } = await supabase
    .from('anki_decks')
    .insert({ title, cards, user_id: user.id })
    .select('id')
    .single();
  if (error) return { error: 'Falha ao guardar o deck de flashcards.' };

  revalidatePath('/anki');
  return { success: true, newDeckId: data.id };
}

export async function deleteAnkiDeck(deckId: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { error } = await supabase
    .from('anki_decks')
    .delete()
    .match({ id: deckId, user_id: user.id });

  if (error) {
    return { error: 'Falha ao apagar o deck.' };
  }

  revalidatePath('/anki');
  return { success: true };
}

export async function updateAnkiDeck(
  deckId: number,
  title: string,
  cards: Flashcard[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  if (!title.trim()) return { error: 'O título é obrigatório.' };
  if (cards.length === 0) return { error: 'Não há flashcards para guardar.' };

  const { error } = await supabase
    .from('anki_decks')
    .update({ title, cards })
    .match({ id: deckId, user_id: user.id });

  if (error) {
    return { error: 'Falha ao atualizar o deck.' };
  }

  revalidatePath('/anki');
  return { success: true };
}

// ==================================================================
// --- AÇÕES PARA METAS DE ESTUDO ---
type StudyGoalValues = {
  title: string;
  type: string;
  target_value: number;
  current_value: number;
  start_date: string;
  end_date: string;
};

function parseStudyGoalValues(
  formData: FormData
): { data: StudyGoalValues } | { error: string } {
  const getString = (name: string) => {
    const value = formData.get(name);
    return typeof value === 'string' ? value.trim() : '';
  };

  const title = getString('title');
  const targetValue = Number(getString('target_value'));
  const currentValueField = formData.get('current_value');
  const currentValue =
    currentValueField === null || currentValueField === ''
      ? 0
      : typeof currentValueField === 'string'
      ? Number(currentValueField)
      : NaN;
  const startDate = getString('start_date');
  const endDate = getString('end_date');
  const type = getString('type') || 'monthly_questions';

  if (!title || title.length > 200) {
    return { error: 'Informe um título com até 200 caracteres.' };
  }
  if (!Number.isInteger(targetValue) || targetValue <= 0) {
    return { error: 'A meta deve ser um número inteiro maior que zero.' };
  }
  if (
    !Number.isInteger(currentValue) ||
    currentValue < 0 ||
    currentValue > targetValue
  ) {
    return {
      error: 'O progresso atual deve estar entre zero e o valor da meta.',
    };
  }
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (
    !datePattern.test(startDate) ||
    !datePattern.test(endDate) ||
    endDate < startDate
  ) {
    return { error: 'Informe um período válido para a meta.' };
  }

  return {
    data: {
      title,
      type,
      target_value: targetValue,
      current_value: currentValue,
      start_date: startDate,
      end_date: endDate,
    },
  };
}

export async function addStudyGoal(formData: FormData) {
  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };

  const parsed = parseStudyGoalValues(formData);
  if ('error' in parsed) return parsed;

  const { error } = await supabase.from('study_goals').insert({
    user_id: user.id,
    ...parsed.data,
  });

  if (error) {
    console.error('Erro ao criar meta:', error);
    return { error: 'Falha ao criar a meta de estudo.' };
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateStudyGoalValue(id: number, new_value: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { error } = await supabase
    .from('study_goals')
    .update({ current_value: new_value })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Falha ao atualizar o progresso da meta.' };
  }

  revalidatePath('/');
  return { success: true };
}

export async function deleteStudyGoal(id: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { error } = await supabase
    .from('study_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: 'Falha ao apagar a meta.' };
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateStudyGoal(formData: FormData) {
  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };

  const idValue = formData.get('id');
  const id = typeof idValue === 'string' ? Number(idValue.trim()) : NaN;
  if (!Number.isInteger(id) || id <= 0) return { error: 'Meta inválida.' };

  const parsed = parseStudyGoalValues(formData);
  if ('error' in parsed) return parsed;

  const { error } = await supabase
    .from('study_goals')
    .update({
      title: parsed.data.title,
      target_value: parsed.data.target_value,
      current_value: parsed.data.current_value,
      start_date: parsed.data.start_date,
      end_date: parsed.data.end_date,
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Erro ao atualizar meta:', error);
    return { error: 'Falha ao atualizar a meta de estudo.' };
  }

  revalidatePath('/');
  return { success: true };
}

export async function searchPaginas(query: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  if (!query) {
    const { data, error } = await supabase
      .from('paginas')
      .select('id, title')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Erro na pesquisa de páginas:', error);
      return [];
    }
    return (data || []).map((page) => ({ ...page, type: 'paginas' as const }));
  }

  const searchTerm = `%${query}%`;
  const { data, error } = await supabase
    .from('paginas')
    .select('id, title')
    .eq('user_id', user.id)
    .ilike('title', searchTerm)
    .limit(5);

  if (error) {
    console.error('Erro na pesquisa de páginas:', error);
    return [];
  }

  return (data || []).map((page) => ({ ...page, type: 'paginas' as const }));
}

export async function updateConcursosOrdem(
  updates: { id: number; ordem: number }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  try {
    const updatePromises = updates.map((item) =>
      supabase
        .from('concursos')
        .update({ ordem: item.ordem })
        .eq('id', item.id)
        .eq('user_id', user.id)
    );

    const results = await Promise.all(updatePromises);
    const firstError = results.find((res) => res.error);
    if (firstError) throw firstError.error;

    revalidatePath('/guia-estudos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return { error: `Falha ao salvar a nova ordem: ${message}` };
  }
}