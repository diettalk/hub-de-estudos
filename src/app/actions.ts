// src/app/actions.ts
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// SUBSTITUA A SUA FUNÇÃO addConcurso EXISTENTE POR ESTA:
export async function addConcurso(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const nome = formData.get('nome') as string;
  const banca = formData.get('banca') as string;
  const dataProva = formData.get('data_prova') as string;
  const status = formData.get('status') as string;
  const edital_url = formData.get('edital_url') as string;
  // Lógica de prioridades adicionada de volta
  const prioridadesRaw = formData.get('prioridades') as string;
  const prioridades = prioridadesRaw ? prioridadesRaw.split('\n').map(p => p.trim()).filter(p => p.length > 0) : [];

  if (!nome || !banca || !dataProva || !status) return;

  await supabase.from('concursos').insert({ 
    nome, 
    banca, 
    data_prova: dataProva, 
    status,
    edital_url,
    prioridades, // Adicionado
    user_id: user.id 
  });

  revalidatePath('/guia-estudos');
}

// SUBSTITUA A SUA FUNÇÃO updateConcurso EXISTENTE POR ESTA:
export async function updateConcurso(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));
  const nome = formData.get('nome') as string;
  const banca = formData.get('banca') as string;
  const dataProva = formData.get('data_prova') as string;
  const status = formData.get('status') as string;
  const edital_url = formData.get('edital_url') as string;
  // Lógica de prioridades adicionada de volta
  const prioridadesRaw = formData.get('prioridades') as string;
  const prioridades = prioridadesRaw ? prioridadesRaw.split('\n').map(p => p.trim()).filter(p => p.length > 0) : [];

  if (!id || !nome || !banca || !dataProva || !status) return;

  await supabase.from('concursos').update({ 
    nome, 
    banca, 
    data_prova: dataProva, 
    status,
    edital_url,
    prioridades // Adicionado
  }).eq('id', id);

  revalidatePath('/guia-estudos');
}

export async function deleteConcurso(id: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('concursos').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/materiais');
}

// --- AÇÕES DE DISCIPLINA (ANTIGO) ---
export async function addMasterDisciplina(formData: FormData) {
  const nome = formData.get('nome') as string;
  const emoji = formData.get('emoji') as string;
  if (!nome || !emoji) return;
  const supabase = createServerActionClient({ cookies });
  await supabase.from('disciplinas').insert({ nome, emoji });
  revalidatePath('/disciplinas');
}

export async function updateDisciplina(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));
  const nome = formData.get('nome') as string;
  const emoji = formData.get('emoji') as string;
  if (!id || !nome || !emoji) return;
  await supabase.from('disciplinas').update({ nome, emoji }).eq('id', id);
  revalidatePath('/disciplinas');
}

export async function deleteDisciplina(id: number) {
  const supabase = createServerActionClient({ cookies });
  if (isNaN(id)) return;
  await supabase.from('disciplinas').delete().eq('id', id);
  revalidatePath('/disciplinas');
}

// --- AÇÃO DE RELACIONAMENTO DISCIPLINA/CONCURSO ---
export async function toggleDisciplinaConcurso(concursoId: number, disciplinaId: number, isLinked: boolean) {
    const supabase = createServerActionClient({ cookies });
    if (isLinked) {
        await supabase.from('concurso_disciplinas').delete().match({ concurso_id: concursoId, disciplina_id: disciplinaId });
    } else {
        await supabase.from('concurso_disciplinas').insert({ concurso_id: concursoId, disciplina_id: disciplinaId });
    }
    revalidatePath('/materiais');
}

// SUBSTITUA a sua função updateSessaoEstudo existente por esta:

