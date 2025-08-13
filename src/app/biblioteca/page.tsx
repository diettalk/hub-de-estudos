import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BibliotecaClient } from '@/components/BibliotecaClient'; // Vamos criar a seguir
import { type Resource, type Disciplina } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function BibliotecaPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Busca todos os recursos do utilizador, fazendo JOIN com a disciplina correspondente
  const { data: resources } = await supabase
    .from('resources')
    .select('*, paginas(title)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Busca todas as disciplinas para oferecer no formulário de adição
  const { data: disciplinas } = await supabase
    .from('paginas')
    .select('id, title')
    .eq('user_id', user.id)
    .order('title');

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Biblioteca de Recursos</h1>
        <p className="text-muted-foreground">O seu repositório central de links, PDFs e materiais de estudo.</p>
      </header>
      <BibliotecaClient 
        resources={(resources as Resource[]) || []} 
        disciplinas={(disciplinas as Disciplina[]) || []} 
      />
    </div>
  );
}
