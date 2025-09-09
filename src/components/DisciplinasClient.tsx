'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HierarchicalSidebar } from '@/components/HierarchicalSidebar';
import TextEditor from '@/components/TextEditor';
import { updatePaginaContent } from '@/app/actions';
import { type JSONContent } from '@tiptap/react';
import { type Node } from '@/lib/types';

interface DisciplinasClientProps {
    paginaTree: Node[];
    initialPage: Node | null;
}

export default function DisciplinasClient({ paginaTree, initialPage }: DisciplinasClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedPage, setSelectedPage] = useState(initialPage);

    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // ALTERADO: Captura o ID da URL ('page') para passar para a sidebar.
    const activeId = searchParams.get('page');

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

    if (selectedPage && isMounted) {
        return (
             <div className="flex gap-4 h-full p-4">
                <div className="hidden md:block w-[300px] flex-shrink-0">
                    <div className="sticky top-4 max-h-[calc(100vh-2rem)]">
                        <HierarchicalSidebar 
                            treeData={paginaTree}
                            table="paginas" // Lembre-se que aqui a tabela é 'paginas'
                            title="NAVEGAR"
                            // ALTERADO: Passa o ID ativo para a sidebar.
                            activeId={activeId}
                        />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <TextEditor
                        key={selectedPage.id}
                        initialContent={selectedPage.content}
                        onSave={handleSave}
                        onClose={() => router.push('/disciplinas')}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="h-full p-4 flex">
            <div className="flex-1 min-w-0">
                <HierarchicalSidebar 
                    treeData={paginaTree}
                    table="paginas" // E aqui também
                    title="DISCIPLINAS"
                    // ALTERADO: Passa o ID ativo também nesta visualização.
                    activeId={activeId}
                />
            </div>
        </div>
    );
}
