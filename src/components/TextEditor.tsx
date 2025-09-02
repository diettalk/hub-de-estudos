// src/components/TextEditor.tsx

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent } from '@tiptap/react';
import { 
    Italic, Bold, Link as LinkIcon, Highlighter, Table as TableIcon, Underline, X, Pilcrow, Heading1, Heading2, Heading3, List, ListOrdered, Blockquote, CaseSensitive, Palette, Youtube
} from 'lucide-react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Typography from '@tiptap/extension-typography';
import { useDebouncedCallback } from 'use-debounce';
import { cn } from '@/lib/utils';
import { FontSize } from '@/lib/FontSize';

// --- CORREÇÃO: Adicionando as importações que faltavam ---
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import YoutubeExtension from '@tiptap/extension-youtube';

// ============================================================================
// --- Componente MenuBar (Arquitetura Estável) ---
// ============================================================================
interface MenuBarProps {
  editor: Editor; // Agora é garantido que o editor existe
  activeStates: {
    bold: boolean; italic: boolean; underline: boolean;
    bulletList: boolean; orderedList: boolean; blockquote: boolean;
    link: boolean; highlight: boolean;
    headingLevel: string; fontSize: string;
  };
  handlers: {
    toggleBold: () => void; toggleItalic: () => void; toggleUnderline: () => void;
    toggleBulletList: () => void; toggleOrderedList: () => void; toggleBlockquote: () => void;
    setLink: () => void; toggleHighlight: () => void;
    handleHeadingChange: (value: string) => void;
    handleFontSizeChange: (value: string) => void;
    insertTable: () => void;
    setColor: (color: string) => void;
    addYoutubeVideo: () => void;
  };
  highlightColor: string;
  setHighlightColor: (color: string) => void;
  currentColor: string;
  onClose: () => void;
}

const MenuBar = ({ editor, activeStates, handlers, highlightColor, setHighlightColor, currentColor, onClose }: MenuBarProps) => {
    const buttonClass = "p-2 rounded inline-flex items-center justify-center text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50";
    const activeClass = "bg-accent text-accent-foreground";
    const selectTriggerClass = "flex h-10 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 w-[130px]";

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
            <select value={activeStates.headingLevel} onChange={(e) => handlers.handleHeadingChange(e.target.value)} className={selectTriggerClass}>
                <option value="0">Parágrafo</option>
                <option value="1">Título 1</option>
                <option value="2">Título 2</option>
                <option value="3">Título 3</option>
            </select>
            <select value={activeStates.fontSize} onChange={(e) => handlers.handleFontSizeChange(e.target.value)} className={selectTriggerClass}>
                <option value="default">Normal</option>
                <option value="0.75rem">Pequeno</option>
                <option value="1.25rem">Grande</option>
                <option value="1.5rem">Extra Grande</option>
            </select>

            <div className="flex items-center gap-1">
                <button onClick={handlers.toggleBold} className={cn(buttonClass, activeStates.bold && activeClass)} title="Negrito"><Bold className="w-4 h-4" /></button>
                <button onClick={handlers.toggleItalic} className={cn(buttonClass, activeStates.italic && activeClass)} title="Itálico"><Italic className="w-4 h-4" /></button>
                <button onClick={handlers.toggleUnderline} className={cn(buttonClass, activeStates.underline && activeClass)} title="Sublinhado"><Underline className="w-4 h-4" /></button>
            </div>

            <div className="flex items-center gap-1">
                <button onClick={handlers.toggleBulletList} className={cn(buttonClass, activeStates.bulletList && activeClass)} title="Lista"><List className="w-4 h-4" /></button>
                <button onClick={handlers.toggleOrderedList} className={cn(buttonClass, activeStates.orderedList && activeClass)} title="Lista Numerada"><ListOrdered className="w-4 h-4" /></button>
                <button onClick={handlers.toggleBlockquote} className={cn(buttonClass, activeStates.blockquote && activeClass)} title="Citação"><Blockquote className="w-4 h-4" /></button>
            </div>

            <div className="flex items-center gap-2">
                <button onClick={handlers.setLink} className={cn(buttonClass, activeStates.link && activeClass)} title="Adicionar Link"><LinkIcon className="w-4 h-4" /></button>
                <div className="flex items-center rounded border"><button onClick={handlers.toggleHighlight} className={cn(buttonClass, activeStates.highlight && activeClass)} title="Marca Texto"><Highlighter className="w-4 h-4" /></button><input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer"/></div>
                <div className="flex items-center rounded border"><Palette className="w-4 h-4 mx-1 text-muted-foreground" /><input type="color" onInput={(e) => handlers.setColor((e.target as HTMLInputElement).value)} value={currentColor} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer"/></div>
                <button onClick={handlers.insertTable} className={buttonClass} title="Inserir Tabela"><TableIcon className="w-4 h-4" /></button>
                <button onClick={handlers.addYoutubeVideo} className={buttonClass} title="Inserir Vídeo do YouTube"><Youtube className="w-4 h-4" /></button>
            </div>

            <div className="flex-grow"></div>
            <button onClick={onClose} className={buttonClass} title="Fechar Editor"><X className="w-5 h-5" /></button>
        </div>
    );
};


