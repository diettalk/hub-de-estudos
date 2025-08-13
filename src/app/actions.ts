// src/app/actions.ts

'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { add } from 'date-fns';
import { type SessaoEstudo } from '@/lib/types';

// --- AÇÕES DE CONCURSOS ---
export async function addConcurso(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
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
  const supabase = createServerActionClient({ cookies });
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
  }).eq('id', id);

  revalidatePath('/guia-estudos');
}

export async function updateConcursoStatus(id: number, status: 'ativo' | 'previsto' | 'arquivado') {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('concursos').update({ status }).eq('id', id);
  revalidatePath('/guia-estudos');
}

export async function deleteConcurso(id: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('concursos').delete().eq('id', id);
  revalidatePath('/guia-estudos');
}

// --- AÇÕES DE DISCIPLINAS ---
export async function createPagina(parentId: number | null, title: string, emoji: string) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado' };

  const { data, error } = await supabase
    .from('paginas')
    .insert({ title, emoji, parent_id: parentId, user_id: user.id })
    .select()
    .single();

  if (error) return { error: error.message };
  
  revalidatePath('/disciplinas');
  return { data };
}

export async function updatePagina(formData: FormData) {
  const id = Number(formData.get('id'));
  const title = formData.get('title') as string;
  const emoji = formData.get('emoji') as string;
  const content = formData.get('content') as string;

  if (isNaN(id)) return;

  const supabase = createServerActionClient({ cookies });
  await supabase
    .from('paginas')
    .update({ title, emoji, content: content ? JSON.parse(content) : null })
    .eq('id', id);

  revalidatePath('/disciplinas');
}

export async function deletePagina(id: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('paginas').delete().eq('id', id);
  revalidatePath('/disciplinas');
}

// --- AÇÕES DE VÍNCULO ---
export async function linkPastaToConcurso(concursoId: number, paginaId: number) {
  const supabase = createServerActionClient({ cookies });
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
  const supabase = createServerActionClient({ cookies });
  await supabase.from('concurso_paginas').delete().match({ concurso_id: concursoId, pagina_id: paginaId });
  revalidatePath('/guia-estudos');
}

// --- AÇÕES DO CICLO DE ESTUDOS ---
export async function updateSessaoEstudo(sessaoData: Partial<SessaoEstudo> & { id: number }) {
  const supabase = createServerActionClient({ cookies });
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

  const { error } = await supabase.from('ciclo_sessoes').update(updateData).eq('id', id);
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

  const supabase = createServerActionClient({ cookies });
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
      }).eq('id', sessaoId);
      
      await Promise.all([
        supabase.from('revisoes').update({ data_revisao: rev1.toISOString().split('T')[0] }).match({ ciclo_sessao_id: sessaoId, tipo_revisao: '24h' }),
        supabase.from('revisoes').update({ data_revisao: rev7.toISOString().split('T')[0] }).match({ ciclo_sessao_id: sessaoId, tipo_revisao: '7 dias' }),
        supabase.from('revisoes').update({ data_revisao: rev30.toISOString().split('T')[0] }).match({ ciclo_sessao_id: sessaoId, tipo_revisao: '30 dias' })
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
      }).eq('id', sessaoId);

      await supabase.from('revisoes').update({ 
        data_revisao: dataFormatada.toISOString().split('T')[0] 
      }).match({ 
        ciclo_sessao_id: sessaoId, 
        tipo_revisao: infoRevisao.tipo 
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
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || isNaN(sessaoId)) {
    return { error: 'Ação inválida ou usuário não autenticado.' };
  }

  try {
    if (isCompleting) {
      const studyDate = new Date();
      const { data: sessao, error: sessaoError } = await supabase
        .from('ciclo_sessoes').select('disciplina_id, foco_sugerido, materia_nome')
        .eq('id', sessaoId).single();
      if (sessaoError) throw new Error(`Falha ao buscar sessão: ${sessaoError.message}`);
      if (!sessao) throw new Error('Sessão de estudo não encontrada.');

      const rev1 = add(studyDate, { days: 1 });
      const rev7 = add(studyDate, { days: 7 });
      const rev30 = add(studyDate, { days: 30 });
      
      await supabase.from('ciclo_sessoes').update({
        concluida: true, data_estudo: studyDate.toISOString(),
        data_revisao_1: rev1.toISOString(), data_revisao_2: rev7.toISOString(), data_revisao_3: rev30.toISOString(),
      }).eq('id', sessaoId);
      
      await supabase.from('revisoes').delete().eq('ciclo_sessao_id', sessaoId);

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
      }).eq('id', sessaoId);
      await supabase.from('revisoes').delete().eq('ciclo_sessao_id', sessaoId);
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
  const supabase = createServerActionClient({ cookies });
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
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: ultimaSessao } = await supabase.from('ciclo_sessoes').select('ordem').eq('user_id', user.id).order('ordem', { ascending: false }).limit(1).single();
  const proximaOrdem = (ultimaSessao?.ordem || 0) + 1;
  await supabase.from('ciclo_sessoes').insert({ ordem: proximaOrdem, user_id: user.id });
  revalidatePath('/ciclo');
}

