// src/app/actions.ts
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// --- AÇÕES DE CONCURSOS (GUIA DE ESTUDOS) ---
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
    nome, 
    banca, 
    data_prova: dataProva, 
    status,
    edital_url,
    prioridades,
    user_id: user.id 
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
    nome, 
    banca, 
    data_prova: dataProva, 
    status,
    edital_url,
    prioridades
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

// --- AÇÕES DA BASE DE CONHECIMENTO (PÁGINAS/DISCIPLINAS) ---
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

// --- AÇÕES DE VÍNCULO CONCURSO/PÁGINA ---
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

// SUBSTITUA AS FUNÇÕES DO CICLO DE ESTUDOS POR ESTAS 3:

export async function updateSessaoEstudo(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));
  if (isNaN(id)) return;

  const updateData = {
    foco: formData.get('foco') as string,
    diario_de_bordo: formData.get('diario_de_bordo') as string,
    questoes_acertos: formData.get('questoes_acertos') ? Number(formData.get('questoes_acertos')) : null,
    questoes_total: formData.get('questoes_total') ? Number(formData.get('questoes_total')) : null,
    disciplina_id: formData.get('disciplina_id') ? Number(formData.get('disciplina_id')) : null,
    data_estudo: formData.get('data_estudo') as string || null,
    data_revisao_1: formData.get('data_revisao_1') as string || null,
    data_revisao_2: formData.get('data_revisao_2') as string || null,
    data_revisao_3: formData.get('data_revisao_3') as string || null,
    materia_finalizada: formData.get('materia_finalizada') === 'on',
  };
  
  await supabase.from('sessoes_estudo').update(updateData).eq('id', id);
  
  revalidatePath('/ciclo');
  revalidatePath('/revisoes');
  revalidatePath('/calendario');
}

// NOVA AÇÃO dedicada a CONCLUIR a sessão e AUTOMATIZAR as revisões.
export async function concluirSessaoEstudo(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));
  if (isNaN(id)) return;
  
  const studyDate = new Date();
  const rev1 = new Date(studyDate); rev1.setDate(studyDate.getDate() + 1);
  const rev7 = new Date(studyDate); rev7.setDate(studyDate.getDate() + 7);
  const rev30 = new Date(studyDate); rev30.setDate(studyDate.getDate() + 30);
  
  const updateData = {
    concluido: true,
    data_estudo: studyDate.toISOString().split('T')[0],
    data_revisao_1: rev1.toISOString().split('T')[0], r1_concluida: false,
    data_revisao_2: rev7.toISOString().split('T')[0], r2_concluida: false,
    data_revisao_3: rev30.toISOString().split('T')[0], r3_concluida: false,
  };

  await supabase.from('sessoes_estudo').update(updateData).eq('id', id);

  revalidatePath('/ciclo');
  revalidatePath('/revisoes');
  revalidatePath('/calendario');
}

// Ação para ADICIONAR uma nova linha
export async function addSessaoCiclo() {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: ultimaSessao } = await supabase.from('sessoes_estudo').select('hora_no_ciclo').eq('user_id', user.id).order('hora_no_ciclo', { ascending: false }).limit(1).single();
  const proximaHora = (ultimaSessao?.hora_no_ciclo || 0) + 1;
  await supabase.from('sessoes_estudo').insert({ hora_no_ciclo: proximaHora, foco: 'Nova sessão', user_id: user.id });
  revalidatePath('/ciclo');
}

// Ação para DELETAR uma linha
export async function deleteSessaoCiclo(formData: FormData) {
    const id = Number(formData.get('id'));
    if(isNaN(id)) return;
    const supabase = createServerActionClient({ cookies });
    await supabase.from('sessoes_estudo').delete().eq('id', id);
    revalidatePath('/ciclo');
}

// Ação para popular o ciclo com seus dados da Fase 1
export async function seedFase1Ciclo() {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { count } = await supabase.from('sessoes_estudo').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  if (count && count > 0) return { message: 'O ciclo já possui dados. Ação abortada para evitar duplicatas.' };
  
  // Assume que sua tabela 'disciplinas' tem uma coluna 'sigla'
  const { data: disciplinas } = await supabase.from('disciplinas').select('id, sigla');
  if (!disciplinas) return { error: 'Disciplinas com siglas não encontradas. Verifique se elas possuem uma coluna "sigla".' };
  
  const disciplinaMap = new Map(disciplinas.map(d => [d.sigla, d.id]));

  const fase1Template = [
    { hora_no_ciclo: 1, materia_sigla: 'LP', foco: '1.1 Interpretação de Textos: Análise de textos complexos (jornalísticos).' },
    { hora_no_ciclo: 2, materia_sigla: 'G.GOV', foco: '(Eixo 1) 1.1 Ferramentas de gestão: Balanced Scorecard (BSC).' },
    // ... todas as 38 linhas da sua lista
    { hora_no_ciclo: 38, materia_sigla: 'REVISÃO GERAL', foco: 'Revisão da Semana (Mapas Mentais, Flashcards)', },
  ];

  const sessoesParaInserir = fase1Template.map(sessao => ({
    hora_no_ciclo: sessao.hora_no_ciclo,
    foco: sessao.foco,
    user_id: user.id,
    disciplina_id: disciplinaMap.get(sessao.materia_sigla) || null,
  }));

  await supabase.from('sessoes_estudo').insert(sessoesParaInserir);
  revalidatePath('/ciclo');
  return { message: 'Ciclo Fase 1 criado com sucesso!' };
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

// --- AÇÕES DE DISCIPLINA E TÓPICOS (OBSOLETOS) ---
// Estas funções foram substituídas pela Base de Conhecimento (páginas)
// Recomenda-se remover no futuro para limpar o código.
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