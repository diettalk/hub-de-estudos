import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import BibliotecaClient from '@/components/BibliotecaClient';
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

  // Função base para as nossas consultas
  const baseQuery = (status: 'ativo' | 'arquivado') =>
    supabase.from('resources').select('*').eq('user_id', user.id).eq('status', status);

  // Consulta para as pastas ativas na pasta atual
  const folderQuery = baseQuery('ativo').eq('type', 'folder');
  if (currentFolderId) {
    folderQuery.eq('parent_id', currentFolderId);
  } else {
    folderQuery.is('parent_id', null);
  }

  // Consulta para os recursos (não-pastas) ativos na pasta atual
  const itemQuery = baseQuery('ativo').not('type', 'eq', 'folder');
  if (currentFolderId) {
    itemQuery.eq('parent_id', currentFolderId);
  } else {
    itemQuery.is('parent_id', null);
  }

  // Executa todas as consultas em paralelo para otimizar
  const [
    { data: folders },
    { data: items },
    { data: archivedItems },
    { data: disciplinas },
    breadcrumbs
  ] = await Promise.all([
    folderQuery.order('ordem'),
    itemQuery.order('ordem'),
    baseQuery('arquivado').order('title'),
    supabase.from('paginas').select('id, title').eq('user_id', user.id).is('parent_id', null).order('title'),
    getBreadcrumbs(supabase, currentFolderId)
  ]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Biblioteca de Recursos</h1>
        <p className="text-muted-foreground">O seu repositório central de links, PDFs e materiais de estudo.</p>
      </header>
      <BibliotecaClient 
        folders={(folders as Resource[]) || []}
        items={(items as Resource[]) || []}
        archivedItems={(archivedItems as Resource[]) || []}
        disciplinas={(disciplinas as Disciplina[]) || []}
        breadcrumbs={(breadcrumbs as Resource[]) || []}
      />
    </div>
  );
}
