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

// --- AÇÕES DO CICLO DE ESTUDOS ---

// Ação para SALVAR alterações manuais em uma linha (foco, diário, etc.)
export async function updateSessaoEstudo(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));
  if (isNaN(id)) return { error: 'ID da sessão inválido.' };

  const updateData = {
    disciplina_id: formData.get('disciplina_id') ? Number(formData.get('disciplina_id')) : null,
    foco_sugerido: formData.get('foco_sugerido') as string,
    diario_de_bordo: formData.get('diario_de_bordo') as string,
    questoes_acertos: formData.get('questoes_acertos') ? Number(formData.get('questoes_acertos')) : null,
    questoes_total: formData.get('questoes_total') ? Number(formData.get('questoes_total')) : null,
    data_revisao_1: formData.get('data_revisao_1') as string || null,
    data_revisao_2: formData.get('data_revisao_2') as string || null,
    data_revisao_3: formData.get('data_revisao_3') as string || null,
    materia_finalizada: formData.get('materia_finalizada') === 'on',
  };

  await supabase.from('ciclo_sessoes').update(updateData).eq('id', id);
  revalidatePath('/ciclo');
  revalidatePath('/revisoes');
  revalidatePath('/calendario');
}

// Ação dedicada para CONCLUIR a sessão e AUTOMATIZAR as revisões
export async function concluirSessaoEstudo(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));
  if (isNaN(id)) return;

  // Pega os dados da sessão para usar no nome da revisão
  const { data: sessao } = await supabase.from('ciclo_sessoes').select('materia_nome, foco_sugerido').eq('id', id).single();
  if (!sessao) return;

  const studyDate = new Date();
  const rev1 = new Date(studyDate); rev1.setDate(studyDate.getDate() + 1);
  const rev7 = new Date(studyDate); rev7.setDate(studyDate.getDate() + 7);
  const rev30 = new Date(studyDate); rev30.setDate(studyDate.getDate() + 30);

  // 1. Atualiza a sessão no ciclo
  await supabase.from('ciclo_sessoes').update({
    concluida: true,
    data_estudo: studyDate.toISOString().split('T')[0],
    data_revisao_1: rev1.toISOString().split('T')[0],
    data_revisao_2: rev7.toISOString().split('T')[0],
    data_revisao_3: rev30.toISOString().split('T')[0],
  }).eq('id', id);

  // 2. Apaga revisões antigas desta sessão para evitar duplicatas
  await supabase.from('revisoes').delete().eq('ciclo_sessao_id', id);

  // 3. Insere as 3 novas revisões na tabela `revisoes`
  await supabase.from('revisoes').insert([
    { ciclo_sessao_id: id, data_revisao: rev1.toISOString().split('T')[0], tipo_revisao: '24h', materia_nome: sessao.materia_nome, foco_sugerido: sessao.foco_sugerido },
    { ciclo_sessao_id: id, data_revisao: rev7.toISOString().split('T')[0], tipo_revisao: '7 dias', materia_nome: sessao.materia_nome, foco_sugerido: sessao.foco_sugerido },
    { ciclo_sessao_id: id, data_revisao: rev30.toISOString().split('T')[0], tipo_revisao: '30 dias', materia_nome: sessao.materia_nome, foco_sugerido: sessao.foco_sugerido },
  ]);

  revalidatePath('/ciclo');
  revalidatePath('/revisoes');
  revalidatePath('/calendario');
}

// Ação para ADICIONAR uma nova linha
export async function addSessaoCiclo() {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: ultimaSessao } = await supabase.from('ciclo_sessoes').select('ordem').eq('user_id', user.id).order('ordem', { ascending: false }).limit(1).single();
  const proximaOrdem = (ultimaSessao?.ordem || 0) + 1;
  await supabase.from('ciclo_sessoes').insert({ ordem: proximaOrdem, materia_nome: 'Nova Matéria', user_id: user.id });
  revalidatePath('/ciclo');
}

// Ação para DELETAR uma linha
export async function deleteSessaoCiclo(formData: FormData) {
  const id = Number(formData.get('id'));
  if(isNaN(id)) return;
  const supabase = createServerActionClient({ cookies });
  await supabase.from('ciclo_sessoes').delete().eq('id', id);
  revalidatePath('/ciclo');
}

