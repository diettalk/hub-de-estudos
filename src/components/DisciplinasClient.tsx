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

    useEffect(() => {
        const id = searchParams.get('page');
         if (id && initialPage && String(initialPage.id) === id) {
            setSelectedPage(initialPage);
        } else if (!id) {
            setSelectedPage(null);
        }
    }, [searchParams, initialPage]);

    const handleSave = async (newContent: JSONContent) => {
        if (!selectedPage) return;
        await updatePaginaContent(selectedPage.id, newContent);
    };

    // NOVO LAYOUT: Se uma página estiver selecionada, mostramos a mini-sidebar e o editor.
    if (selectedPage) {
        return (
             <div className="grid grid-cols-[300px_1fr] h-full gap-4 p-4">
                {/* Coluna da Esquerda: Mini-Sidebar de Navegação */}
                <div className="h-full flex flex-col">
                     <h2 className="text-lg font-bold uppercase tracking-wider mb-4 pb-4 border-b">NAVEGAR</h2>
                     <div className="flex-grow overflow-hidden -mr-2 pr-2 mini-sidebar">
                          <HierarchicalSidebar 
                             treeData={paginaTree} 
                             table="paginas"
                             title=""
                          />
                     </div>
                </div>

                {/* Coluna da Direita: Editor de Texto */}
                <div className="h-full w-full">
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

    // Layout Padrão: Apenas a sidebar principal
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