export async function deleteSessaoCiclo(id: number) {
  const supabase = createServerActionClient({ cookies });
  if (isNaN(id)) return;
  await supabase.from('ciclo_sessoes').delete().eq('id', id);
  revalidatePath('/ciclo');
}

export async function toggleFinalizarSessao(sessaoId: number, novoStatus: boolean) {
  const supabase = createServerActionClient({ cookies });
  if (isNaN(sessaoId)) return { error: 'ID da sessão inválido.' };

  try {
    if (novoStatus) {
      await supabase.from('ciclo_sessoes').update({ 
        materia_finalizada: true,
        concluida: false,
        data_estudo: null, 
        data_revisao_1: null, 
        data_revisao_2: null, 
        data_revisao_3: null,
      }).eq('id', sessaoId);
      
      await supabase.from('revisoes').delete().eq('ciclo_sessao_id', sessaoId);
    } else {
      await supabase.from('ciclo_sessoes').update({ materia_finalizada: false }).eq('id', sessaoId);
    }
    
    revalidatePath('/ciclo');
    revalidatePath('/revisoes');
    revalidatePath('/calendario');
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro ao finalizar sessão:", errorMessage);
    return { error: errorMessage };
  }
}

// --- AÇÕES DO CALENDÁRIO ---
export async function addLembrete(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const titulo = formData.get('titulo') as string;
  const data = formData.get('data') as string;
  const cor = formData.get('cor') as string;
  if (!titulo || !data) return;
  await supabase.from('lembretes').insert({ titulo, data, cor });
  revalidatePath('/calendario');
}

export async function updateLembrete(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));
  const titulo = formData.get('titulo') as string;
  const cor = formData.get('cor') as string;
  if(!id || !titulo) return;
  await supabase.from('lembretes').update({ titulo, cor }).eq('id', id);
  revalidatePath('/calendario');
}

export async function deleteLembrete(id: number) {
  const supabase = createServerActionClient({ cookies });
  if(isNaN(id)) return;
  await supabase.from('lembretes').delete().eq('id', id);
  revalidatePath('/calendario');
}

export async function updateRevisaoStatus(revisaoId: number, status: boolean) {
    const supabase = createServerActionClient({ cookies });
    const { error } = await supabase.from('revisoes').update({ concluida: status }).eq('id', revisaoId);
    if (error) return { error: error.message };
    revalidatePath('/revisoes');
    revalidatePath('/calendario');
    return { success: true };
}

// --- AÇÕES PARA DOCUMENTOS (CORRIGIDO) ---

