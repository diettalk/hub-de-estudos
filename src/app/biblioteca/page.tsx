// src/app/biblioteca/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Library, Archive, AlertTriangle } from 'lucide-react';
import BibliotecaClient from '@/components/BibliotecaClient';
import { getBibliotecaData } from '@/app/actions';

export const dynamic = 'force-dynamic';

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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-8 gap-4">
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
 */
function BibliotecaHeader({ stats }: { stats: { totalActive: number; totalArchived: number } }) {
    return (
        <header className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">Biblioteca de Recursos</h1>
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
 * Responsável por buscar todos os dados necessários do servidor de forma otimizada.
 */
export default async function BibliotecaPage({ searchParams }: { searchParams: { folderId?: string } }) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const currentFolderId = searchParams.folderId ? Number(searchParams.folderId) : null;

  try {
    const bibliotecaData = await getBibliotecaData(currentFolderId);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <BibliotecaHeader 
                stats={{ 
                    totalActive: bibliotecaData.folders.length + bibliotecaData.items.length, 
                    totalArchived: bibliotecaData.archivedItems.length 
                }} 
            />
            <Suspense fallback={<PageSkeleton />}>
                <BibliotecaClient 
                    initialData={bibliotecaData}
                    currentFolderId={currentFolderId}
                />
            </Suspense>
        </div>
    );
  } catch (error) {
    console.error("Erro ao buscar dados da biblioteca:", error);
    return (
        <div className="p-8 flex flex-col items-center justify-center text-center text-destructive-foreground bg-destructive rounded-lg">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <h2 className="text-2xl font-bold">Erro ao Carregar a Biblioteca</h2>
            <p>Ocorreu um erro inesperado ao carregar os seus recursos. A nossa equipa já foi notificada.</p>
            <p>Por favor, tente recarregar a página.</p>
        </div>
    );
  }
}
