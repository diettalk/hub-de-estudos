import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Library, Archive } from 'lucide-react';
import BibliotecaClient from '@/components/BibliotecaClient';
import { type Resource, type Disciplina } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Busca recursivamente o caminho de pastas (breadcrumbs) para uma dada pasta.
 * @param supabase - A instância do cliente Supabase.
 * @param folderId - O ID da pasta final.
 * @returns Uma promessa que resolve para um array de recursos (pastas) representando o caminho.
 */
async function getBreadcrumbs(supabase: any, folderId: number | null): Promise<Resource[]> {
    if (!folderId) return [];
    
    const breadcrumbs: Resource[] = [];
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

/**
 * Componente de esqueleto para ser exibido enquanto os dados da biblioteca são carregados.
 */
function PageSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-6 bg-muted rounded-md w-1/3"></div>
        <div className="h-10 bg-muted rounded-md w-32"></div>
      </div>
      <div>
        <div className="h-8 bg-muted rounded-md w-1/4 mb-4"></div>
        <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
          <div className="h-28 bg-muted rounded-lg"></div>
          <div className="h-28 bg-muted rounded-lg"></div>
          <div className="h-28 bg-muted rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cabeçalho da página da Biblioteca, exibindo estatísticas.
 * @param stats - Objeto com as estatísticas a serem exibidas.
 */
function BibliotecaHeader({ stats }: { stats: { totalActive: number; totalArchived: number } }) {
    return (
        <header className="mb-8">
            <h1 className="text-3xl font-bold">Biblioteca de Recursos</h1>
            <p className="text-muted-foreground">O seu repositório central de links, PDFs e materiais de estudo.</p>
            <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                    <Library className="h-4 w-4" />
                    <span>{stats.totalActive} Itens Ativos</span>
                </div>
                <div className="flex items-center gap-2">
                    <Archive className="h-4 w-4" />
                    <span>{stats.totalArchived} Itens Arquivados</span>
                </div>
            </div>
      </header>
    );
}

/**
 * Componente de Página Principal da Biblioteca (Server Component).
 * Responsável por buscar todos os dados necessários do servidor.
 */
export default async function BibliotecaPage({ searchParams }: { searchParams: { folderId?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const currentFolderId = searchParams.folderId ? Number(searchParams.folderId) : null;

  try {
    const createQuery = (status: 'ativo' | 'arquivado') => 
        supabase.from('resources').select('*').eq('user_id', user.id).eq('status', status);

    const [
        foldersResult, 
        itemsResult, 
        archivedItemsResult, 
        disciplinasResult, 
        breadcrumbsResult
    ] = await Promise.all([
        createQuery('ativo').eq('type', 'folder').is('parent_id', currentFolderId).order('ordem'),
        createQuery('ativo').not('type', 'eq', 'folder').is('parent_id', currentFolderId).order('ordem'),
        createQuery('arquivado').order('title'),
        supabase.from('paginas').select('id, title').eq('user_id', user.id).is('parent_id', null).order('title'),
        getBreadcrumbs(supabase, currentFolderId)
    ]);

    const folders = foldersResult.data || [];
    const items = itemsResult.data || [];
    const archivedItems = archivedItemsResult.data || [];
    const disciplinas = disciplinasResult.data || [];
    const breadcrumbs = breadcrumbsResult || [];

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <BibliotecaHeader stats={{ totalActive: folders.length + items.length, totalArchived: archivedItems.length }} />
            <Suspense fallback={<PageSkeleton />}>
                <BibliotecaClient 
                    folders={folders as Resource[]}
                    items={items as Resource[]}
                    archivedItems={archivedItems as Resource[]}
                    disciplinas={disciplinas as Disciplina[]}
                    breadcrumbs={breadcrumbs as Resource[]}
                />
            </Suspense>
        </div>
    );
  } catch (error) {
    console.error("Erro ao buscar dados da biblioteca:", error);
    return (
        <div className="p-8 text-center text-destructive">
            <p>Ocorreu um erro ao carregar a sua biblioteca. Por favor, tente novamente mais tarde.</p>
        </div>
    );
  }
}
