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

    if (selectedDocument) {
        return (
            <div className="h-full w-full p-4">
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

