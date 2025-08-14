// src/app/biblioteca/page.tsx

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { AlertTriangle } from 'lucide-react';
import BibliotecaClient from '@/components/BibliotecaClient';
import { getBibliotecaData } from '@/app/actions';

export const dynamic = 'force-dynamic';

function PageSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 h-full animate-pulse">
        <div className="bg-muted/60 rounded-lg p-4 space-y-4">
            <div className="h-8 bg-muted rounded-md w-2/3"></div>
            <div className="space-y-2">
                <div className="h-6 bg-muted rounded-md w-full"></div>
                <div className="h-6 bg-muted rounded-md w-5/6 ml-4"></div>
                <div className="h-6 bg-muted rounded-md w-full"></div>
            </div>
        </div>
        <div className="bg-card rounded-lg p-4">
            <div className="h-8 bg-muted rounded-md w-1/3 mb-6"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="h-28 bg-muted rounded-lg"></div>
                <div className="h-28 bg-muted rounded-lg"></div>
                <div className="h-28 bg-muted rounded-lg"></div>
            </div>
        </div>
    </div>
  );
}

export default async function BibliotecaPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  try {
    // A função agora busca todos os dados necessários de uma vez
    const initialData = await getBibliotecaData();

    return (
        <div className="h-full p-4 sm:p-6">
            <Suspense fallback={<PageSkeleton />}>
                <BibliotecaClient initialData={initialData} />
            </Suspense>
        </div>
    );
  } catch (error) {
    console.error("Erro ao buscar dados da biblioteca:", error);
    return (
        <div className="m-8 p-8 flex flex-col items-center justify-center text-center text-destructive-foreground bg-destructive rounded-lg">
            <AlertTriangle className="h-12 w-12 mb-4" />
            <h2 className="text-2xl font-bold">Erro ao Carregar a Biblioteca</h2>
            <p>Ocorreu um erro inesperado ao carregar os seus recursos.</p>
            <p>Por favor, tente recarregar a página.</p>
        </div>
    );
  }
}