// CORRIGIDO: A função agora aceita FormData para ser compatível com o componente da barra lateral.
export async function addDocumento(formData: FormData) {
  const title = formData.get('title') as string;
  const parentIdValue = formData.get('parent_id') as string | null;
  const parentId = parentIdValue ? Number(parentIdValue) : null;

  if (!title || title.trim() === '') {
    return { error: 'O título é obrigatório.' };
  }

  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'Usuário não autenticado.' };
  }

  const { data, error } = await supabase
    .from('documentos')
    .insert({
      title,
      user_id: user.id,
      content: null, // Documentos são criados sem conteúdo inicial
      parent_id: parentId,
    })
    .select('id') // Retorna o ID do novo documento
    .single();

  if (error) {
    console.error("Erro ao adicionar documento:", error);
    return { error: error.message };
  }

  revalidatePath('/documentos');
  return { data }; // Retorna { data: { id: new_id } } para o cliente
}

// NOVO: Criada a função 'updateDocumentoContent' que estava faltando e era importada na página.
// Esta é a função que o Editor principal usa para salvar.
export async function updateDocumentoContent(formData: FormData) {
  const id = Number(formData.get('id'));
  const title = formData.get('title') as string;
  const contentJSON = formData.get('content') as string;

  if (!id) {
    return { error: "ID do documento é necessário." };
  }
  if (!title) {
    return { error: "O título não pode ser vazio." };
  }

  const supabase = createServerActionClient({ cookies });

  try {
    // Tiptap gera um JSON. O banco espera um JSONB.
    const contentToSave = contentJSON ? JSON.parse(contentJSON) : null;
    const { error } = await supabase
      .from('documentos')
      .update({ title, content: contentToSave })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/documentos');
    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
    console.error("Erro ao atualizar conteúdo do documento:", errorMessage);
    return { error: `Falha ao salvar: ${errorMessage}` };
  }
}

// MANTIDO: A função de deleção já usa o RPC e está correta.
export async function deleteDocumento(id: number) {
  if (isNaN(id)) {
    return { error: "ID inválido." };
  }

  const supabase = createServerActionClient({ cookies });
  // Chama a função SQL 'delete_documento_e_filhos' que deleta em cascata.
  const { error } = await supabase.rpc('delete_documento_e_filhos', { doc_id: id });

  if (error) {
    console.error("Erro ao deletar documento:", error);
    return { error: error.message };
  }

  revalidatePath('/documentos');
  return { success: true };
}


// --- AÇÕES PARA TAREFAS ---
export async function addTarefa(formData: FormData) {
  const title = formData.get('title') as string;
  const dueDate = formData.get('due_date') as string;
  if (!title) return;
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('tarefas').insert({ title, due_date: dueDate || null, user_id: user.id });
  revalidatePath('/tarefas');
}

export async function toggleTarefa(id: number, currentState: boolean) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('tarefas').update({ completed: !currentState }).eq('id', id);
  revalidatePath('/tarefas');
}

export async function deleteTarefa(id: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('tarefas').delete().eq('id', id);
  revalidatePath('/tarefas');
}

// --- AÇÕES DE ANOTAÇÕES RÁPIDAS (DASHBOARD) ---
export async function addAnotacao(formData: FormData) {
  const content = formData.get('content') as string;
  if (!content || content.trim() === '') return;

  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('anotacoes').insert({ content, user_id: user.id });
  revalidatePath('/');
}

export async function updateAnotacao(formData: FormData) {
  const id = Number(formData.get('id'));
  const content = formData.get('content') as string;
  if (isNaN(id) || !content || content.trim() === '') return;

  const supabase = createServerActionClient({ cookies });
  await supabase.from('anotacoes').update({ content }).eq('id', id);
  revalidatePath('/');
}

export async function deleteAnotacao(formData: FormData) {
  const id = Number(formData.get('id'));
  if (isNaN(id)) return;

  const supabase = createServerActionClient({ cookies });
  await supabase.from('anotacoes').delete().eq('id', id);
  revalidatePath('/');
}