export async function updateSessaoEstudo(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));

  if (isNaN(id)) return { error: 'ID da sessão inválido.' };

  const updateData: { [key: string]: any } = {};
  const formEntries = Object.fromEntries(formData.entries());

  // Copia todos os campos simples do formulário para o objeto de atualização
  // Isso inclui: foco, diario_de_bordo, questoes_acertos, etc.
  for (const key in formEntries) {
    if (key !== 'id' && key !== 'data_estudo' && !key.startsWith('data_revisao')) {
      updateData[key] = formEntries[key];
    }
  }

  // Lógica inteligente de datas
  if (formData.has('data_estudo')) {
    // CASO 1: A DATA DE ESTUDO FOI ALTERADA DIRETAMENTE
    // Isso dispara o recálculo de todas as datas de revisão.
    const dataEstudoStr = formData.get('data_estudo') as string;
    updateData.data_estudo = dataEstudoStr || null;
    
    if (dataEstudoStr) {
      const studyDate = new Date(dataEstudoStr + 'T03:00:00');
      const rev1 = new Date(studyDate); rev1.setDate(studyDate.getDate() + 1);
      updateData.data_revisao_1 = rev1.toISOString().split('T')[0];
      
      const rev7 = new Date(studyDate); rev7.setDate(studyDate.getDate() + 7);
      updateData.data_revisao_2 = rev7.toISOString().split('T')[0];
      
      const rev30 = new Date(studyDate); rev30.setDate(studyDate.getDate() + 30);
      updateData.data_revisao_3 = rev30.toISOString().split('T')[0];
    } else {
      // Se a data de estudo for apagada, limpa as revisões
      updateData.data_revisao_1 = null;
      updateData.data_revisao_2 = null;
      updateData.data_revisao_3 = null;
    }
  } else {
    // CASO 2: AS DATAS DE REVISÃO FORAM ALTERADAS INDIVIDUALMENTE
    // Atualiza apenas as datas que foram enviadas no formulário.
    if (formData.has('data_revisao_1')) updateData.data_revisao_1 = formData.get('data_revisao_1') || null;
    if (formData.has('data_revisao_2')) updateData.data_revisao_2 = formData.get('data_revisao_2') || null;
    if (formData.has('data_revisao_3')) updateData.data_revisao_3 = formData.get('data_revisao_3') || null;
  }

  // Envia a atualização para o Supabase
  const { error } = await supabase.from('sessoes_estudo').update(updateData).eq('id', id);

  if (error) {
    console.error("Erro ao atualizar sessão:", error);
    return { error: error.message };
  }

  // Revalida todas as páginas afetadas
  revalidatePath('/ciclo');
  revalidatePath('/revisoes');
  revalidatePath('/calendario');
}

export async function addSessaoCiclo() {
  const supabase = createServerActionClient({ cookies });
  const { data: ultimaSessao } = await supabase.from('sessoes_estudo').select('hora_no_ciclo').order('hora_no_ciclo', { ascending: false }).limit(1).single();
  const proximaHora = (ultimaSessao?.hora_no_ciclo || 0) + 1;
  await supabase.from('sessoes_estudo').insert({ hora_no_ciclo: proximaHora, foco: 'Nova sessão - Edite o foco e selecione a matéria.' });
  revalidatePath('/ciclo');
}

export async function deleteSessaoCiclo(id: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('sessoes_estudo').delete().eq('id', id);
  revalidatePath('/ciclo');
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

export async function updateRevisaoStatus(sessaoId: number, type: 'R1' | 'R7' | 'R30', status: boolean) {
  const supabase = createServerActionClient({ cookies });
  const fieldToUpdate = type === 'R1' ? 'r1_concluida' : type === 'R7' ? 'r2_concluida' : 'r3_concluida';
  await supabase.from('sessoes_estudo').update({ [fieldToUpdate]: status }).eq('id', sessaoId);
  revalidatePath('/calendario');
  revalidatePath('/revisoes');
}

// --- AÇÕES PARA DOCUMENTOS ---
export async function addDocumento(formData: FormData) {
  const title = formData.get('title') as string;
  if (!title) return;
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('documentos').insert({ title, user_id: user.id, content: '' });
  revalidatePath('/documentos');
}

export async function updateDocumento(formData: FormData) {
  const id = Number(formData.get('id'));
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;
  if (!id) return;
  const supabase = createServerActionClient({ cookies });
  await supabase.from('documentos').update({ title, content }).eq('id', id);
  revalidatePath('/documentos');
}

export async function deleteDocumento(id: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('documentos').delete().eq('id', id);
  revalidatePath('/documentos');
}

// --- AÇÕES PARA TÓPICOS (ANTIGO) ---
export async function addTopico(formData: FormData) {
  const nome = formData.get('nome') as string;
  const disciplinaId = Number(formData.get('disciplina_id'));
  if (!nome || !disciplinaId) return;
  const supabase = createServerActionClient({ cookies });
  await supabase.from('topicos').insert({ nome, disciplina_id: disciplinaId });
  revalidatePath('/disciplinas');
}

export async function saveTopicoContent(topicoId: number, content: string) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('topicos').update({ conteudo_rico: content }).eq('id', topicoId);
}

