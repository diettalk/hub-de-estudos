'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, PanelLeftClose, PanelLeft, FolderTree, BookOpen } from 'lucide-react';
import { HierarchicalSidebar } from '@/components/HierarchicalSidebar';
import TextEditor from '@/components/TextEditor';
import { updatePaginaContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';
import { type Node } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DisciplinasClientProps {
  paginaTree: Node[];
  initialPage: Node | null;
}

function findNodePath(nodes: Node[], nodeId: string | number): Node[] {
  const targetId = String(nodeId);
  function search(currentPath: Node[], currentNodes: Node[]): Node[] | null {
    for (const node of currentNodes) {
      const newPath = [...currentPath, node];
      if (String(node.id) === targetId) return newPath;
      if (Array.isArray(node.children) && node.children.length > 0) {
        const foundPath = search(newPath, node.children);
        if (foundPath) return foundPath;
      }
    }
    return null;
  }
  return search([], nodes) || [];
}

export default function DisciplinasClient({ paginaTree, initialPage }: DisciplinasClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedPage, setSelectedPage] = useState(initialPage);
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const activeId = searchParams.get('page');

  const breadcrumbPath = useMemo(() => {
    if (!activeId) return [];
    return findNodePath(paginaTree, activeId);
  }, [paginaTree, activeId]);

  useEffect(() => {
    const id = searchParams.get('page');
    if (id && initialPage && Number(id) === initialPage.id) {
      setSelectedPage(initialPage);
    } else if (!id) {
      setSelectedPage(null);
    }
  }, [searchParams, initialPage]);

  const handleSave = async (newContent: JSONContent) => {
    if (!selectedPage) return;
    const contentAsString = JSON.stringify(newContent);
    await updatePaginaContent(selectedPage.id, contentAsString);
  };

  // Se uma página estiver selecionada
  if (selectedPage && isMounted) {
    return (
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-6.5rem)] min-h-[600px] w-full">
        {/* SIDEBAR DE DISCIPLINAS (Recolhível) */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out flex-shrink-0',
            isSidebarOpen ? 'w-full lg:w-80 h-72 lg:h-full' : 'w-0 hidden lg:block overflow-hidden'
          )}
        >
          <div className="h-full rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <HierarchicalSidebar
              treeData={paginaTree}
              table="paginas"
              title="Estrutura"
              activeId={activeId}
              isMinimized={false}
              onToggleMinimize={() => setIsSidebarOpen(false)}
            />
          </div>
        </div>

        {/* ÁREA DO EDITOR E BREADCRUMB */}
        <div className="flex-1 min-w-0 flex flex-col gap-3 h-full overflow-hidden">
          {/* BARRA SUPERIOR: Toggle da Sidebar + Breadcrumb */}
          <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-card border border-border shadow-xs flex-shrink-0">
            <div className="flex items-center gap-2 overflow-x-auto text-xs font-medium text-muted-foreground no-scrollbar">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground flex-shrink-0"
                title={isSidebarOpen ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
              >
                {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
              </Button>

              <div className="h-4 w-px bg-border flex-shrink-0" />

              <Link
                href="/disciplinas"
                className="hover:text-foreground flex items-center gap-1.5 transition-colors flex-shrink-0"
              >
                <FolderTree className="w-3.5 h-3.5" />
                <span>Disciplinas</span>
              </Link>

              {breadcrumbPath.map((node, index) => (
                <React.Fragment key={node.id}>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 flex-shrink-0" />
                  <Link
                    href={`/disciplinas?page=${node.id}`}
                    className={cn(
                      'px-2 py-0.5 rounded-md transition-colors truncate max-w-[150px] sm:max-w-[200px]',
                      index === breadcrumbPath.length - 1
                        ? 'font-semibold text-foreground bg-secondary/80'
                        : 'hover:text-foreground hover:bg-secondary/40'
                    )}
                  >
                    {node.title}
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* O EDITOR PRINCIPAL */}
          <div className="flex-1 min-h-0 rounded-2xl border border-border bg-card shadow-xs overflow-hidden flex flex-col">
            <TextEditor
              key={selectedPage.id}
              initialContent={selectedPage.content ?? null}
              onSave={handleSave}
              onClose={() => router.push('/disciplinas')}
            />
          </div>
        </div>
      </div>
    );
  }

  // TELA INICIAL: Nenhuma disciplina selecionada ainda
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-6.5rem)] min-h-[600px] w-full">
      <div className="lg:col-span-5 xl:col-span-4 h-full rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        <HierarchicalSidebar
          treeData={paginaTree}
          table="paginas"
          title="Caderno de Matérias"
          activeId={activeId}
          isMinimized={false}
          onToggleMinimize={() => {}}
        />
      </div>

      <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 h-full rounded-2xl border border-dashed border-border/80 bg-card/40 flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 shadow-xs">
          <BookOpen className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Selecione ou crie uma página
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6 leading-relaxed">
          Navegue pela árvore à esquerda para editar resumos, leis, tabelas de estudo ou adicione novos tópicos.
        </p>
      </div>
    </div>
  );
}