// Adicione esta função no final de src/app/actions.ts

// ==================================================================
// --- AÇÕES DE PERFIL ---
// ==================================================================
export async function updateProfile({ id, fullName, avatarUrl }: { id: string, fullName: string, avatarUrl: string | null }) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.id !== id) {
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
  
  revalidatePath('/perfil'); // Atualiza os dados na página de perfil
  revalidatePath('/'); // Atualiza a sidebar em todas as páginas
  return { success: true };
}

// ==================================================================
// --- AÇÃO PARA REORDENAR CONCURSOS ---
// ==================================================================
export async function updateConcursosOrdem(orderedIds: number[]) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

  try {
    // O 'map' cria uma série de promessas de atualização
    const updatePromises = orderedIds.map((id, index) =>
      supabase
        .from('concursos')
        .update({ ordem: index }) // Atualiza a coluna 'ordem' com a nova posição
        .eq('id', id)
        .eq('user_id', user.id)
    );

    // Executa todas as promessas de atualização em paralelo
    await Promise.all(updatePromises);

    revalidatePath('/guia-estudos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { error: `Falha ao salvar a ordem: ${message}` };
  }
}

// Adicione este bloco de código ao seu arquivo src/app/actions.ts

// ==================================================================
// --- AÇÕES GENÉRICAS PARA HIERARQUIA (DOCUMENTOS E DISCIPLINAS) ---
// ==================================================================

type NewItemData = {
  title: string;
  user_id: string;
  parent_id: number | null;
  content: JSONContent;
  emoji?: string;
};

export async function createItem(table: 'documentos' | 'paginas', parentId: number | null) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

  const newItemData: NewItemData = {
    title: 'Novo Item',
    user_id: user.id,
    parent_id: parentId,
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
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
    return { error: `Falha ao criar: ${message}` };
  }
}

export async function updateItemTitle(table: 'documentos' | 'paginas', id: number, newTitle: string) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

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
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath(table === 'paginas' ? '/disciplinas' : '/documentos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { error: `Falha ao deletar: ${message}` };
  }
}

export async function updateItemParent(table: 'documentos' | 'paginas', itemId: number, newParentId: number | null) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

  try {
    const { error } = await supabase
      .from(table)
      .update({ parent_id: newParentId })
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath(table === 'paginas' ? '/disciplinas' : '/documentos');
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return { error: `Falha ao mover: ${message}` };
  }
}

// ==================================================================
// --- AÇÕES PARA GERADOR DE ANKI ---
// ==================================================================
export async function generateAnkiCards(formData: FormData) {
  const sourceText = formData.get('sourceText') as string;
  const numCards = Number(formData.get('numCards'));

  const { data: { user } } = await createServerActionClient({ cookies }).auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

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
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Erro na API: ${response.statusText} - ${errorBody}`);
    }

    const result = await response.json();
    const text = result.candidates[0].content.parts[0].text;
    const parsedJson = JSON.parse(text);

    return { data: parsedJson.cards };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ocorreu um erro desconhecido.";
    return { error: `Falha ao gerar flashcards: ${message}` };
  }
}

export async function saveAnkiDeck(title: string, cards: Flashcard[]) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };
  if (!title.trim()) return { error: "O título é obrigatório." };
  if (cards.length === 0) return { error: "Não há flashcards para guardar." };

  const { data, error } = await supabase.from('anki_decks').insert({ title, cards, user_id: user.id }).select('id').single();
  if (error) return { error: "Falha ao guardar o deck de flashcards." };
  
  revalidatePath('/anki');
  return { success: true, newDeckId: data.id };
}

// ADICIONADO: A função para apagar o deck que estava em falta
export async function deleteAnkiDeck(deckId: number) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

  const { error } = await supabase.from('anki_decks').delete().match({ id: deckId, user_id: user.id });

  if (error) {
    return { error: "Falha ao apagar o deck." };
  }

  revalidatePath('/anki');
  return { success: true };
}
