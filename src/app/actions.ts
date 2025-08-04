// src/app/actions.ts
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { add } from 'date-fns';
import { type SessaoEstudo } from '@/lib/types';

// ==================================================================
// --- AÇÕES DE CONCURSOS ---
// ==================================================================
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
  const { data: { user } } = await supabase.auth.getUser();
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
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('concursos').update({ status }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/guia-estudos');
}

export async function deleteConcurso(id: number) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('concursos').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/guia-estudos');
}

// ==================================================================
// --- AÇÕES DE VÍNCULO (CONCURSO <-> PÁGINAS) ---
// ==================================================================
export async function linkPastaToConcurso(concursoId: number, paginaId: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('concurso_paginas').insert({ concurso_id: concursoId, pagina_id: paginaId });
  revalidatePath('/guia-estudos');
}

export async function unlinkPastaFromConcurso(concursoId: number, paginaId: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('concurso_paginas').delete().match({ concurso_id: concursoId, pagina_id: paginaId });
  revalidatePath('/guia-estudos');
}

// ==================================================================
// --- AÇÕES GENÉRICAS PARA HIERARQUIA (DOCUMENTOS E DISCIPLINAS) ---
// ==================================================================
export async function createItem(table: 'documentos' | 'paginas', parentId: number | null) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Usuário não autenticado." };

  const newItemData: any = {
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

    revalidatePath(`/${table}`);
    return { success: true, newItem: data };
  } catch (error) {
    return { error: `Falha ao criar: ${error instanceof Error ? error.message : "Erro desconhecido"}` };
  }
}

export async function updateItemTitle(table: 'documentos' | 'paginas', id: number, newTitle: string) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Usuário não autenticado." };

  try {
    const { error } = await supabase
      .from(table)
      .update({ title: newTitle })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath(`/${table}`);
    return { success: true };
  } catch (error) {
    return { error: `Falha ao salvar título: ${error instanceof Error ? error.message : "Erro desconhecido"}` };
  }
}

export async function deleteItem(table: 'documentos' | 'paginas', id: number) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Usuário não autenticado." };

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath(`/${table}`);
    return { success: true };
  } catch (error) {
    return { error: `Falha ao deletar: ${error instanceof Error ? error.message : "Erro desconhecido"}` };
  }
}

export async function updateItemParent(table: 'documentos' | 'paginas', itemId: number, newParentId: number | null) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Usuário não autenticado." };

  try {
    const { error } = await supabase
      .from(table)
      .update({ parent_id: newParentId })
      .eq('id', itemId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath(`/${table}`);
    return { success: true };
  } catch (error) {
    return { error: `Falha ao mover: ${error instanceof Error ? error.message : "Erro desconhecido"}` };
  }
}

// ==================================================================
// --- AÇÕES DE CONTEÚDO DO EDITOR ---
// ==================================================================
export async function updateDocumentoContent(id: number, content: any) {
  try {
    const supabase = createServerActionClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
      .from('documentos')
      .update({ content: content })
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;

    revalidatePath('/documentos');
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar conteúdo do documento:", error);
    return { error: `Falha ao salvar conteúdo: ${error instanceof Error ? error.message : "Erro"}` };
  }
}

export async function updatePaginaContent(id: number, content: any) {
  try {
    const supabase = createServerActionClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado.");

    const { error } = await supabase
      .from('paginas')
      .update({ content: content })
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) throw error;

    revalidatePath('/disciplinas');
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar conteúdo da página:", error);
    return { error: `Falha ao salvar: ${error instanceof Error ? error.message : "Erro"}` };
  }
}

