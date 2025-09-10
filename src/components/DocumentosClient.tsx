'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { HierarchicalSidebar } from '@/components/HierarchicalSidebar';
import TextEditor from '@/components/TextEditor';
import { updateDocumentoContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';
import { type Node } from '@/lib/types';
import { findNodePath } from '@/lib/utils'; // Importa a nova função

interface DocumentosClientProps {
    documentTree: Node[];
    initialDocument: Node | null;
}

export default function DocumentosClient({ documentTree, initialDocument }: DocumentosClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedDocument, setSelectedDocument] = useState(initialDocument);
    
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const activeId = searchParams.get('id');

    // Calcula o caminho do breadcrumb
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
        await updateDocumentoContent(selectedDocument.id, newContent);
    };

    if (selectedDocument && isMounted) {
        return (
            <div className="flex gap-4 h-full p-4">
                <div className="hidden md:block w-[300px] flex-shrink-0">
                    <div className="sticky top-4 max-h-[calc(100vh-2rem)]">
                        <HierarchicalSidebar 
                            treeData={documentTree}
                            table="documentos"
                            title="NAVEGAR"
                            activeId={activeId}
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-4">
                    {/* Componente Breadcrumbs */}
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

    return (
        <div className="h-full p-4 flex">
            <div className="flex-1 min-w-0">
                <HierarchicalSidebar 
                    treeData={documentTree}
                    table="documentos"
                    title="DOCUMENTOS"
                    activeId={activeId}
                />
            </div>
        </div>
    );
}

