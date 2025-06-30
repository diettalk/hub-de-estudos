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
export async function updateSessaoEstudo(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));
  if (isNaN(id)) return { error: 'ID da sessão inválido.' };

  const updateData: { [key: string]: any } = {};
  
  const concluido = formData.get('concluido') === 'on';
  const dataEstudoAtual = formData.get('data_estudo_atual') as string;
  
  // Atualiza todos os campos da linha
  updateData.foco = formData.get('foco');
  updateData.diario_de_bordo = formData.get('diario_de_bordo');
  updateData.questoes_acertos = formData.get('questoes_acertos') ? Number(formData.get('questoes_acertos')) : null;
  updateData.questoes_total = formData.get('questoes_total') ? Number(formData.get('questoes_total')) : null;
  updateData.disciplina_id = formData.get('disciplina_id') ? Number(formData.get('disciplina_id')) : null;
  updateData.data_estudo = formData.get('data_estudo') || null;
  updateData.concluido = concluido;
  
  // A LÓGICA DE AUTOMAÇÃO
  if (concluido && !dataEstudoAtual) {
    // Cenário: "OK" marcado pela 1ª vez. Define data de estudo para HOJE e calcula revisões.
    const studyDate = new Date();
    updateData.data_estudo = studyDate.toISOString().split('T')[0];
    
    const rev1 = new Date(studyDate); rev1.setDate(studyDate.getDate() + 1);
    updateData.data_revisao_1 = rev1.toISOString().split('T')[0];
    updateData.r1_concluida = false;

    const rev7 = new Date(studyDate); rev7.setDate(studyDate.getDate() + 7);
    updateData.data_revisao_2 = rev7.toISOString().split('T')[0];
    updateData.r2_concluida = false;

    const rev30 = new Date(studyDate); rev30.setDate(studyDate.getDate() + 30);
    updateData.data_revisao_3 = rev30.toISOString().split('T')[0];
    updateData.r3_concluida = false;
  } else {
    // Se não for o primeiro "OK", apenas salva as datas como estão no formulário
    updateData.data_revisao_1 = formData.get('data_revisao_1') || null;
    updateData.data_revisao_2 = formData.get('data_revisao_2') || null;
    updateData.data_revisao_3 = formData.get('data_revisao_3') || null;
  }
  
  await supabase.from('sessoes_estudo').update(updateData).eq('id', id);
  
  revalidatePath('/ciclo');
  revalidatePath('/revisoes');
  revalidatePath('/calendario');
}

export async function addSessaoCiclo() {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: ultimaSessao } = await supabase.from('sessoes_estudo').select('hora_no_ciclo').eq('user_id', user.id).order('hora_no_ciclo', { ascending: false }).limit(1).single();
  const proximaHora = (ultimaSessao?.hora_no_ciclo || 0) + 1;
  await supabase.from('sessoes_estudo').insert({ hora_no_ciclo: proximaHora, foco: 'Nova sessão', user_id: user.id });
  revalidatePath('/ciclo');
}

export async function deleteSessaoCiclo(formData: FormData) {
  const id = Number(formData.get('id'));
  if(isNaN(id)) return;
  const supabase = createServerActionClient({ cookies });
  await supabase.from('sessoes_estudo').delete().eq('id', id);
  revalidatePath('/ciclo');
}

