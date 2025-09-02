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
             <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-full p-4">
                {/* --- CORREÇÃO DA SIDEBAR: Adicionamos 'flex flex-col' para que o filho ocupe toda a altura --- */}
                <div className="mini-sidebar hidden md:block h-full flex flex-col">
                    <HierarchicalSidebar 
                        treeData={paginaTree} 
                        table="paginas"
                        title="NAVEGAR"
                    />
                </div>
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
        <div className="h-full p-4">
            <HierarchicalSidebar 
                treeData={paginaTree} 
                table="paginas"
                title="DISCIPLINAS"
            />
        </div>
    );
}

