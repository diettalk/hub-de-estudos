// src/components/TextEditor.tsx

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent } from '@tiptap/react';
import { 
    Italic, Bold, Link as LinkIcon, Youtube, Highlighter, Table as TableIcon, 
    Underline, Palette, X, Pilcrow, Heading1, Heading2, Heading3, 
    List, ListOrdered, CheckSquare
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
import { useDebouncedCallback } from 'use-debounce';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

// Novas extensões para funcionalidades avançadas
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import FontFamily from '@tiptap/extension-font-family';

import './TextEditor.css';

// ============================================================================
// --- MenuBar (Reconstruída com Novas Funcionalidades) ---
// ============================================================================
const MenuBar = ({ editor, onClose }: { editor: Editor; onClose: () => void; }) => {
    const [highlightColor, setHighlightColor] = useState('#ffcc00');
    
    // Força a re-renderização para que os botões "ativos" atualizem
    const [_, setForceUpdate] = useState(0);
    useEffect(() => {
        const updateListener = () => setForceUpdate(val => val + 1);
        editor.on('transaction', updateListener);
        editor.on('selectionUpdate', updateListener);
        return () => {
            editor.off('transaction', updateListener);
            editor.off('selectionUpdate', updateListener);
        };
    }, [editor]);

    const setLink = useCallback(() => {
        if (editor.isActive('link')) {
            return editor.chain().focus().unsetLink().run();
        }
        const url = window.prompt('URL', editor.getAttributes('link').href);
        if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addYoutubeVideo = useCallback(() => {
        const url = prompt('Cole a URL do vídeo do YouTube:');
        if (url) editor.commands.setYoutubeVideo({ src: url });
    }, [editor]);

    const buttonClass = "p-2 rounded inline-flex items-center justify-center text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors";
    const activeClass = "bg-accent text-accent-foreground";
    const selectClass = "h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
            {/* GRUPO: FONTES E TÍTULOS */}
            <select
                className={cn(selectClass, "w-[120px]")}
                value={ editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p' }
                onChange={(e) => {
                    const value = e.target.value;
                    if (value === 'p') editor.chain().focus().setParagraph().run();
                    else editor.chain().focus().toggleHeading({ level: parseInt(value.replace('h', '')) as 1 | 2 | 3 }).run()
                }}
            >
                <option value="p">Parágrafo</option>
                <option value="h1">Título 1</option>
                <option value="h2">Título 2</option>
                <option value="h3">Título 3</option>
            </select>
            <select
                className={cn(selectClass, "w-[120px]")}
                value={editor.getAttributes('textStyle').fontFamily || 'default'}
                onChange={(e) => e.target.value === 'default' ? editor.chain().focus().unsetFontFamily().run() : editor.chain().focus().setFontFamily(e.target.value).run()}
            >
                <option value="default">Padrão</option>
                <option value="Inter">Inter (Sans)</option>
                <option value="serif">Serif</option>
                <option value="monospace">Mono</option>
            </select>
            
            {/* GRUPO: ESTILOS BÁSICOS */}
            <div className="flex items-center gap-1">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn(buttonClass, editor.isActive('bold') && activeClass)} title="Negrito"><Bold className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn(buttonClass, editor.isActive('italic') && activeClass)} title="Itálico"><Italic className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn(buttonClass, editor.isActive('underline') && activeClass)} title="Sublinhado"><Underline className="w-4 h-4" /></button>
            </div>
            
            {/* GRUPO: LISTAS */}
            <div className="flex items-center gap-1">
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(buttonClass, editor.isActive('bulletList') && activeClass)} title="Lista"><List className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(buttonClass, editor.isActive('orderedList') && activeClass)} title="Lista Numerada"><ListOrdered className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={cn(buttonClass, editor.isActive('taskList') && activeClass)} title="Lista de Tarefas"><CheckSquare className="w-4 h-4" /></button>
            </div>

            {/* GRUPO: INSERÇÃO E CORES */}
            <div className="flex items-center gap-2">
                 <button onClick={setLink} className={cn(buttonClass, editor.isActive('link') && activeClass)} title="Link"><LinkIcon className="w-4 h-4" /></button>
                 <div className="flex items-center rounded border"><button onClick={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()} className={cn(buttonClass, editor.isActive('highlight') && activeClass)} title="Marca Texto"><Highlighter className="w-4 h-4" /></button><input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer"/></div>
                 <div className="flex items-center rounded border"><Palette className="w-4 h-4 mx-1 text-muted-foreground" /><input type="color" onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} value={editor.getAttributes('textStyle').color || '#000000'} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer"/></div>
                 <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className={buttonClass} title="Tabela"><TableIcon className="w-4 h-4" /></button>
                 <button onClick={addYoutubeVideo} className={buttonClass} title="YouTube"><Youtube className="w-4 h-4" /></button>
            </div>
            
            <div className="flex-grow"></div>
            <button onClick={onClose} className={buttonClass} title="Fechar"><X className="w-5 h-5" /></button>
        </div>
    );
};

// ============================================================================
// --- Componente TextEditor ---
// ============================================================================
interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<any>;
  onClose: () => void;
}

function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
    const [isEditorReady, setIsEditorReady] = useState(false);
    const debouncedSave = useDebouncedCallback((editor) => onSave(editor.getJSON()), 1000);

    const editor = useEditor({
        extensions: [
            StarterKit, Highlight.configure({ multicolor: true }), TextStyle, Color,
            Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
            YoutubeExtension.configure({ nocookie: true }),
            // Adicionando as novas extensões
            FontFamily,
            TaskList,
            TaskItem.configure({ nested: true }),
        ],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none p-4 focus:outline-none flex-grow',
            },
        },
        onUpdate: ({ editor }) => debouncedSave(editor),
        onCreate: () => setIsEditorReady(true),
    });
    
    useEffect(() => {
        if (editor && initialContent) {
            const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(initialContent);
            if (!isSame) editor.commands.setContent(initialContent, false);
        }
    }, [initialContent, editor]);

    return (
        <div className="h-full flex flex-col border rounded-lg bg-card shadow-lg">
            {editor && isEditorReady && <MenuBar editor={editor} onClose={onClose} />}
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;

