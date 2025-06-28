// src/app/actions.ts
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// --- AÇÕES DE CONCURSO ---
export async function addConcurso(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const nome = formData.get('nome') as string;
  const banca = formData.get('banca') as string;
  const dataProva = formData.get('data_prova') as string;
  const prioridadesRaw = formData.get('prioridades') as string;
  const prioridades = prioridadesRaw ? prioridadesRaw.split('\n').map(p => p.trim()) : [];

  if (!nome || !banca || !dataProva) return;
  await supabase.from('concursos').insert({ 
    nome, 
    banca, 
    data_prova: dataProva, 
    prioridades, 
    user_id: user.id 
  });

  revalidatePath('/materiais');
}

export async function updateConcurso(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));
  const nome = formData.get('nome') as string;
  const banca = formData.get('banca') as string;
  const dataProva = formData.get('data_prova') as string;
  const prioridadesRaw = formData.get('prioridades') as string;
  const prioridades = prioridadesRaw ? prioridadesRaw.split('\n').map(p => p.trim()) : [];

  if (!id || !nome || !banca || !dataProva) return;

  await supabase.from('concursos').update({ 
    nome, 
    banca, 
    data_prova: dataProva, 
    prioridades 
  }).eq('id', id);

  revalidatePath('/');
  revalidatePath('/materiais');
}

export async function deleteConcurso(id: number) {
  const supabase = createServerActionClient({ cookies });
  await supabase.from('concursos').delete().eq('id', id);
  revalidatePath('/');
  revalidatePath('/materiais');
}

// --- AÇÕES DE DISCIPLINA ---
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

// --- AÇÕES DO CICLO DE ESTUDOS ---
export async function updateSessaoEstudo(formData: FormData) {
  const supabase = createServerActionClient({ cookies });
  const id = Number(formData.get('id'));
  if (isNaN(id)) return { error: 'ID da sessão inválido.' };

  const updateData: { [key: string]: any } = {};
  
  if (formData.has('foco')) updateData.foco = formData.get('foco');
  if (formData.has('disciplina_id')) updateData.disciplina_id = Number(formData.get('disciplina_id')) || null;
  if (formData.has('diario_de_bordo')) updateData.diario_de_bordo = formData.get('diario_de_bordo');
  if (formData.has('questoes_acertos')) updateData.questoes_acertos = Number(formData.get('questoes_acertos')) || null;
  if (formData.has('questoes_total')) updateData.questoes_total = Number(formData.get('questoes_total')) || null;
  if (formData.has('materia_finalizada')) updateData.materia_finalizada = formData.get('materia_finalizada') === 'true';
  if (formData.has('r1_concluida')) updateData.r1_concluida = formData.get('r1_concluida') === 'true';
  if (formData.has('r2_concluida')) updateData.r2_concluida = formData.get('r2_concluida') === 'true';
  if (formData.has('r3_concluida')) updateData.r3_concluida = formData.get('r3_concluida') === 'true';
  
  const isMateriaFinalizada = formData.get('isMateriaFinalizada') === 'true';

  if (formData.has('data_estudo')) {
    const dataEstudoStr = formData.get('data_estudo') as string;
    updateData.data_estudo = dataEstudoStr || null;
    if (dataEstudoStr && !isMateriaFinalizada) {
      const studyDate = new Date(dataEstudoStr + 'T03:00:00');
      const rev1 = new Date(studyDate); rev1.setDate(studyDate.getDate() + 1); updateData.data_revisao_1 = rev1.toISOString().split('T')[0];
      const rev7 = new Date(studyDate); rev7.setDate(studyDate.getDate() + 7); updateData.data_revisao_2 = rev7.toISOString().split('T')[0];
      const rev30 = new Date(studyDate); rev30.setDate(studyDate.getDate() + 30); updateData.data_revisao_3 = rev30.toISOString().split('T')[0];
    }
  } else if (formData.has('concluido')) {
    const isConcluido = formData.get('concluido') === 'true';
    updateData.concluido = isConcluido;
    
    if (isConcluido && formData.get('data_estudo_was_null') === 'true' && !isMateriaFinalizada) {
      const studyDate = new Date();
      updateData.data_estudo = studyDate.toISOString().split('T')[0];
      const rev1 = new Date(studyDate); rev1.setDate(studyDate.getDate() + 1); updateData.data_revisao_1 = rev1.toISOString().split('T')[0];
      const rev7 = new Date(studyDate); rev7.setDate(studyDate.getDate() + 7); updateData.data_revisao_2 = rev7.toISOString().split('T')[0];
      const rev30 = new Date(studyDate); rev30.setDate(studyDate.getDate() + 30); updateData.data_revisao_3 = rev30.toISOString().split('T')[0];
    } else if (!isConcluido) {
      updateData.data_estudo = null;
      updateData.data_revisao_1 = null; updateData.r1_concluida = false;
      updateData.data_revisao_2 = null; updateData.r2_concluida = false;
      updateData.data_revisao_3 = null; updateData.r3_concluida = false;
    }
  } else {
    if (formData.has('data_revisao_1')) updateData.data_revisao_1 = formData.get('data_revisao_1') || null;
    if (formData.has('data_revisao_2')) updateData.data_revisao_2 = formData.get('data_revisao_2') || null;
    if (formData.has('data_revisao_3')) updateData.data_revisao_3 = formData.get('data_revisao_3') || null;
  }
  
  await supabase.from('sessoes_estudo').update(updateData).eq('id', id);
  
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

// --- AÇÕES PARA TÓPICOS ---
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

// Adicione estas funções em src/app/actions.ts

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