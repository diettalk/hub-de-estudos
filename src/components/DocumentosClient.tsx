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
    
    // Este estado garante que o editor só renderize no cliente, evitando erros de hidratação.
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
        await updateDocumentoContent(selectedDocument.id, newContent);
    };

    if (selectedDocument && isMounted) {
        return (
            // --- CORREÇÃO DA SIDEBAR: Trocamos Grid por Flexbox para um layout mais dinâmico ---
            <div className="flex gap-4 h-full p-4">
                <div className="hidden md:block w-[300px] flex-shrink-0">
                    {/* A sidebar agora é "pegajosa" (sticky) e tem uma altura máxima */}
                    <div className="sticky top-4 max-h-[calc(100vh-2rem)]">
                        <HierarchicalSidebar 
                            treeData={documentTree} 
                            table="documentos"
                            title="NAVEGAR"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0"> {/* Garante que o editor possa encolher */}
                    <TextEditor
                        key={selectedDocument.id} // A chave garante que o editor reinicie ao mudar de doc
                        initialContent={selectedDocument.content}
                        onSave={handleSave}
                        onClose={() => router.push('/documentos')}
                    />
                </div>
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

