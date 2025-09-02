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

    // Lógica dos handlers que os Selects precisam
    const handleHeadingChange = (value: string) => {
        const level = parseInt(value);
        if (level > 0) {
            editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
        } else {
            editor.chain().focus().setParagraph().run();
        }
    }
    
    const handleFontSizeChange = (value: string) => {
        if (value === 'default') {
            editor.chain().focus().unsetFontSize().run();
        } else {
            editor.chain().focus().setFontSize(value).run();
        }
    }

    const getCurrentHeadingLevel = () => {
        if (editor.isActive('heading', { level: 1 })) return '1';
        if (editor.isActive('heading', { level: 2 })) return '2';
        if (editor.isActive('heading', { level: 3 })) return '3';
        return '0';
    }

    const getCurrentFontSize = () => {
        return editor.getAttributes('textStyle').fontSize || 'default';
    }


    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
            
            {/* --- PASSO DE DEPURAÇÃO 2: Reativando os SELECTS --- */}
            <Select value={getCurrentHeadingLevel()} onValueChange={handleHeadingChange}>
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Estilo" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="0"><div className="flex items-center gap-2"><Pilcrow className="w-4 h-4" />Parágrafo</div></SelectItem>
                    <SelectItem value="1"><div className="flex items-center gap-2"><Heading1 className="w-4 h-4" />Título 1</div></SelectItem>
                    <SelectItem value="2"><div className="flex items-center gap-2"><Heading2 className="w-4 h-4" />Título 2</div></SelectItem>
                    <SelectItem value="3"><div className="flex items-center gap-2"><Heading3 className="w-4 h-4" />Título 3</div></SelectItem>
                </SelectContent>
            </Select>

            <Select value={getCurrentFontSize()} onValueChange={handleFontSizeChange}>
                <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Tamanho" />
                </SelectTrigger>
                <SelectContent>
                     <SelectItem value="default"><div className="flex items-center gap-2"><CaseSensitive className="w-4 h-4" />Normal</div></SelectItem>
                     <SelectItem value="0.75rem"><span className="text-xs">Pequeno</span></SelectItem>
                     <SelectItem value="1.25rem"><span className="text-lg">Grande</span></SelectItem>
                     <SelectItem value="1.5rem"><span className="text-xl">Extra Grande</span></SelectItem>
                </SelectContent>
            </Select>
            
            <div className="flex-grow"></div>

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

