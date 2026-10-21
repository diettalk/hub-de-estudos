'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { add } from 'date-fns';
import { type SessaoEstudo, type Resource, type Disciplina } from '@/lib/types';
import { JSONContent } from '@tiptap/react';


type Flashcard = {
  question: string;
  answer: string;
};

async function getAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

async function isOwnedParent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'paginas' | 'documentos' | 'resources',
  parentId: number | null,
  userId: string,
): Promise<boolean> {
  if (parentId === null) return true;
  if (!Number.isInteger(parentId)) return false;
  const { data } = await supabase.from(table).select('id').eq('id', parentId).eq('user_id', userId).maybeSingle();
  return !!data;
}

// --- AÇÕES DE CONCURSOS ---
export async function addConcurso(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const nome = formData.get('nome') as string;
  const banca = formData.get('banca') as string;
  const dataProva = formData.get('data_prova') as string;
  const status = formData.get('status') as string;
  const edital_url = formData.get('edital_url') as string;
  const prioridadesRaw = formData.get('prioridades') as string;
  const prioridades = prioridadesRaw ? prioridadesRaw.split('\n').map(p => p.trim()).filter(p => p.length > 0) : [];

  if (!nome || !banca || !dataProva || !status) return;

  await supabase.from('concursos').insert({ 
    nome, banca, data_prova: dataProva, status, edital_url, prioridades, user_id: user.id 
  });

  revalidatePath('/guia-estudos');
}

export async function updateConcurso(formData: FormData) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  const id = Number(formData.get('id'));
  const nome = formData.get('nome') as string;
  const banca = formData.get('banca') as string;
  const dataProva = formData.get('data_prova') as string;
  const status = formData.get('status') as string;
  const edital_url = formData.get('edital_url') as string;
  const prioridadesRaw = formData.get('prioridades') as string;
  const prioridades = prioridadesRaw ? prioridadesRaw.split('\n').map(p => p.trim()).filter(p => p.length > 0) : [];

  if (!id || !nome || !banca || !dataProva || !status) return;

  await supabase.from('concursos').update({ 
    nome, banca, data_prova: dataProva, status, edital_url, prioridades
  }).eq('id', id).eq('user_id', user.id);

  revalidatePath('/guia-estudos');
}

export async function updateConcursoStatus(id: number, status: 'ativo' | 'previsto' | 'arquivado') {
  const { supabase, user } = await getAuth();
  if (!user) return;
  await supabase.from('concursos').update({ status }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/guia-estudos');
}

export async function deleteConcurso(id: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  await supabase.from('concursos').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/guia-estudos');
}

// --- AÇÕES DE DISCIPLINAS ---
export async function createPagina(parentId: number | null, title: string, emoji: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };
  if (!(await isOwnedParent(supabase, 'paginas', parentId, user.id))) {
    return { error: 'Pasta de destino inválida.' };
  }

  const { data, error } = await supabase
    .from('paginas')
    .insert({ title, emoji, parent_id: parentId, user_id: user.id })
    .select()
    .single();

  if (error) return { error: error.message };
  
  revalidatePath('/disciplinas');
  return { data };
}

