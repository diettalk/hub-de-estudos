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
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { FontSize } from '@/lib/FontSize'; // Desativado para o teste


const MenuBar = ({ editor, onClose }: { editor: Editor | null; onClose: () => void; }) => {
    const [highlightColor, setHighlightColor] = useState('#ffcc00');
    const [activeStates, setActiveStates] = useState({
        bold: false, italic: false, underline: false,
        bulletList: false, orderedList: false, blockquote: false,
        link: false, highlight: false,
        headingLevel: '0', fontSize: 'default'
    });

    useEffect(() => {
        if (editor) {
            const updateStates = () => {
                setActiveStates({
                    bold: editor.isActive('bold'),
                    italic: editor.isActive('italic'),
                    underline: editor.isActive('underline'),
                    bulletList: editor.isActive('bulletList'),
                    orderedList: editor.isActive('orderedList'),
                    blockquote: editor.isActive('blockquote'),
                    link: editor.isActive('link'),
                    highlight: editor.isActive('highlight'),
                    headingLevel: editor.isActive('heading', { level: 1 }) ? '1' : editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : '0',
                    fontSize: editor.getAttributes('textStyle').fontSize || 'default'
                });
            };
            
            editor.on('transaction', updateStates);
            editor.on('selectionUpdate', updateStates);
            updateStates();

            return () => {
                editor.off('transaction', updateStates);
                editor.off('selectionUpdate', updateStates);
            };
        }
    }, [editor]);

    const setLink = useCallback(() => {
        if (!editor) return;
        if (editor.isActive('link')) {
            return editor.chain().focus().unsetLink().run();
        }
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null || url === '') return;
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    if (!editor) return null;

    const handleHeadingChange = (value: string) => {
        const level = parseInt(value);
        if (level > 0) editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
        else editor.chain().focus().setParagraph().run();
    }
    
    // O handler de tamanho de fonte permanece, mas não será usado
    const handleFontSizeChange = (value: string) => {
        // if (value === 'default') editor.chain().focus().unsetFontSize().run();
        // else editor.chain().focus().setFontSize(value).run();
    }

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
            <Select value={activeStates.headingLevel} onValueChange={handleHeadingChange}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Estilo" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="0"><div className="flex items-center gap-2"><Pilcrow className="w-4 h-4" />Parágrafo</div></SelectItem>
                    <SelectItem value="1"><div className="flex items-center gap-2"><Heading1 className="w-4 h-4" />Título 1</div></SelectItem>
                    <SelectItem value="2"><div className="flex items-center gap-2"><Heading2 className="w-4 h-4" />Título 2</div></SelectItem>
                    <SelectItem value="3"><div className="flex items-center gap-2"><Heading3 className="w-4 h-4" />Título 3</div></SelectItem>
                </SelectContent>
            </Select>

            {/* O seletor de tamanho de fonte está temporariamente desativado */}

            <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={cn(activeStates.bold ? 'bg-accent text-accent-foreground' : '')} title="Negrito"><Bold className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn(activeStates.italic ? 'bg-accent text-accent-foreground' : '')} title="Itálico"><Italic className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn(activeStates.underline ? 'bg-accent text-accent-foreground' : '')} title="Sublinhado"><Underline className="w-4 h-4" /></Button>
            </div>

             <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(activeStates.bulletList ? 'bg-accent text-accent-foreground' : '')} title="Lista"><List className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(activeStates.orderedList ? 'bg-accent text-accent-foreground' : '')} title="Lista Numerada"><ListOrdered className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn(activeStates.blockquote ? 'bg-accent text-accent-foreground' : '')} title="Citação"><Blockquote className="w-4 h-4" /></Button>
            </div>

            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={setLink} className={cn(activeStates.link ? 'bg-accent text-accent-foreground' : '')} title="Adicionar Link"><LinkIcon className="w-4 h-4" /></Button>
                <div className="flex items-center rounded bg-transparent border">
                     <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()} className={cn(activeStates.highlight ? 'bg-accent text-accent-foreground' : '')} title="Marca Texto"><Highlighter className="w-4 h-4" /></Button>
                     <input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer" title="Escolher Cor do Marca-Texto"/>
                </div>
                <div className="flex items-center rounded bg-transparent border">
                    <Palette className="w-4 h-4 mx-1 text-muted-foreground" />
                    <input type="color" onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()} value={editor.getAttributes('textStyle').color || (typeof window !== 'undefined' && document.body.classList.contains('dark') ? '#ffffff' : '#000000')} className="w-6 h-6 p-0 border-none bg-transparent rounded cursor-pointer" title="Cor da Fonte" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Inserir Tabela"><TableIcon className="w-4 h-4" /></Button>
            </div>

            <div className="flex-grow"></div>
            <Button variant="ghost" size="icon" onClick={onClose} title="Fechar Editor"><X className="w-5 h-5" /></Button>
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
            StarterKit, Highlight.configure({ multicolor: true }), TextStyle, Color,
            Typography, YoutubeExtension.configure({ nocookie: true }),
            Table.configure({ resizable: true }), TableRow, TableHeader, TableCell, 
            // FontSize // Desativado para o teste
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

