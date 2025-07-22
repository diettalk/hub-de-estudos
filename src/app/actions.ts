// src/app/actions.ts (VERSÃO COMPLETA E FINAL)

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
  const dataFormatada = new Date(novaData + 'T03:00:00'); // Garante fuso horário correto

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

// ***** NOVA FUNÇÃO PARA O CHECKBOX "FINALIZADA" *****
export async function toggleFinalizarSessao(sessaoId: number, novoStatus: boolean) {
  const supabase = createServerActionClient({ cookies });
  if (isNaN(sessaoId)) return { error: 'ID da sessão inválido.' };

  try {
    // Se o novo status for TRUE (marcando a caixa), limpamos os agendamentos.
    if (novoStatus) {
      await supabase.from('ciclo_sessoes').update({ 
        materia_finalizada: true, // Marca como finalizada
        concluida: false,         // Desmarca o "OK" para garantir consistência
        data_estudo: null, 
        data_revisao_1: null, 
        data_revisao_2: null, 
        data_revisao_3: null,
      }).eq('id', sessaoId);
      
      // Deleta as revisões que foram geradas para essa sessão.
      await supabase.from('revisoes').delete().eq('ciclo_sessao_id', sessaoId);
    } else {
      // Se estiver desmarcando, apenas remove o status de finalizada.
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

export async function seedFase1Ciclo() {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { count } = await supabase.from('ciclo_sessoes').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  if (count && count > 0) return { message: 'O ciclo já possui dados.' };

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
    revalidatePath('/revisoes'); revalidatePath('/calendario');
    return { success: true };
}

// --- AÇÕES PARA DOCUMENTOS ---
export async function addDocumento(parentId: number | null, title: string) {
  if (!title) return { error: 'O título é obrigatório.' };
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.'};
  const { data, error } = await supabase.from('documentos').insert({ title, user_id: user.id, content: null, parent_id: parentId }).select('id').single();
  if (error) { console.error("Erro ao adicionar documento:", error); return { error: error.message }; }
  revalidatePath('/documentos');
  return { data };
}
export async function updateDocumento(formData: FormData) {
  const id = Number(formData.get('id'));
  const title = formData.get('title') as string;
  const contentJSON = formData.get('content') as string;
  if (!id) return { error: "ID do documento é necessário."};
  if (!title) return { error: "O título não pode ser vazio."};
  const supabase = createServerActionClient({ cookies });
  try {
    const contentToSave = contentJSON ? JSON.parse(contentJSON) : null;
    const { error } = await supabase.from('documentos').update({ title, content: contentToSave }).eq('id', id);
    if (error) throw error;
    revalidatePath('/documentos');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido.";
    console.error("Erro ao atualizar documento:", errorMessage); return { error: `Falha ao salvar: ${errorMessage}` };
  }
}
export async function deleteDocumento(id: number) {
  if (isNaN(id)) return { error: "ID inválido." };
  const supabase = createServerActionClient({ cookies });
  const { error } = await supabase.rpc('delete_documento_e_filhos', { doc_id: id });
  if (error) { console.error("Erro ao deletar documento:", error); return { error: error.message }; }
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