// 1. Altere o tipo do parâmetro 'content' para 'string'
export async function updatePaginaContent(id: number, content: string) {
  if (isNaN(id)) return { error: "ID da página inválido." };

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
    // 3. Use o objeto já convertido para salvar no banco de dados
    .update({ content: parsedContent })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error("Erro ao salvar conteúdo da página:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function deletePagina(id: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  await supabase.from('paginas').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/disciplinas');
}

// --- AÇÕES DE VÍNCULO ---
export async function linkPastaToConcurso(concursoId: number, paginaId: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  const [{ data: concurso }, { data: pagina }] = await Promise.all([
    supabase.from('concursos').select('id').eq('id', concursoId).eq('user_id', user.id).maybeSingle(),
    supabase.from('paginas').select('id').eq('id', paginaId).eq('user_id', user.id).maybeSingle(),
  ]);
  if (!concurso || !pagina) return;

  const { data: existingLink } = await supabase
    .from('concurso_paginas')
    .select()
    .match({ concurso_id: concursoId, pagina_id: paginaId })
    .single();

  if (existingLink) return;

  await supabase.from('concurso_paginas').insert({ concurso_id: concursoId, pagina_id: paginaId });
  revalidatePath('/guia-estudos');
}

export async function unlinkPastaFromConcurso(concursoId: number, paginaId: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  const [{ data: concurso }, { data: pagina }] = await Promise.all([
    supabase.from('concursos').select('id').eq('id', concursoId).eq('user_id', user.id).maybeSingle(),
    supabase.from('paginas').select('id').eq('id', paginaId).eq('user_id', user.id).maybeSingle(),
  ]);
  if (!concurso || !pagina) return;
  await supabase.from('concurso_paginas').delete().match({ concurso_id: concursoId, pagina_id: paginaId });
  revalidatePath('/guia-estudos');
}

// --- AÇÕES DO CICLO DE ESTUDOS ---
export async function updateSessaoEstudo(sessaoData: Partial<SessaoEstudo> & { id: number }) {
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

  const { error } = await supabase.from('ciclo_sessoes').update(updateData).eq('id', id).eq('user_id', user.id);
  if (error) {
    console.error("Erro no auto-save da sessão:", error);
    return { error: "Falha ao salvar alterações da sessão." };
  }
  revalidatePath('/ciclo');
}

export async function updateDatasSessaoEstudo(
  sessaoId: number, 
  campoAlterado: 'data_estudo' | 'data_revisao_1' | 'data_revisao_2' | 'data_revisao_3', 
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

      await supabase.from('ciclo_sessoes').update({
        data_estudo: dataFormatada.toISOString(),
        data_revisao_1: rev1.toISOString(),
        data_revisao_2: rev7.toISOString(),
        data_revisao_3: rev30.toISOString(),
      }).eq('id', sessaoId).eq('user_id', user.id);
      
      await Promise.all([
        supabase.from('revisoes').update({ data_revisao: rev1.toISOString().split('T')[0] }).match({ ciclo_sessao_id: sessaoId, tipo_revisao: '24h', user_id: user.id }),
        supabase.from('revisoes').update({ data_revisao: rev7.toISOString().split('T')[0] }).match({ ciclo_sessao_id: sessaoId, tipo_revisao: '7 dias', user_id: user.id }),
        supabase.from('revisoes').update({ data_revisao: rev30.toISOString().split('T')[0] }).match({ ciclo_sessao_id: sessaoId, tipo_revisao: '30 dias', user_id: user.id })
      ]);

    } else {
      const mapaRevisao = {
        data_revisao_1: { tipo: '24h', campoDB: 'data_revisao_1' },
        data_revisao_2: { tipo: '7 dias', campoDB: 'data_revisao_2' },
        data_revisao_3: { tipo: '30 dias', campoDB: 'data_revisao_3' }
      };
      const infoRevisao = mapaRevisao[campoAlterado];

      await supabase.from('ciclo_sessoes').update({
        [infoRevisao.campoDB]: dataFormatada.toISOString()
      }).eq('id', sessaoId).eq('user_id', user.id);

      await supabase.from('revisoes').update({ 
        data_revisao: dataFormatada.toISOString().split('T')[0] 
      }).match({ 
        ciclo_sessao_id: sessaoId, 
        tipo_revisao: infoRevisao.tipo,
        user_id: user.id,
      });
    }
    
    revalidatePath('/ciclo');
    revalidatePath('/revisoes');
    revalidatePath('/calendario');
    revalidatePath('/');
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao atualizar datas:", errorMessage);
    return { error: errorMessage };
  }
}

