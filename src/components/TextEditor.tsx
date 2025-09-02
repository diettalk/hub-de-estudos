// src/components/TextEditor.tsx

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent } from '@tiptap/react';
import { 
    Italic, Bold, Link as LinkIcon, Youtube, Highlighter, Table as TableIcon, Underline, Palette, X, Pilcrow, Heading1, Heading2, Heading3, List, ListOrdered, Blockquote, CaseSensitive
} from 'lucide-react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import YoutubeExtension from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Typography from '@tiptap/extension-typography';
import { useDebouncedCallback } from 'use-debounce';

import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontSize } from '@/lib/FontSize';


const MenuBar = ({ editor, onClose }: { editor: Editor | null; onClose: () => void; }) => {
    // A lógica interna permanece, mas a renderização dos componentes da UI está desativada.
    if (!editor) {
        return null;
    }

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
            
            {/* --- PASSO DE DEPURAÇÃO 1 --- */}
            {/* Todos os componentes interativos foram removidos temporariamente. */}
            <p className="text-sm text-muted-foreground">Teste de Depuração da Barra de Ferramentas Ativo.</p>
            
            <div className="flex-grow"></div>

            {/* Mantemos apenas o botão de fechar, que já provou ser estável. */}
            <Button variant="ghost" size="icon" onClick={onClose} title="Fechar Editor">
                <X className="w-5 h-5" />
            </Button>
        </div>
    );
};

interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<any>;
  onClose: () => void;
}

function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
    const debouncedSave = useDebouncedCallback((editor) => {
        onSave(editor.getJSON());
    }, 1000);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            Typography,
            YoutubeExtension.configure({ nocookie: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            FontSize
        ],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none p-4 focus:outline-none flex-grow',
            },
        },
        onUpdate: ({ editor }) => {
            debouncedSave(editor);
        },
    });
    
    useEffect(() => {
        if (editor && initialContent) {
            const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(initialContent);
            if (!isSame) {
                editor.commands.setContent(initialContent, false);
            }
        }
    }, [initialContent, editor]);


    return (
        <div className="h-full flex flex-col border rounded-lg bg-card shadow-lg">
            <MenuBar editor={editor} onClose={onClose} />
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;

