import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { BibliotecaClient } from '@/components/BibliotecaClient';
import { type Resource, type Disciplina } from '@/lib/types';

export const dynamic = 'force-dynamic';

// Função para buscar o caminho de breadcrumbs
async function getBreadcrumbs(supabase: any, folderId: number | null): Promise<Resource[]> {
    if (!folderId) return [];
    
    let breadcrumbs: Resource[] = [];
    let currentId: number | null = folderId;

    while (currentId) {
        const { data: folder } = await supabase
            .from('resources')
            .select('id, title, parent_id')
            .eq('id', currentId)
            .single();
        
        if (folder) {
            breadcrumbs.unshift(folder);
            currentId = folder.parent_id;
        } else {
            currentId = null;
        }
    }
    return breadcrumbs;
}

export default async function BibliotecaPage({ searchParams }: { searchParams: { folderId?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const currentFolderId = searchParams.folderId ? Number(searchParams.folderId) : null;

  // Busca os recursos que estão na pasta atual
  const { data: resources } = await supabase
    .from('resources')
    .select('*')
    .eq('user_id', user.id)
    .eq('parent_id', currentFolderId || null); // Busca pela parent_id

  // Busca todas as disciplinas para o modal
  const { data: disciplinas } = await supabase
    .from('paginas')
    .select('id, title')
    .eq('user_id', user.id)
    .is('parent_id', null)
    .order('title');
    
  // Busca os breadcrumbs
  const breadcrumbs = await getBreadcrumbs(supabase, currentFolderId);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Biblioteca de Recursos</h1>
        <p className="text-muted-foreground">O seu repositório central de links, PDFs e materiais de estudo.</p>
      </header>
      <BibliotecaClient 
        resources={(resources as Resource[]) || []} 
        disciplinas={(disciplinas as Disciplina[]) || []}
        breadcrumbs={(breadcrumbs as Resource[]) || []}
      />
    </div>
  );
}