// ==================================================================
// --- AÇÕES DO CICLO DE ESTUDOS ---
// ==================================================================
export async function updateSessaoEstudo(sessaoData: Partial<SessaoEstudo> & { id: number }) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Usuário não autenticado.' };

  const { id, ...data } = sessaoData;
  if (!id) return { error: 'ID da sessão é necessário para atualização.' };

  const { error } = await supabase.from('ciclo_sessoes').update(data).eq('id', id).eq('user_id', user.id);
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Utilizador não autenticado.'};
  
  const dataFormatada = new Date(novaData + 'T03:00:00');

  try {
    if (campoAlterado === 'data_estudo') {
      // LÓGICA ANTIGA: Se mudar a data de estudo, recalcula TUDO
      const rev1 = add(dataFormatada, { days: 1 });
      const rev7 = add(dataFormatada, { days: 7 });
      const rev30 = add(dataFormatada, { days: 30 });

      await supabase.from('ciclo_sessoes').update({
        data_estudo: dataFormatada.toISOString(),
        data_revisao_1: rev1.toISOString(),
        data_revisao_2: rev7.toISOString(),
        data_revisao_3: rev30.toISOString(),
      }).eq('id', sessaoId);
      
      await supabase.from('revisoes').delete().match({ ciclo_sessao_id: sessaoId });
      
      const { data: sessao } = await supabase.from('ciclo_sessoes').select('materia_nome, foco_sugerido').eq('id', sessaoId).single();
      if(sessao){
        const revisoesParaInserir = [
            { ciclo_sessao_id: sessaoId, user_id: user.id, data_revisao: rev1.toISOString().split('T')[0], tipo_revisao: '24h', concluida: false, materia_nome: sessao.materia_nome, foco_sugerido: sessao.foco_sugerido },
            { ciclo_sessao_id: sessaoId, user_id: user.id, data_revisao: rev7.toISOString().split('T')[0], tipo_revisao: '7 dias', concluida: false, materia_nome: sessao.materia_nome, foco_sugerido: sessao.foco_sugerido },
            { ciclo_sessao_id: sessaoId, user_id: user.id, data_revisao: rev30.toISOString().split('T')[0], tipo_revisao: '30 dias', concluida: false, materia_nome: sessao.materia_nome, foco_sugerido: sessao.foco_sugerido },
        ];
        await supabase.from('revisoes').insert(revisoesParaInserir);
      }
    } else {
      // NOVA LÓGICA: Se mudar uma revisão individual, atualiza SÓ ELA
      const mapaRevisao = {
        data_revisao_1: { tipo: '24h', campoDB: 'data_revisao_1' },
        data_revisao_2: { tipo: '7 dias', campoDB: 'data_revisao_2' },
        data_revisao_3: { tipo: '30 dias', campoDB: 'data_revisao_3' }
      };
      const infoRevisao = mapaRevisao[campoAlterado];

      // Atualiza a data na tabela principal do ciclo
      await supabase.from('ciclo_sessoes').update({
        [infoRevisao.campoDB]: dataFormatada.toISOString()
      }).eq('id', sessaoId);

      // Atualiza a data na tabela de revisões (que alimenta o calendário)
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
        .from('ciclo_sessoes')
        .select('disciplina_id, foco_sugerido, materia_nome')
        .eq('id', sessaoId)
        .single();
        
      if (sessaoError) throw new Error(`Falha ao buscar sessão: ${sessaoError.message}`);
      if (!sessao) throw new Error('Sessão de estudo não encontrada.');

      const rev1 = add(studyDate, { days: 1 });
      const rev7 = add(studyDate, { days: 7 });
      const rev30 = add(studyDate, { days: 30 });
      
      await supabase.from('ciclo_sessoes').update({
        concluida: true,
        data_estudo: studyDate.toISOString(),
        data_revisao_1: rev1.toISOString(),
        data_revisao_2: rev7.toISOString(),
        data_revisao_3: rev30.toISOString(),
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
        concluida: false,
        data_estudo: null,
        data_revisao_1: null,
        data_revisao_2: null,
        data_revisao_3: null,
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  if (isNaN(id)) return;
  await supabase.from('ciclo_sessoes').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/ciclo');
}

export async function toggleFinalizarSessao(sessaoId: number, novoStatus: boolean) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || isNaN(sessaoId)) return { error: 'Ação inválida ou usuário não autenticado.' };
  
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

// ==================================================================
// --- AÇÕES DO CALENDÁRIO ---
// ==================================================================
export async function addLembrete(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const titulo = formData.get('titulo') as string;
  const data = formData.get('data') as string;
  const cor = formData.get('cor') as string;
  if (!titulo || !data) return;
  await supabase.from('lembretes').insert({ titulo, data, cor, user_id: user.id });
  revalidatePath('/calendario');
}

export async function updateLembrete(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const id = Number(formData.get('id'));
  const titulo = formData.get('titulo') as string;
  const cor = formData.get('cor') as string;
  if (!id || !titulo) return;
  await supabase.from('lembretes').update({ titulo, cor }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/calendario');
}

// Dentro de src/app/actions.ts

export async function deleteLembrete(id: number) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Utilizador não autenticado.' };

  if (isNaN(id)) return { error: 'ID inválido.' };

  const { error } = await supabase
    .from('lembretes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error("Erro ao apagar lembrete:", error);
    return { error: 'Falha ao apagar o lembrete.' };
  }

  revalidatePath('/calendario');
  revalidatePath('/');
  return { success: true };
}

// ==================================================================
// --- AÇÕES PARA TAREFAS ---
// ==================================================================
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('tarefas').update({ completed: !currentState }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/tarefas');
}

export async function deleteTarefa(id: number) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('tarefas').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/tarefas');
}

// ==================================================================
// --- AÇÕES DE ANOTAÇÕES RÁPIDAS (DASHBOARD) ---
// ==================================================================
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('anotacoes').update({ content }).eq('id', id).eq('user_id', user.id);
  revalidatePath('/');
}

