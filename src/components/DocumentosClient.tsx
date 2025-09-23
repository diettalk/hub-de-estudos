'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { HierarchicalSidebar } from '@/components/HierarchicalSidebar';
import TextEditor from '@/components/TextEditor';
import { updateDocumentoContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';
import { type Node } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

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

interface DocumentosClientProps {
    documentTree: Node[];
    initialDocument: Node | null;
}

export default function DocumentosClient({ documentTree, initialDocument }: DocumentosClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedDocument, setSelectedDocument] = useState(initialDocument);
    
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);
    
    // NOVO: Estado para controlar a visibilidade da sidebar
    const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);

    const activeId = searchParams.get('id');

    const breadcrumbPath = useMemo(() => {
        if (!activeId) return [];
        return findNodePath(documentTree, activeId);
    }, [documentTree, activeId]);

    useEffect(() => {
        const id = searchParams.get('id');
        if (id && initialDocument && Number(id) === initialDocument.id) {
            setSelectedDocument(initialDocument);
        } else if (!id) {
            setSelectedDocument(null);
        }
    }, [searchParams, initialDocument]);

const handleSave = async (newContent: JSONContent) => {
    if (!selectedDocument) return;

    // CONVERTE O OBJETO PARA STRING ANTES DE ENVIAR
    const contentAsString = JSON.stringify(newContent);
    
    // Envia a string em vez do objeto
    await updateDocumentoContent(selectedDocument.id, contentAsString);
};

    // Vista principal com editor e sidebar
    if (selectedDocument && isMounted) {
        return (
            <div className="flex gap-4 h-full p-4">
                {/* Container da Sidebar com largura dinâmica */}
                <div className={cn(
                    "hidden md:block flex-shrink-0 transition-all duration-300 ease-in-out",
                    isSidebarMinimized ? "w-16" : "w-[300px]"
                )}>
                    <div className="sticky top-4 max-h-[calc(100vh-2rem)]">
                        <HierarchicalSidebar 
                            treeData={documentTree}
                            table="documentos"
                            title="NAVEGAR"
                            activeId={activeId}
                            // NOVO: Passa o estado e a função de controlo para a sidebar
                            isMinimized={isSidebarMinimized}
                            onToggleMinimize={() => setIsSidebarMinimized(!isSidebarMinimized)}
                        />
                    </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-4">
                    {breadcrumbPath.length > 0 && (
                        <div className="flex items-center text-sm text-muted-foreground bg-card border rounded-lg p-2 flex-shrink-0">
                            {breadcrumbPath.map((node, index) => (
                                <React.Fragment key={node.id}>
                                    {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                                    <Link href={`/documentos?id=${node.id}`} className="hover:text-foreground px-2 py-1 rounded-md hover:bg-secondary">
                                        {node.title}
                                    </Link>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                    <TextEditor
                        key={selectedDocument.id}
                        initialContent={selectedDocument.content}
                        onSave={handleSave}
                        onClose={() => router.push('/documentos')}
                    />
                </div>
            </div>
        );
    }

    // Vista apenas com a sidebar (quando nenhum documento está selecionado)
    return (
        <div className="h-full p-4 flex">
            <div className="flex-1 min-w-0">
                <HierarchicalSidebar 
                    treeData={documentTree}
                    table="documentos"
                    title="DOCUMENTOS"
                    activeId={activeId}
                    isMinimized={false} // Nesta vista, a sidebar nunca está minimizada
                    onToggleMinimize={() => {}} // Não precisa de função aqui
                />
            </div>
        </div>
    );
}