export async function toggleConclusaoSessao(sessaoId: number, isCompleting: boolean) {
  const { supabase, user } = await getAuth();

  if (!user) return { error: 'Usuário não autenticado.' };
  if (isNaN(sessaoId)) return { error: 'Ação inválida.' };

  try {
    if (isCompleting) {
      const studyDate = new Date();
      const { data: sessao, error: sessaoError } = await supabase
        .from('ciclo_sessoes').select('disciplina_id, foco_sugerido, materia_nome')
        .eq('id', sessaoId).eq('user_id', user.id).single();
      if (sessaoError) throw new Error(`Falha ao buscar sessão: ${sessaoError.message}`);
      if (!sessao) throw new Error('Sessão de estudo não encontrada.');

      const rev1 = add(studyDate, { days: 1 });
      const rev7 = add(studyDate, { days: 7 });
      const rev30 = add(studyDate, { days: 30 });
      
      await supabase.from('ciclo_sessoes').update({
        concluida: true, data_estudo: studyDate.toISOString(),
        data_revisao_1: rev1.toISOString(), data_revisao_2: rev7.toISOString(), data_revisao_3: rev30.toISOString(),
      }).eq('id', sessaoId).eq('user_id', user.id);
      
      await supabase.from('revisoes').delete().eq('ciclo_sessao_id', sessaoId).eq('user_id', user.id);

      const revisoesParaInserir = [
        { ciclo_sessao_id: sessaoId, user_id: user.id, data_revisao: rev1.toISOString().split('T')[0], tipo_revisao: '24h', concluida: false, materia_nome: sessao.materia_nome, foco_sugerido: sessao.foco_sugerido },
        { ciclo_sessao_id: sessaoId, user_id: user.id, data_revisao: rev7.toISOString().split('T')[0], tipo_revisao: '7 dias', concluida: false, materia_nome: sessao.materia_nome, foco_sugerido: sessao.foco_sugerido },
        { ciclo_sessao_id: sessaoId, user_id: user.id, data_revisao: rev30.toISOString().split('T')[0], tipo_revisao: '30 dias', concluida: false, materia_nome: sessao.materia_nome, foco_sugerido: sessao.foco_sugerido },
      ];
      
      const { error: insertError } = await supabase.from('revisoes').insert(revisoesParaInserir);
      if (insertError) throw new Error(`Falha ao inserir novas revisões: ${insertError.message}`);

    } else {
      await supabase.from('ciclo_sessoes').update({
        concluida: false, data_estudo: null, data_revisao_1: null, data_revisao_2: null, data_revisao_3: null,
      }).eq('id', sessaoId).eq('user_id', user.id);
      await supabase.from('revisoes').delete().eq('ciclo_sessao_id', sessaoId).eq('user_id', user.id);
    }
    
    revalidatePath('/ciclo');
    revalidatePath('/revisoes');
    revalidatePath('/calendario');
    revalidatePath('/');
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
    console.error("[toggleConclusaoSessao] Erro Capturado:", errorMessage);
    return { error: errorMessage };
  }
}

export async function seedFase1Ciclo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { count } = await supabase.from('ciclo_sessoes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  if (count && count > 0) return { message: 'O ciclo já possui dados.' };

  const fase1Template = [
    { ordem: 1, materia_nome: 'LP', foco_sugerido: '1.1 Interpretação de Textos: Análise de textos complexos (jornalísticos).' },
  ];
  const sessoesParaInserir = fase1Template.map(sessao => ({ ...sessao, user_id: user.id }));
  await supabase.from('ciclo_sessoes').insert(sessoesParaInserir);
  revalidatePath('/ciclo');
}

export async function addSessaoCiclo() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: ultimaSessao } = await supabase.from('ciclo_sessoes').select('ordem').eq('user_id', user.id).order('ordem', { ascending: false }).limit(1).single();
  const proximaOrdem = (ultimaSessao?.ordem || 0) + 1;
  await supabase.from('ciclo_sessoes').insert({ ordem: proximaOrdem, user_id: user.id });
  revalidatePath('/ciclo');
}

export async function deleteSessaoCiclo(id: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  if (isNaN(id)) return;
  await supabase.from('ciclo_sessoes').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/ciclo');
}

// NOVO: Ação para excluir múltiplas sessões
export async function deleteSessoesEmMassa(ids: number[]) {
  if (!ids || ids.length === 0) {
    return { error: 'Nenhum ID fornecido para exclusão.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  try {
    const { error } = await supabase
      .from('ciclo_sessoes')
      .delete()
      .in('id', ids) // Exclui todos os IDs no array
      .eq('user_id', user.id); // Garante que o usuário só pode excluir suas próprias sessoes

    if (error) throw error;

    revalidatePath('/ciclo');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Falha ao excluir sessoes em massa:', message);
    return { error: message };
  }
}

// --- AÇÕES DO CALENDÁRIO ---
export async function addLembrete(formData: FormData) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  const titulo = formData.get('titulo') as string;
  const data = formData.get('data') as string;
  const cor = formData.get('cor') as string;
  if (!titulo || !data) return;
  await supabase.from('lembretes').insert({ titulo, data, cor, user_id: user.id });
  revalidatePath('/calendario');
}

export async function updateLembrete(formData: FormData) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  const id = Number(formData.get('id'));
  const titulo = formData.get('titulo') as string;
  const cor = formData.get('cor') as string;
  if(!id || !titulo) return;
  await supabase.from('lembretes').update({ titulo, cor }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/calendario');
}

export async function deleteLembrete(id: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  if(isNaN(id)) return;
  await supabase.from('lembretes').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/calendario');
}

