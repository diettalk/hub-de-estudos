'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HierarchicalSidebar, Node } from '@/components/HierarchicalSidebar';
import TextEditor from '@/components/TextEditor';
import { updateDocumentoContent } from '@/app/actions';
import { type Resource } from '@/lib/types';
import { type JSONContent } from '@tiptap/react';

// Função para construir a árvore a partir de uma lista plana
const buildTree = (items: Node[]): Node[] => {
    const map = new Map<number, Node>();
    const roots: Node[] = [];
    items.forEach(item => map.set(item.id, { ...item, children: [] }));
    items.forEach(item => {
        const node = map.get(item.id);
        if (node) {
            if (item.parent_id && map.has(item.parent_id)) {
                const parent = map.get(item.parent_id)!;
                if (!parent.children) parent.children = [];
                parent.children.push(node);
            } else {
                roots.push(node);
            }
        }
    });
    return roots;
};

export function DocumentosClient({ initialDocuments }: { initialDocuments: Resource[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedId = Number(searchParams.get('docId')) || null;

    const documentTree = buildTree(initialDocuments as Node[]);
    const selectedDocument = selectedId ? initialDocuments.find(d => d.id === selectedId) : null;

    const handleSave = async (newContent: JSONContent) => {
        if (selectedDocument) {
            // Criamos um FormData para ser compatível com a action
            const formData = new FormData();
            formData.append('id', String(selectedDocument.id));
            formData.append('title', selectedDocument.title);
            formData.append('content', JSON.stringify(newContent));
            await updateDocumentoContent(formData);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
            <div className="md:col-span-1 h-full">
                <HierarchicalSidebar 
                    tree={documentTree}
                    table="documentos"
                    title="DOCUMENTOS"
                    queryParam="docId" // Usamos um query param diferente para não conflitar
                />
            </div>
            <div className="md:col-span-3 h-full">
                {selectedDocument ? (
                    <TextEditor
                        key={selectedDocument.id}
                        initialContent={selectedDocument.content}
                        onSave={handleSave}
                    />
                ) : (
                    <div className="flex items-center justify-center h-full bg-card border rounded-lg">
                        <p className="text-muted-foreground">Selecione ou crie um documento para começar.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
