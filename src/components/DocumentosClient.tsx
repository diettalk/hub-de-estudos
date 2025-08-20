// src/components/DocumentosClient.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import TextEditor from '@/components/TextEditor';
import { updateDocumentoContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';

interface DocumentosClientProps {
    documentTree: Node[];
    initialDocument: (Node & { content: any }) | null;
}

export default function DocumentosClient({ documentTree, initialDocument }: DocumentosClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Este estado controla se o editor está visível (modo de foco)
    const [selectedDocument, setSelectedDocument] = useState(initialDocument);

    // Sincroniza o estado com o URL, garantindo que a navegação funcione
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

    // Se um documento estiver selecionado, mostra o editor em tela cheia
    if (selectedDocument) {
        return (
            <div className="h-full w-full p-4">
                <TextEditor
                    key={selectedDocument.id}
                    initialContent={selectedDocument.content}
                    onSave={handleSave}
                    onClose={() => router.push('/documentos')} // Limpa o URL para voltar à sidebar
                />
            </div>
        );
    }

    // [NOVO LAYOUT] Se nenhum documento estiver selecionado, mostra apenas a sidebar
    return (
        <div className="h-full p-4">
            <HierarchicalSidebar 
                tree={documentTree} 
                table="documentos"
                title="DOCUMENTOS"
            />
        </div>
    );
}