export async function updateRevisaoStatus(revisaoId: number, status: boolean) {
    const { supabase, user } = await getAuth();
    if (!user) return { error: 'Usuário não autenticado.' };
    const { error } = await supabase.from('revisoes').update({ concluida: status }).eq('id', revisaoId).eq('user_id', user.id);
    if (error) return { error: error.message };
    revalidatePath('/revisoes');
    revalidatePath('/calendario');
    return { success: true };
}

// --- AÇÕES PARA DOCUMENTOS ---
export async function addDocumento(formData: FormData) {
  const title = formData.get('title') as string;
  const parentIdValue = formData.get('parent_id') as string | null;
  const parentId = parentIdValue ? Number(parentIdValue) : null;

  if (!title || title.trim() === '') {
    return { error: 'O título é obrigatório.' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Usuário não autenticado.' };
  }
  if (!(await isOwnedParent(supabase, 'documentos', parentId, user.id))) {
    return { error: 'Pasta de destino inválida.' };
  }

  const { data, error } = await supabase
    .from('documentos')
    .insert({
      title,
      user_id: user.id,
      content: null, 
      parent_id: parentId,
    })
    .select('id') 
    .single();

  if (error) {
    console.error("Erro ao adicionar documento:", error);
    return { error: error.message };
  }

  revalidatePath('/documentos');
  return { data }; 
}

// A função agora espera uma STRING como segundo parâmetro
export async function updateDocumentoContent(id: number, content: string) {
  
  if (isNaN(id)) return { error: "ID inválido." };

  let parsedContent: JSONContent;
  try {
    parsedContent = JSON.parse(content);
  } catch {
    return { error: 'Conteúdo inválido.' };
  }

  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };
  
  const { error } = await supabase
    .from('documentos')
    // Salva o objeto já parseado
    .update({ content: parsedContent })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error("Erro ao salvar conteúdo do documento:", error);
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteDocumento(id: number) {
  if (isNaN(id)) {
    return { error: "ID inválido." };
  }

  const { supabase, user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };
  const { data: documento } = await supabase
    .from('documentos')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!documento) return { error: 'Documento não encontrado.' };

  const { error } = await supabase.rpc('delete_documento_e_filhos', { doc_id: id });

  if (error) {
    console.error("Erro ao deletar documento:", error);
    return { error: error.message };
  }

  revalidatePath('/documentos');
  return { success: true };
}

// ============================================================================
// --- AÇÕES GENÉRICAS PARA HIERARQUIA (PÁGINAS, DOCUMENTOS) ---
// ============================================================================
type TableName = 'paginas' | 'documentos';

export async function createItem(table: TableName, parentId: number | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };
  if (!(await isOwnedParent(supabase, table, parentId, user.id))) {
    return { error: 'Pasta de destino inválida.' };
  }

  const newItemData: any = {
    title: 'Novo Item',
    user_id: user.id,
    parent_id: parentId,
    content: { type: 'doc', content: [{ type: 'paragraph' }] } // garante json válido
  };

  if (table === 'paginas') {
    newItemData.emoji = '📄';
  }

  try {
    const { data, error } = await supabase
      .from(table)
      .insert(newItemData)
      .select('id')
      .single();

    if (error) throw error;
    revalidatePath(table === 'paginas' ? '/disciplinas' : '/documentos');
    return { success: true, newItem: data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error(`Falha ao criar item na tabela ${table}:`, error);
    return { error: `Falha ao criar: ${message}` };
  }
}


