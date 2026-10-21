import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TarefasClient } from '@/components/TarefasClient';
import { type Tarefa } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function TarefasPage() {
  // CORREÇÃO 1: Await na promise dos cookies
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  
  // CORREÇÃO 2: Usar getUser() no lugar de getSession()
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Busca todas as tarefas do usuário, ordenadas pela data de criação
  // CORREÇÃO 3: Usar user.id no lugar de session.user.id
  const { data: tarefas, error } = await supabase
    .from('tarefas')
    .select('*')
    .eq('user_id', user.id)
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