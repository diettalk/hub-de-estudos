'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { HierarchicalSidebar } from '@/components/HierarchicalSidebar';
import TextEditor from '@/components/TextEditor';
import { updatePaginaContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';
import { type Node } from '@/lib/types';

interface DisciplinasClientProps {
    paginaTree: Node[];
    initialPage: Node | null;
}

// Função para encontrar o caminho de um nó na árvore (agora local)
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
    useEffect(() => { setIsMounted(true); }, []);

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
        await updatePaginaContent(selectedPage.id, newContent);
    };

    if (selectedPage && isMounted) {
        return (
             <div className="flex gap-4 h-full p-4">
                <div className="hidden md:block w-[300px] flex-shrink-0">
                    <div className="sticky top-4 max-h-[calc(100vh-2rem)]">
                        <HierarchicalSidebar 
                            treeData={paginaTree}
                            table="disciplinas"
                            title="NAVEGAR"
                            activeId={activeId}
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                    {breadcrumbPath.length > 0 && (
                        <div className="flex items-center text-sm text-muted-foreground bg-card border rounded-lg p-2 flex-shrink-0">
                            {breadcrumbPath.map((node, index) => (
                                <React.Fragment key={node.id}>
                                    {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                                    <Link href={`/disciplinas?page=${node.id}`} className="hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary">
                                        {node.title}
                                    </Link>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                    <TextEditor
                        key={selectedPage.id}
                        initialContent={selectedPage.content}
                        onSave={handleSave}
                        onClose={() => router.push('/disciplinas')}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full p-4 flex">
            <div className="flex-1 min-w-0">
                <HierarchicalSidebar 
                    treeData={paginaTree}
                    table="disciplinas"
                    title="DISCIPLINAS"
                    activeId={activeId}
                />
            </div>
        </div>
    );
}

