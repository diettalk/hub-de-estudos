import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TarefasClient } from '@/components/TarefasClient';
import { type Tarefa } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TarefasPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Busca todas as tarefas do usuário, ordenadas pela data de criação
  const { data: tarefas, error } = await supabase
    .from('tarefas')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar tarefas:", error.message);
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="text-left mb-8">
        <h1 className="text-3xl font-bold">Gerenciador de Tarefas</h1>
        <p className="text-muted-foreground">Organize as suas tarefas pendentes, concluídas e arquivadas.</p>
      </header>
      {/* Passa a lista de tarefas para o nosso novo componente cliente */}
      <TarefasClient tarefas={(tarefas as Tarefa[]) || []} />
    </div>
  );
}
