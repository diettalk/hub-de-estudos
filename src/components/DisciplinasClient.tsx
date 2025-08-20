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

    // Se uma disciplina estiver selecionada, mostra o editor em tela cheia
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

    // [NOVO LAYOUT] Se nenhuma disciplina estiver selecionada, mostra apenas a sidebar
    return (
        <div className="h-full p-4">
            <HierarchicalSidebar 
                tree={paginaTree} 
                table="paginas"
                title="DISCIPLINAS"
            />
        </div>
    );
}