export async function updateItemTitle(table: 'documentos' | 'paginas', id: number, newTitle: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  try {
    const { error } = await supabase
      .from(table)
      .update({ title: newTitle })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath(table === 'paginas' ? '/disciplinas' : '/documentos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { error: `Falha ao salvar título: ${message}` };
  }
}

export async function deleteItem(table: 'documentos' | 'paginas', id: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  try {
    let error;
    if (table === 'documentos') {
      const { data: documento } = await supabase
        .from('documentos')
        .select('id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!documento) return { error: 'Documento não encontrado.' };
      const { error: rpcError } = await supabase.rpc('delete_documento_e_filhos', { doc_id: id });
      error = rpcError;
    } else {
      const { error: deleteError } = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      error = deleteError;
    }

    if (error) throw error;

    revalidatePath(table === 'paginas' ? '/disciplinas' : '/documentos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { error: `Falha ao deletar: ${message}` };
  }
}

// CORRIGIDO: Ação para alternar o status de favorito de um item
export async function toggleFavoriteStatus(table: TableName, id: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  try {
    const { data: currentItem, error: fetchError } = await supabase
      .from(table)
      .select('is_favorite')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !currentItem) {
      console.error("Erro ao buscar item para favoritar:", fetchError);
      throw new Error("Item não encontrado ou falha ao obter dados.");
    }

    const newFavoriteStatus = !currentItem.is_favorite;

    const { error: updateError } = await supabase
      .from(table)
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    revalidatePath(table === 'paginas' ? '/disciplinas' : '/documentos');
    return { success: true, isFavorite: newFavoriteStatus };

  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro em toggleFavoriteStatus:", message);
    return { error: `Falha ao alternar favorito: ${message}` };
  }
}

// --- AÇÕES PARA TAREFAS ---
export async function addTarefa(formData: FormData) {
  const title = formData.get('title') as string;
  const dueDate = formData.get('due_date') as string;
  if (!title) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('tarefas').insert({ title, due_date: dueDate || null, user_id: user.id });
  revalidatePath('/tarefas');
}

export async function toggleTarefa(id: number, currentState: boolean) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  await supabase.from('tarefas').update({ completed: !currentState }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/tarefas');
}

export async function deleteTarefa(id: number) {
  const { supabase, user } = await getAuth();
  if (!user) return;
  await supabase.from('tarefas').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/tarefas');
}

// ==================================================================
// --- AÇÕES DE PERFIL ---
export async function updateProfile({ id, fullName, avatarUrl }: { id: string, fullName: string, avatarUrl: string | null }) {
  const { supabase, user } = await getAuth();

  if (!user) return { error: 'Usuário não autenticado.' };
  if (user.id !== id) {
    return { error: 'Operação não autorizada.' };
  }
  
  const { error } = await supabase.from('profiles').update({
    full_name: fullName,
    avatar_url: avatarUrl,
    updated_at: new Date().toISOString(),
  }).eq('id', id);

  if (error) {
    return { error: error.message };
  }
  
  revalidatePath('/perfil');
  revalidatePath('/'); 
  return { success: true };
}

// ==================================================================
// --- AÇÕES GENÉRICAS PARA HIERARQUIA (DOCUMENTOS, DISCIPLINAS, RECURSOS) ---
export async function updateItemParent(table: 'documentos' | 'paginas' | 'resources', itemId: number, newParentId: number | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };
  if (newParentId === itemId || !(await isOwnedParent(supabase, table, newParentId, user.id))) {
    return { error: 'Pasta de destino inválida.' };
  }

  try {
    const { error } = await supabase
      .from(table)
      .update({ parent_id: newParentId })
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) throw error;
    
    const path = table === 'resources' ? '/biblioteca' : (table === 'paginas' ? '/disciplinas' : '/documentos');
    revalidatePath(path);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { error: `Falha ao mover: ${message}` };
  }
}

// ==================================================================
// --- AÇÕES PARA GERADOR DE ANKI ---
export async function generateAnkiCards(formData: FormData) {
  const sourceTextValue = formData.get('sourceText');
  const sourceText = typeof sourceTextValue === 'string' ? sourceTextValue.trim() : '';
  const numCards = Number(formData.get('numCards'));

  const { user } = await getAuth();
  if (!user) return { error: 'Usuário não autenticado.' };
  if (!sourceText) return { error: 'Informe um texto de estudo.' };
  if (sourceText.length > 20000) return { error: 'O texto deve ter no máximo 20000 caracteres.' };
  if (!Number.isInteger(numCards) || numCards < 1 || numCards > 50) {
    return { error: 'O número de flashcards deve ser um inteiro entre 1 e 50.' };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "Chave de API do Gemini não encontrada." };

  const prompt = `Baseado no seguinte texto de estudo, gere exatamente ${numCards} flashcards no formato JSON para o Anki. O texto é: "${sourceText}". Você é um especialista em criar flashcards para o sistema de repetição espaçada Anki. O JSON deve ter uma chave "cards" que contém um array de objetos, cada um com "question" e "answer".`;

  try {
    const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = { 
        contents: chatHistory,
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
                type: "OBJECT",
                properties: {
                    "cards": {
                        type: "ARRAY",
                        items: {
                            type: "OBJECT",
                            properties: {
                                "question": { "type": "STRING" },
                                "answer": { "type": "STRING" }
                            },
                            required: ["question", "answer"]
                        }
                    }
                }
            }
        }
    };
    
    const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Erro na API do Gemini:', errorBody);
      return { error: 'Falha ao gerar flashcards. Tente novamente mais tarde.' };
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') {
      return { error: 'A resposta da IA está em um formato inválido.' };
    }

    try {
      const parsedJson = JSON.parse(text);
      if (!Array.isArray(parsedJson?.cards)) {
        return { error: 'A resposta da IA está em um formato inválido.' };
      }
      return { data: parsedJson.cards as Flashcard[] };
    } catch {
      return { error: 'A resposta da IA está em um formato inválido.' };
    }
  } catch (error: unknown) {
    console.error('Falha ao gerar flashcards:', error);
    return { error: 'Falha ao gerar flashcards. Tente novamente mais tarde.' };
  }
}