// Ação para popular o ciclo com seus dados da Fase 1
export async function seedFase1Ciclo() {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { count } = await supabase.from('ciclo_sessoes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  if (count && count > 0) return { message: 'O ciclo já possui dados. Ação abortada para evitar duplicatas.' };

  const fase1Template = [
    { ordem: 1, materia_nome: 'LP', foco_sugerido: '1.1 Interpretação de Textos: Análise de textos complexos (jornalísticos).' },
    { ordem: 2, materia_nome: 'G.GOV', foco_sugerido: '(Eixo 1) 1.1 Ferramentas de gestão: Balanced Scorecard (BSC).' },
    { ordem: 3, materia_nome: 'G.GOV', foco_sugerido: '(Eixo 1) 1.2 Matriz SWOT.' },
    { ordem: 4, materia_nome: 'RLM', foco_sugerido: '2.1 Lógica Proposicional: Estruturas lógicas, conectivos.' },
    { ordem: 5, materia_nome: 'P.PUB', foco_sugerido: '(Eixo 2) 1.1 Tipos de políticas públicas: distributivas, regulatórias e redistributivas.' },
    { ordem: 6, materia_nome: 'SAÚDE/SOCIAL', foco_sugerido: '(Eixo 3) 3.1 Estrutura e organização do Sistema Único de Saúde.' },
    { ordem: 7, materia_nome: 'LP', foco_sugerido: '1.5 Morfossintaxe: Emprego das classes de palavras.' },
    { ordem: 8, materia_nome: 'G.GOV', foco_sugerido: '(Eixo 1) 2. Gestão de pessoas: Liderança e gerenciamento de conflitos.' },
    { ordem: 9, materia_nome: 'ADM.PÚB', foco_sugerido: '(Gerais) 7.1 Princípios constitucionais da administração pública (art. 37).' },
    { ordem: 10, materia_nome: 'RLM', foco_sugerido: '2.1 Lógica Proposicional: Tabela-verdade, negação e equivalências.' },
    { ordem: 11, materia_nome: 'P.PUB', foco_sugerido: '(Eixo 2) 4. Políticas Públicas e suas fases: formação da agenda e formulação.' },
    { ordem: 12, materia_nome: 'G.GOV', foco_sugerido: '(Eixo 1) 3. Gestão de projetos: conceitos básicos e processos do PMBOK.' },
    { ordem: 13, materia_nome: 'LP', foco_sugerido: '1.3 Semântica e Vocabulário: Sinonímia, antonímia, polissemia.' },
    { ordem: 14, materia_nome: 'P.PUB', foco_sugerido: '(Eixo 2) 4. Políticas Públicas e suas fases: implementação, monitoramento e avaliação.' },
    { ordem: 15, materia_nome: 'SAÚDE/SOCIAL', foco_sugerido: '(Eixo 3) 3.8 Legislação do SUS: Lei nº 8.080/1990 (Parte 1).' },
    { ordem: 16, materia_nome: 'RLM', foco_sugerido: '2.2 Análise Combinatória.' },
    { ordem: 17, materia_nome: 'P.PUB', foco_sugerido: '(Eixo 2) 5.1 Ações afirmativas e competências para atuação com diversidade.' },
    { ordem: 18, materia_nome: 'G.GOV', foco_sugerido: '(Eixo 1) 8. Contratações Públicas (Lei nº 14.133/2021): Abrangência e princípios.' },
    { ordem: 19, materia_nome: 'LP', foco_sugerido: '1.4 Coesão e Coerência: Mecanismos e conectores.' },
    { ordem: 20, materia_nome: 'G.GOV', foco_sugerido: '(Eixo 1) 4. Gestão de riscos: princípios, objetos e técnicas.' },
    { ordem: 21, materia_nome: 'ADM.PÚB', foco_sugerido: '(Gerais) 8.4 Noções de orçamento público: PPA, LDO e LOA.' },
    { ordem: 22, materia_nome: 'RLM', foco_sugerido: '2.2 Probabilidade.' },
    { ordem: 23, materia_nome: 'P.PUB', foco_sugerido: '(Gerais) 3.2 Ciclos de políticas públicas (reforço).' },
    { ordem: 24, materia_nome: 'SAÚDE/SOCIAL', foco_sugerido: '(Eixo 3) 3.8 Legislação do SUS: Lei nº 8.080/1990 (Parte 2).' },
    { ordem: 25, materia_nome: 'LP', foco_sugerido: '1.5 Morfossintaxe: Concordância verbal e nominal.' },
    { ordem: 26, materia_nome: 'G.GOV', foco_sugerido: '(Eixo 1) 5.4 Lei Geral de Proteção de Dados Pessoais – LGPD.' },
    { ordem: 27, materia_nome: 'P.PUB', foco_sugerido: '(Gerais) 1.1 Introdução às políticas públicas: conceitos e tipologias (reforço).' },
    { ordem: 28, materia_nome: 'DH', foco_sugerido: '(Eixo 4) 1.1 Normas e acordos internacionais: Declaração Universal dos Direitos Humanos (1948).' },
    { ordem: 29, materia_nome: 'P.PUB', foco_sugerido: '(Eixo 2) 2.1 Poder, racionalidade, discricionariedade na implementação de políticas.' },
    { ordem: 30, materia_nome: 'SAÚDE/SOCIAL', foco_sugerido: '(Eixo 3) 10. Segurança Alimentar. Lei Orgânica de Segurança Alimentar e Nutricional (LOSAN).' },
    { ordem: 31, materia_nome: 'LP', foco_sugerido: '1.5 Morfossintaxe: Regência verbal e nominal; Crase.' },
    { ordem: 32, materia_nome: 'G.GOV', foco_sugerido: '(Gerais) 5.2 Governança pública e sistemas de governança (Decreto nº 9.203).' },
    { ordem: 33, materia_nome: 'ADM.PÚB', foco_sugerido: '(Gerais) 7.3 Agentes públicos: Regime Jurídico Único (Lei nº 8.112/1990).' },
    { ordem: 34, materia_nome: 'RLM', foco_sugerido: '2.3 Matemática Básica: Problemas com porcentagem e regra de três.' },
    { ordem: 35, materia_nome: 'P.PUB', foco_sugerido: '(Eixo 2) 3. Teorias e modelos de análise contemporâneos de políticas públicas.' },
    { ordem: 36, materia_nome: 'SAÚDE/SOCIAL', foco_sugerido: '(Eixo 3) 3.9 Redes de Atenção à Saúde (RAS).' },
    { ordem: 37, materia_nome: 'PESQUISA', foco_sugerido: '(Eixo 5) 4. Avaliação de políticas públicas: Tipos e componentes.' },
    { ordem: 38, materia_nome: 'REVISÃO GERAL', foco_sugerido: 'Revisão da Semana (Mapas Mentais, Flashcard' },
  ];

  const sessoesParaInserir = fase1Template.map(sessao => ({
    ...sessao,
    user_id: user.id
  }));

  await supabase.from('ciclo_sessoes').insert(sessoesParaInserir);
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