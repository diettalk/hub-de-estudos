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
            <div className="flex gap-4 h-full p-4">
                <div className="hidden md:block w-[300px] flex-shrink-0">
                    <div className="sticky top-4 max-h-[calc(100vh-2rem)]">
                        <HierarchicalSidebar 
                            treeData={documentTree} // IDs devem ser string!
                            table="documentos"
                            title="NAVEGAR"
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
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

    // Sidebar ocupa toda a largura quando nada está selecionado
    return (
        <div className="h-full p-4 flex">
            <div className="flex-1 min-w-0">
                <HierarchicalSidebar 
                    treeData={documentTree} // IDs devem ser string!
                    table="documentos"
                    title="DOCUMENTOS"
                />
            </div>
        </div>
    );
}

