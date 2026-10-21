// src/app/actions.ts
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

// --- AÇÕES DE CONCURSO (CRUD COMPLETO) ---
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