// ============================================================================
// --- Componente TextEditor (O Cérebro) ---
// ============================================================================
interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<any>;
  onClose: () => void;
}

function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
    const [activeStates, setActiveStates] = useState({
        bold: false, italic: false, underline: false, bulletList: false, orderedList: false, 
        blockquote: false, link: false, highlight: false, headingLevel: '0', fontSize: 'default'
    });
    const [highlightColor, setHighlightColor] = useState('#ffcc00');
    const [currentColor, setCurrentColor] = useState('#000000');

    const debouncedSave = useDebouncedCallback((editor) => {
        onSave(editor.getJSON());
    }, 1000);

    const editor = useEditor({
        extensions: [
            StarterKit, Highlight.configure({ multicolor: true }), TextStyle, Color,
            Typography, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell, FontSize,
            YoutubeExtension.configure({ nocookie: true })
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
        onSelectionUpdate: ({ editor }) => {
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
            setCurrentColor(editor.getAttributes('textStyle').color || (typeof window !== 'undefined' && document.body.classList.contains('dark') ? '#ffffff' : '#000000'));
        }
    });
    
    useEffect(() => {
        if (editor && initialContent) {
            const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(initialContent);
            if (!isSame) editor.commands.setContent(initialContent, false);
        }
    }, [initialContent, editor]);

    const handlers = {
        toggleBold: () => editor?.chain().focus().toggleBold().run(),
        toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
        toggleUnderline: () => editor?.chain().focus().toggleUnderline().run(),
        toggleBulletList: () => editor?.chain().focus().toggleBulletList().run(),
        toggleOrderedList: () => editor?.chain().focus().toggleOrderedList().run(),
        toggleBlockquote: () => editor?.chain().focus().toggleBlockquote().run(),
        setLink: useCallback(() => {
            if (!editor) return;
            if (editor.isActive('link')) return editor.chain().focus().unsetLink().run();
            const url = window.prompt('URL', editor.getAttributes('link').href);
            if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
        }, [editor]),
        toggleHighlight: () => editor?.chain().focus().toggleHighlight({ color: highlightColor }).run(),
        handleHeadingChange: (value: string) => {
            const level = parseInt(value);
            if (level > 0) editor?.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 }).run();
            else editor?.chain().focus().setParagraph().run();
        },
        handleFontSizeChange: (value: string) => {
            if (value === 'default') editor?.chain().focus().unsetFontSize().run();
            else editor?.chain().focus().setFontSize(value).run();
        },
        insertTable: () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        setColor: (color: string) => editor?.chain().focus().setColor(color).run(),
        addYoutubeVideo: useCallback(() => {
            if (!editor) return;
            const url = prompt('Cole a URL do vídeo do YouTube:');
            if (url) editor.commands.setYoutubeVideo({ src: url });
        }, [editor]),
    };

    return (
        <div className="h-full flex flex-col border rounded-lg bg-card shadow-lg">
            {editor && (
                <MenuBar 
                    editor={editor} 
                    activeStates={activeStates}
                    handlers={handlers}
                    highlightColor={highlightColor}
                    setHighlightColor={setHighlightColor}
                    currentColor={currentColor}
                    onClose={onClose} 
                />
            )}
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;