export async function deleteTopico(id: number) {
  const supabase = createServerActionClient({ cookies });
  if(isNaN(id)) return;
  await supabase.from('topicos').delete().eq('id', id);
  revalidatePath('/disciplinas');
}

export async function updateTopicoAnotacoes(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const topicoId = formData.get('topicoId') as string;
  const anotacoes = formData.get('anotacoes') as string;

  await supabase
    .from('topicos')
    .update({ anotacoes: anotacoes })
    .eq('id', topicoId);
    
  revalidatePath('/disciplinas');
}

// --- AÇÕES PARA TAREFAS ---
export async function addTarefa(formData: FormData) {
  const title = formData.get('title') as string;
  const dueDate = formData.get('due_date') as string;
  if (!title || !dueDate) return;
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('tarefas').insert({ title, due_date: dueDate, user_id: user.id });
  revalidatePath('/tarefas');
  revalidatePath('/calendario');
}

export async function toggleTarefa(id: number, currentState: boolean) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('tarefas').update({ completed: !currentState }).eq('id', id);
  revalidatePath('/tarefas');
  revalidatePath('/calendario');
}

export async function deleteTarefa(id: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('tarefas').delete().eq('id', id);
  revalidatePath('/tarefas');
  revalidatePath('/calendario');
}

// --- AÇÕES DE ANOTAÇÕES RÁPIDAS (DASHBOARD) ---
export async function addAnotacao(formData: FormData) {
  const content = formData.get('content') as string;
  if (!content || content.trim() === '') return;

  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('anotacoes').insert({ content, user_id: user.id });
  revalidatePath('/'); // Revalida o Dashboard para mostrar a nova nota
}

export async function deleteAnotacao(formData: FormData) {
  const id = Number(formData.get('id'));
  if (isNaN(id)) return;

  const supabase = createServerActionClient({ cookies });
  await supabase.from('anotacoes').delete().eq('id', id);
  revalidatePath('/'); // Revalida o Dashboard para remover a nota
}

export async function updateAnotacao(formData: FormData) {
  const id = Number(formData.get('id'));
  const content = formData.get('content') as string;
  if (isNaN(id) || !content || content.trim() === '') return;

  const supabase = createServerActionClient({ cookies });
  await supabase.from('anotacoes').update({ content }).eq('id', id);
  revalidatePath('/');
}

// --- AÇÕES DA BASE DE CONHECIMENTO (PÁGINAS/DISCIPLINAS) ---
export async function createPagina(parentId: number | null, title: string, emoji: string) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado' };

  const { data, error } = await supabase
    .from('paginas')
    .insert({
      title,
      emoji,
      parent_id: parentId,
      user_id: user.id,
    })
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
    .update({ 
      title, 
      emoji,
      content: content ? JSON.parse(content) : null 
    })
    .eq('id', id);

  revalidatePath('/disciplinas');
}

export async function deletePagina(id: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('paginas').delete().eq('id', id);
  revalidatePath('/disciplinas');
}

// ADICIONE ESTA NOVA FUNÇÃO NO FINAL DO ARQUIVO:
export async function updateConcursoStatus(id: number, status: 'ativo' | 'previsto' | 'arquivado') {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('concursos').update({ status }).eq('id', id);
  revalidatePath('/guia-estudos');
}

// --- AÇÕES DE VÍNCULO CONCURSO/PÁGINA ---

export async function linkPastaToConcurso(concursoId: number, paginaId: number) {
  const supabase = createServerActionClient({ cookies });
  
  // Verifica se o vínculo já não existe para evitar duplicatas
  const { data: existingLink } = await supabase
    .from('concurso_paginas')
    .select()
    .match({ concurso_id: concursoId, pagina_id: paginaId })
    .single();

  if (existingLink) return; // Se já existe, não faz nada

  await supabase.from('concurso_paginas').insert({
    concurso_id: concursoId,
    pagina_id: paginaId,
  });

  revalidatePath('/guia-estudos');
}

export async function unlinkPastaFromConcurso(concursoId: number, paginaId: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase
    .from('concurso_paginas')
    .delete()
    .match({ concurso_id: concursoId, pagina_id: paginaId });

  revalidatePath('/guia-estudos');
}