export async function saveAnkiDeck(title: string, cards: Flashcard[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };
  if (!title.trim()) return { error: "O título é obrigatório." };
  if (cards.length === 0) return { error: "Não há flashcards para guardar." };

  const { data, error } = await supabase.from('anki_decks').insert({ title, cards, user_id: user.id }).select('id').single();
  if (error) return { error: "Falha ao guardar o deck de flashcards." };
  
  revalidatePath('/anki');
  return { success: true, newDeckId: data.id };
}

export async function deleteAnkiDeck(deckId: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { error } = await supabase.from('anki_decks').delete().match({ id: deckId, user_id: user.id });

  if (error) {
    return { error: "Falha ao apagar o deck." };
  }

  revalidatePath('/anki');
  return { success: true };
}

export async function updateTarefaStatus(
  id: number,
  status: 'pendente' | 'concluida' | 'arquivada'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const isCompleted = status === 'concluida';

  const { error } = await supabase
    .from('tarefas')
    .update({ status: status, completed: isCompleted })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: "Falha ao atualizar o status da tarefa." };
  }

  revalidatePath('/tarefas');
  return { success: true };
}

// ==================================================================
// --- AÇÕES PARA METAS DE ESTUDO ---
export async function addStudyGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const title = formData.get('title') as string;
  const type = formData.get('type') as string;
  const target_value = Number(formData.get('target_value'));
  const start_date = formData.get('start_date') as string;
  const end_date = formData.get('end_date') as string;

  if (!title || !type || !target_value || !start_date || !end_date) {
    return { error: "Faltam dados essenciais para criar a meta." };
  }

  const { error } = await supabase.from('study_goals').insert({
    user_id: user.id,
    title,
    type,
    target_value,
    start_date,
    end_date,
  });

  if (error) {
    console.error("Erro ao criar meta:", error);
    return { error: "Falha ao criar a meta de estudo." };
  }

  revalidatePath('/'); 
  return { success: true };
}

export async function updateStudyGoalValue(id: number, new_value: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { error } = await supabase
    .from('study_goals')
    .update({ current_value: new_value })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: "Falha ao atualizar o progresso da meta." };
  }

  revalidatePath('/');
  return { success: true };
}

export async function deleteStudyGoal(id: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { error } = await supabase
    .from('study_goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return { error: "Falha ao apagar a meta." };
  }

  revalidatePath('/');
  return { success: true };
}

export async function updateStudyGoal(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const id = Number(formData.get('id'));
  const title = formData.get('title') as string;
  const type = formData.get('type') as string;
  const target_value = Number(formData.get('target_value'));

  if (!id || !title || !type || !target_value) {
    return { error: "Faltam dados essenciais para atualizar a meta." };
  }

  const { error } = await supabase
    .from('study_goals')
    .update({ title, type, target_value })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error("Erro ao atualizar meta:", error);
    return { error: "Falha ao atualizar a meta de estudo." };
  }

  revalidatePath('/');
  return { success: true };
}

// ==================================================================
// --- AÇÕES PARA A BIBLIOTECA (VERSÃO ESTÁVEL E SIMPLIFICADA) ---
export async function getBibliotecaData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Utilizador não autenticado.");

    const [allResourcesResult, disciplinasResult] = await Promise.all([
        supabase.from('resources').select('*').eq('user_id', user.id).order('ordem'),
        supabase.from('paginas').select('id, title').eq('user_id', user.id).order('title'),
    ]);

    if (allResourcesResult.error) throw allResourcesResult.error;
    if (disciplinasResult.error) throw disciplinasResult.error;

    const allResources = allResourcesResult.data as Resource[];
    
    return {
        activeResources: allResources.filter(r => r.status === 'ativo'),
        archivedItems: allResources.filter(r => r.status === 'arquivado'),
        disciplinas: (disciplinasResult.data || []) as Disciplina[],
    };
}

