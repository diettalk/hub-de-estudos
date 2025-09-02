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

    useEffect(() => {
        const id = searchParams.get('id');
        // Se temos um ID na URL e o documento inicial corresponde, definimo-lo como selecionado.
        if (id && initialDocument && String(initialDocument.id) === id) {
            setSelectedDocument(initialDocument);
        } else if (!id) {
            // Se não há ID na URL, garantimos que nenhum documento está selecionado.
            setSelectedDocument(null);
        }
    }, [searchParams, initialDocument]);

    const handleSave = async (newContent: JSONContent) => {
        if (!selectedDocument) return;
        await updateDocumentoContent(selectedDocument.id, newContent);
    };

    // NOVO LAYOUT: Se um documento estiver selecionado, mostramos a mini-sidebar e o editor.
    if (selectedDocument) {
        return (
            <div className="grid grid-cols-[300px_1fr] h-full gap-4 p-4">
                {/* Coluna da Esquerda: Mini-Sidebar de Navegação */}
                <div className="h-full flex flex-col">
                    <h2 className="text-lg font-bold uppercase tracking-wider mb-4 pb-4 border-b">NAVEGAR</h2>
                    <div className="flex-grow overflow-hidden -mr-2 pr-2 mini-sidebar">
                         <HierarchicalSidebar 
                            treeData={documentTree} 
                            table="documentos"
                            title="" // O título agora está fora do componente
                         />
                    </div>
                </div>

                {/* Coluna da Direita: Editor de Texto */}
                <div className="h-full w-full">
                    <TextEditor
                        key={selectedDocument.id} // A chave garante que o editor reinicie ao trocar de doc
                        initialContent={selectedDocument.content}
                        onSave={handleSave}
                        onClose={() => router.push('/documentos')}
                    />
                </div>
            </div>
        );
    }

    // Layout Padrão: Apenas a sidebar principal
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