// Popula o ciclo com seus dados da Fase 1
export async function seedFase1Ciclo() {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { count } = await supabase.from('sessoes_estudo').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  if (count && count > 0) return { message: 'O ciclo já possui dados. Ação abortada para evitar duplicatas.' };
  
  const { data: disciplinas } = await supabase.from('disciplinas').select('id, sigla');
  if (!disciplinas) return { error: 'Disciplinas com siglas não encontradas. Verifique se elas possuem uma coluna "sigla".' };
  
  const disciplinaMap = new Map(disciplinas.map(d => [d.sigla, d.id]));

  const fase1Template = [
    { hora_no_ciclo: 1, materia_sigla: 'LP', foco: '1.1 Interpretação de Textos: Análise de textos complexos (jornalísticos).' },
    { hora_no_ciclo: 2, materia_sigla: 'G.GOV', foco: '(Eixo 1) 1.1 Ferramentas de gestão: Balanced Scorecard (BSC).' },
    { hora_no_ciclo: 3, materia_sigla: 'G.GOV', foco: '(Eixo 1) 1.2 Matriz SWOT.' },
    { hora_no_ciclo: 4, materia_sigla: 'RLM', foco: '2.1 Lógica Proposicional: Estruturas lógicas, conectivos.' },
    { hora_no_ciclo: 5, materia_sigla: 'P.PUB', foco: '(Eixo 2) 1.1 Tipos de políticas públicas: distributivas, regulatórias e redistributivas.' },
    { hora_no_ciclo: 6, materia_sigla: 'SAÚDE/SOCIAL', foco: '(Eixo 3) 3.1 Estrutura e organização do Sistema Único de Saúde.' },
    { hora_no_ciclo: 7, materia_sigla: 'LP', foco: '1.5 Morfossintaxe: Emprego das classes de palavras.' },
    { hora_no_ciclo: 8, materia_sigla: 'G.GOV', foco: '(Eixo 1) 2. Gestão de pessoas: Liderança e gerenciamento de conflitos.' },
    { hora_no_ciclo: 9, materia_sigla: 'ADM.PÚB', foco: '(Gerais) 7.1 Princípios constitucionais da administração pública (art. 37).' },
    { hora_no_ciclo: 10, materia_sigla: 'RLM', foco: '2.1 Lógica Proposicional: Tabela-verdade, negação e equivalências.' },
    { hora_no_ciclo: 11, materia_sigla: 'P.PUB', foco: '(Eixo 2) 4. Políticas Públicas e suas fases: formação da agenda e formulação.' },
    { hora_no_ciclo: 12, materia_sigla: 'G.GOV', foco: '(Eixo 1) 3. Gestão de projetos: conceitos básicos e processos do PMBOK.' },
    { hora_no_ciclo: 13, materia_sigla: 'LP', foco: '1.3 Semântica e Vocabulário: Sinonímia, antonímia, polissemia.' },
    { hora_no_ciclo: 14, materia_sigla: 'P.PUB', foco: '(Eixo 2) 4. Políticas Públicas e suas fases: implementação, monitoramento e avaliação.' },
    { hora_no_ciclo: 15, materia_sigla: 'SAÚDE/SOCIAL', foco: '(Eixo 3) 3.8 Legislação do SUS: Lei nº 8.080/1990 (Parte 1).' },
    { hora_no_ciclo: 16, materia_sigla: 'RLM', foco: '2.2 Análise Combinatória.' },
    { hora_no_ciclo: 17, materia_sigla: 'P.PUB', foco: '(Eixo 2) 5.1 Ações afirmativas e competências para atuação com diversidade.' },
    { hora_no_ciclo: 18, materia_sigla: 'G.GOV', foco: '(Eixo 1) 8. Contratações Públicas (Lei nº 14.133/2021): Abrangência e princípios.' },
    { hora_no_ciclo: 19, materia_sigla: 'LP', foco: '1.4 Coesão e Coerência: Mecanismos e conectores.' },
    { hora_no_ciclo: 20, materia_sigla: 'G.GOV', foco: '(Eixo 1) 4. Gestão de riscos: princípios, objetos e técnicas.' },
    { hora_no_ciclo: 21, materia_sigla: 'ADM.PÚB', foco: '(Gerais) 8.4 Noções de orçamento público: PPA, LDO e LOA.' },
    { hora_no_ciclo: 22, materia_sigla: 'RLM', foco: '2.2 Probabilidade.' },
    { hora_no_ciclo: 23, materia_sigla: 'P.PUB', foco: '(Gerais) 3.2 Ciclos de políticas públicas (reforço).', },
    { hora_no_ciclo: 24, materia_sigla: 'SAÚDE/SOCIAL', foco: '(Eixo 3) 3.8 Legislação do SUS: Lei nº 8.080/1990 (Parte 2).', },
    { hora_no_ciclo: 25, materia_sigla: 'LP', foco: '1.5 Morfossintaxe: Concordância verbal e nominal.' },
    { hora_no_ciclo: 26, materia_sigla: 'G.GOV', foco: '(Eixo 1) 5.4 Lei Geral de Proteção de Dados Pessoais – LGPD.' },
    { hora_no_ciclo: 27, materia_sigla: 'P.PUB', foco: '(Gerais) 1.1 Introdução às políticas públicas: conceitos e tipologias (reforço).', },
    { hora_no_ciclo: 28, materia_sigla: 'DH', foco: '(Eixo 4) 1.1 Normas e acordos internacionais: Declaração Universal dos Direitos Humanos (1948).', },
    { hora_no_ciclo: 29, materia_sigla: 'P.PUB', foco: '(Eixo 2) 2.1 Poder, racionalidade, discricionariedade na implementação de políticas.', },
    { hora_no_ciclo: 30, materia_sigla: 'SAÚDE/SOCIAL', foco: '(Eixo 3) 10. Segurança Alimentar. Lei Orgânica de Segurança Alimentar e Nutricional (LOSAN).', },
    { hora_no_ciclo: 31, materia_sigla: 'LP', foco: '1.5 Morfossintaxe: Regência verbal e nominal; Crase.' },
    { hora_no_ciclo: 32, materia_sigla: 'G.GOV', foco: '(Gerais) 5.2 Governança pública e sistemas de governança (Decreto nº 9.203).', },
    { hora_no_ciclo: 33, materia_sigla: 'ADM.PÚB', foco: '(Gerais) 7.3 Agentes públicos: Regime Jurídico Único (Lei nº 8.112/1990).', },
    { hora_no_ciclo: 34, materia_sigla: 'RLM', foco: '2.3 Matemática Básica: Problemas com porcentagem e regra de três.', },
    { hora_no_ciclo: 35, materia_sigla: 'P.PUB', foco: '(Eixo 2) 3. Teorias e modelos de análise contemporâneos de políticas públicas.', },
    { hora_no_ciclo: 36, materia_sigla: 'SAÚDE/SOCIAL', foco: '(Eixo 3) 3.9 Redes de Atenção à Saúde (RAS).', },
    { hora_no_ciclo: 37, materia_sigla: 'PESQUISA', foco: '(Eixo 5) 4. Avaliação de políticas públicas: Tipos e componentes.', },
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