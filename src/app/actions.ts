// src/app/actions.ts
'use server'; // 1. Mágica do Next.js: diz que esta função roda apenas no servidor.

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function toggleTask(id: number, currentState: boolean) {
  const supabase = createServerActionClient({ cookies });

  // 2. Atualiza a coluna 'concluido' na tabela 'sessoes_estudo'
  // para o valor oposto do estado atual.
  const { error } = await supabase
    .from('sessoes_estudo')
    .update({ concluido: !currentState })
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar tarefa:', error);
    return;
  }

  // 3. Diz ao Next.js para recarregar os dados da página do ciclo.
  revalidatePath('/ciclo');
}