async function getOrCreateDisciplinaFolder(supabase: any, userId: string, disciplinaId: number): Promise<number | null> {
    const { data: existingFolder } = await supabase
        .from('resources')
        .select('id')
        .eq('disciplina_id', disciplinaId)
        .eq('type', 'folder')
        .eq('user_id', userId)
        .maybeSingle();

    if (existingFolder) {
        return existingFolder.id;
    } else {
        const { data: disciplina } = await supabase.from('paginas').select('title').eq('id', disciplinaId).eq('user_id', userId).single();
        if (disciplina) {
            const { data: newFolder, error: newFolderError } = await supabase
                .from('resources')
                .insert({ user_id: userId, title: disciplina.title, type: 'folder', disciplina_id: disciplinaId, parent_id: null, status: 'ativo' })
                .select('id')
                .single();
            if (newFolderError) {
                console.error("Falha ao criar pasta da disciplina:", newFolderError);
                return null;
            }
            return newFolder.id;
        }
    }
    return null;
}

export async function createResource(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const type = formData.get('type') as 'link' | 'folder';
  const disciplinaIdStr = formData.get('disciplina_id') as string;
  const disciplina_id = (disciplinaIdStr && disciplinaIdStr !== 'null') ? Number(disciplinaIdStr) : null;
  const url = formData.get('url') as string;
  const parentIdStr = formData.get('parent_id') as string;
  let parent_id = parentIdStr && parentIdStr !== 'null' ? Number(parentIdStr) : null;

  if (!title || !type) return { error: "Título e tipo são obrigatórios." };

  if (disciplina_id && type !== 'folder') {
      const folderId = await getOrCreateDisciplinaFolder(supabase, user.id, disciplina_id);
      if (folderId) parent_id = folderId;
  }
  if (!(await isOwnedParent(supabase, 'resources', parent_id, user.id))) {
    return { error: 'Pasta de destino inválida.' };
  }

  const resourceData: Partial<Resource> = { user_id: user.id, title, description, type, disciplina_id, parent_id, status: 'ativo' };

  if (type === 'link') {
    resourceData.url = url;
  }

  const { error } = await supabase.from('resources').insert(resourceData as any);
  if (error) return { error: "Falha ao criar o recurso.", details: error.message };

  revalidatePath('/biblioteca');
  return { success: true };
}

export async function updateResource(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Usuário não autenticado.' };

    const id = Number(formData.get('id'));
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const url = formData.get('url') as string;
    const disciplinaIdStr = formData.get('disciplina_id') as string;
    const disciplina_id = (disciplinaIdStr && disciplinaIdStr !== 'null') ? Number(disciplinaIdStr) : null;
    const parentIdStr = formData.get('parent_id') as string;
    let parent_id = parentIdStr && parentIdStr !== 'null' ? Number(parentIdStr) : null;
    
    const { data: currentResource } = await supabase.from('resources').select('disciplina_id, type').eq('id', id).eq('user_id', user.id).single();
    if (!currentResource) return { error: "Recurso não encontrado." };

    if (disciplina_id && disciplina_id !== currentResource.disciplina_id && currentResource.type !== 'folder') {
        const folderId = await getOrCreateDisciplinaFolder(supabase, user.id, disciplina_id);
        if (folderId) parent_id = folderId;
    }
    if (parent_id === id || !(await isOwnedParent(supabase, 'resources', parent_id, user.id))) {
        return { error: 'Pasta de destino inválida.' };
    }
    
    const { error } = await supabase.from('resources').update({ title, description, url, parent_id, disciplina_id }).eq('id', id).eq('user_id', user.id);
    if (error) return { error: "Falha ao atualizar o recurso.", details: error.message };

    revalidatePath('/biblioteca');
    return { success: true };
}

export async function deleteResource(resourceId: number, isPermanent: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Usuário não autenticado.' };

    if (!isPermanent) {
        const { error } = await supabase.from('resources').update({ status: 'arquivado' }).match({ id: resourceId, user_id: user.id });
        if (error) return { error: "Falha ao arquivar o recurso." };
        revalidatePath('/biblioteca');
        return { success: true };
    }

    const { data: resource } = await supabase
        .from('resources')
        .select('id')
        .eq('id', resourceId)
        .eq('user_id', user.id)
        .maybeSingle();
    if (!resource) return { error: 'Recurso não encontrado.' };

    const { error } = await supabase.rpc('delete_resource_and_children', { p_resource_id: resourceId });
    if (error) return { error: "Falha ao apagar o recurso e seus conteúdos.", details: error.message };

    revalidatePath('/biblioteca');
    return { success: true };
}

