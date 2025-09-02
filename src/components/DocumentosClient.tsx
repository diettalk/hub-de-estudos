'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HierarchicalSidebar } from '@/components/HierarchicalSidebar';
import TextEditor from '@/components/TextEditor';
import { updateDocumentoContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';
import { type Node } from '@/lib/types';

interface DocumentosClientProps {
    documentTree: Node[];
    initialDocument: Node | null;
}

export default function DocumentosClient({ documentTree, initialDocument }: DocumentosClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedDocument, setSelectedDocument] = useState(initialDocument);
    
    // --- CORREÇÃO FINAL: Estado para atrasar a renderização do editor ---
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

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
        // A função de salvar do Tiptap espera JSONContent, não string.
        await updateDocumentoContent(selectedDocument.id, newContent);
    };

    // Só renderizamos o editor se um documento estiver selecionado E a página estiver montada.
    if (selectedDocument && isMounted) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-full p-4">
                <div className="mini-sidebar hidden md:block">
                    <HierarchicalSidebar 
                        treeData={documentTree} 
                        table="documentos"
                        title="NAVEGAR"
                    />
                </div>
                <TextEditor
                    key={selectedDocument.id}
                    initialContent={selectedDocument.content}
                    onSave={handleSave}
                    onClose={() => router.push('/documentos')}
                />
            </div>
        );
    }

    return (
        <div className="h-full p-4">
            <HierarchicalSidebar 
                treeData={documentTree} 
                table="documentos"
                title="DOCUMENTOS"
            />
        </div>
    );
}

