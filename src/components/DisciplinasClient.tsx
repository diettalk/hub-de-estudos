// src/components/DisciplinasClient.tsx

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import TextEditor from '@/components/TextEditor';
import { updatePaginaContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';

interface DisciplinasClientProps {
    paginaTree: Node[];
    initialPage: (Node & { content: any }) | null;
}

export default function DisciplinasClient({ paginaTree, initialPage }: DisciplinasClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [selectedPage, setSelectedPage] = useState(initialPage);

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

    if (selectedPage) {
        return (
            <div className="h-full w-full p-4">
                <TextEditor
                    key={selectedPage.id}
                    initialContent={selectedPage.content}
                    onSave={handleSave}
                    onClose={() => router.push('/disciplinas')}
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full p-4">
            <div className="md:col-span-1 h-full">
                <HierarchicalSidebar 
                    tree={paginaTree} 
                    table="paginas"
                    title="DISCIPLINAS"
                />
            </div>
            <div className="md:col-span-3 h-full">
                <div className="flex items-center justify-center h-full bg-card border rounded-lg">
                    <p className="text-muted-foreground">Selecione ou crie uma disciplina para começar.</p>
                </div>
            </div>
        </div>
    );
}