export async function updateResourceStatus(resourceId: number, status: 'ativo' | 'arquivado') {
    const { supabase, user } = await getAuth();
    if (!user) return { error: 'Usuário não autenticado.' };
    await supabase.from('resources').update({ status }).eq('id', resourceId).eq('user_id', user.id);
    revalidatePath('/biblioteca');
    return { success: true };
}

export async function updateResourcesOrder(updates: {id: number, ordem: number, parent_id: number | null}[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Usuário não autenticado.' };
    if (updates.some(item => item.parent_id === item.id)) {
        return { error: 'Pasta de destino inválida.' };
    }
    const parentIds = new Set(updates.map(item => item.parent_id).filter((parentId): parentId is number => parentId !== null));
    for (const parentId of parentIds) {
        if (!(await isOwnedParent(supabase, 'resources', parentId, user.id))) {
            return { error: 'Pasta de destino inválida.' };
        }
    }

    try {
        const updatePromises = updates.map(item => 
            supabase.from('resources')
                .update({ ordem: item.ordem, parent_id: item.parent_id })
                .eq('id', item.id)
                .eq('user_id', user.id)
        );
        
        const results = await Promise.all(updatePromises);
        const firstError = results.find(res => res.error);
        if (firstError) throw firstError.error;

        revalidatePath('/biblioteca');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        return { error: `Falha ao salvar a nova ordem: ${message}` };
    }
}

// NOVO: Ação para pesquisar documentos e páginas para os links [[...]]
export async function searchDocumentsAndPages(query: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Se a pesquisa estiver vazia, retorna os 5 mais recentes de cada tipo
  if (!query) {
    const [docs, pages] = await Promise.all([
      supabase.from('documentos').select('id, title').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5),
      supabase.from('paginas').select('id, title').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
    ]);

    const combinedResults = [
      ...(docs.data || []).map(d => ({ ...d, type: 'documentos' })),
      ...(pages.data || []).map(p => ({ ...p, type: 'paginas' }))
    ];
    return combinedResults;
  }

  // Se houver uma pesquisa, procura em ambas as tabelas
  const searchTerm = `%${query}%`;
  const [docs, pages] = await Promise.all([
    supabase.from('documentos').select('id, title').eq('user_id', user.id).ilike('title', searchTerm).limit(5),
    supabase.from('paginas').select('id, title').eq('user_id', user.id).ilike('title', searchTerm).limit(5)
  ]);

  if (docs.error || pages.error) {
    console.error("Erro na pesquisa:", docs.error || pages.error);
    return [];
  }

  const combinedResults = [
      ...(docs.data || []).map(d => ({ ...d, type: 'documentos' })),
      ...(pages.data || []).map(p => ({ ...p, type: 'paginas' }))
  ];

  return combinedResults;
}

// --- FUNÇÕES EM FALTA ADICIONADAS PARA CORRIGIR O BUILD ---

export async function updateConcursosOrdem(updates: { id: number, ordem: number }[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Usuário não autenticado.' };

    try {
        const updatePromises = updates.map(item => 
            supabase.from('concursos')
                .update({ ordem: item.ordem })
                .eq('id', item.id)
                .eq('user_id', user.id)
        );
        
        const results = await Promise.all(updatePromises);
        const firstError = results.find(res => res.error);
        if (firstError) throw firstError.error;

        revalidatePath('/guia-estudos');
        return { success: true };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        return { error: `Falha ao salvar a nova ordem: ${message}` };
    }
}

export async function updateAnkiDeck(deckId: number, title: string, cards: Flashcard[]) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Usuário não autenticado.' };
    
    if (!title.trim()) return { error: "O título é obrigatório." };
    if (cards.length === 0) return { error: "Não há flashcards para guardar." };

    const { error } = await supabase
        .from('anki_decks')
        .update({ title, cards })
        .match({ id: deckId, user_id: user.id });

    if (error) {
        return { error: "Falha ao atualizar o deck." };
    }

    revalidatePath('/anki');
    return { success: true };
}

// NOVO: Ação para buscar todos os itens para a Paleta de Comandos
export async function getAllSearchableItems() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const [docs, pages] = await Promise.all([
    supabase.from('documentos').select('id, title').eq('user_id', user.id),
    supabase.from('paginas').select('id, title').eq('user_id', user.id)
  ]);

  if (docs.error || pages.error) {
    console.error("Erro ao buscar itens para a paleta de comandos:", docs.error || pages.error);
    return [];
  }

  const combinedResults = [
      ...(docs.data || []).map(d => ({ ...d, type: 'documentos' })),
      ...(pages.data || []).map(p => ({ ...p, type: 'paginas' }))
  ];

  return combinedResults;
}