export async function deleteAnotacao(formData: FormData) {
  const id = Number(formData.get('id'));
  if (isNaN(id)) return;

  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  await supabase.from('anotacoes').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath('/');
}

// Dentro de src/app/actions.ts

export async function generateAnkiCards(sourceText: string, numCards: number) {
  const { data: { user } } = await createServerActionClient({ cookies }).auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

  // CORREÇÃO: Lendo a chave de API do ficheiro .env.local
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { error: "Chave de API do Gemini não encontrada. Verifique o seu ficheiro .env.local." };
  }

  const prompt = `
    Você é um especialista em criar flashcards para o sistema de repetição espaçada Anki.
    Sua tarefa é analisar o texto fornecido e gerar exatamente ${numCards} pares de pergunta e resposta concisos e de alta qualidade, em português.
    As perguntas devem ser claras e diretas. As respostas devem ser curtas e objetivas, contendo apenas a informação essencial para responder à pergunta.
    
    Formate a sua resposta como um objeto JSON contendo uma única chave "cards", que é um array de objetos. Cada objeto deve ter duas chaves: "question" e "answer".

    Texto para análise:
    ---
    ${sourceText}
    ---
  `;

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
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error("Erro da API do Gemini:", errorBody);
        throw new Error(`Erro na API: ${response.statusText}`);
    }

    const result = await response.json();
    const text = result.candidates[0].content.parts[0].text;
    const parsedJson = JSON.parse(text);

    return { data: parsedJson.cards };

  } catch (error) {
    console.error("Falha ao gerar flashcards:", error);
    return { error: error instanceof Error ? error.message : "Ocorreu um erro desconhecido." };
  }
}

// Adicione no final do seu ficheiro src/app/actions.ts

// ==================================================================
// --- AÇÕES PARA DECKS DE ANKI ---
// ==================================================================

type Flashcard = {
  question: string;
  answer: string;
};

export async function saveAnkiDeck(title: string, cards: Flashcard[]) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

  if (!title.trim()) return { error: "O título é obrigatório." };
  if (cards.length === 0) return { error: "Não há flashcards para guardar." };

  const { data, error } = await supabase
    .from('anki_decks')
    .insert({
      title,
      cards,
      user_id: user.id
    })
    .select('id')
    .single();

  if (error) {
    console.error("Erro ao guardar deck:", error);
    return { error: "Falha ao guardar o deck de flashcards." };
  }

  revalidatePath('/anki'); // Atualiza a página do gerador
  return { success: true, newDeckId: data.id };
}

// Adicione no final do seu ficheiro src/app/actions.ts

// ... (código anterior)

export async function deleteAnkiDeck(deckId: number) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

  const { error } = await supabase
    .from('anki_decks')
    .delete()
    .eq('id', deckId)
    .eq('user_id', user.id);

  if (error) {
    console.error("Erro ao apagar deck:", error);
    return { error: "Falha ao apagar o deck." };
  }

  revalidatePath('/anki');
  return { success: true };
}

// Adicione no final do seu ficheiro src/app/actions.ts

// ... (código anterior)

export async function updateAnkiDeck(deckId: number, cards: Flashcard[]) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado." };

  const { error } = await supabase
    .from('anki_decks')
    .update({ cards: cards }) // Atualiza apenas a coluna de cartões
    .eq('id', deckId)
    .eq('user_id', user.id);

  if (error) {
    console.error("Erro ao atualizar deck:", error);
    return { error: "Falha ao guardar as alterações no deck." };
  }

  revalidatePath(`/anki/${deckId}`); // Atualiza a página do deck específico
  return { success: true };
}
