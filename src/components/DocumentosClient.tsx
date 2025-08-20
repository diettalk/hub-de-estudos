// src/components/DocumentosClient.tsx

'use client';

import { useState, useTransition } from 'react';
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
    
    // O estado 'selectedDocument' controla se o editor está visível
    const [selectedDocument, setSelectedDocument] = useState(initialDocument);

    // Atualiza o documento selecionado se o URL mudar
    useState(() => {
        const id = searchParams.get('id');
        if (id && initialDocument && Number(id) === initialDocument.id) {
            setSelectedDocument(initialDocument);
        } else if (!id) {
            setSelectedDocument(null);
        }
    });

    const handleSave = async (newContent: JSONContent) => {
        if (!selectedDocument) return;
        await updateDocumentoContent(selectedDocument.id, newContent);
    };

    // Se um documento estiver selecionado, mostra o editor em "tela cheia"
    if (selectedDocument) {
        return (
            <div className="h-full w-full p-4">
                <TextEditor
                    key={selectedDocument.id}
                    initialContent={selectedDocument.content}
                    onSave={handleSave}
                    onClose={() => router.push('/documentos')} // Redireciona para limpar o URL
                />
            </div>
        );
    }

    // Visualização padrão com a barra lateral
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 h-full">
            <div className="md:col-span-1 h-full p-4">
                <HierarchicalSidebar 
                    tree={documentTree} 
                    table="documentos"
                    title="DOCUMENTOS"
                />
            </div>
            <div className="md:col-span-3 h-full flex flex-col p-4">
                <div className="flex items-center justify-center h-full bg-card border rounded-lg">
                    <p className="text-muted-foreground">Selecione ou crie um documento para começar.</p>
                </div>
            </div>
        </div>
    );
}
