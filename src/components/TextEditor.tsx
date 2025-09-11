'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent } from '@tiptap/react';
import { 
    Italic, Bold, Link as LinkIcon, Youtube, Highlighter, Table as TableIcon, 
    Underline, Palette, X,
    List, ListOrdered, CheckSquare
} from 'lucide-react';

// Importações Manuais
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Heading from '@tiptap/extension-heading';
import BoldExtension from '@tiptap/extension-bold';
import ItalicExtension from '@tiptap/extension-italic';
import UnderlineExtension from '@tiptap/extension-underline';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import History from '@tiptap/extension-history';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import YoutubeExtension from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import FontFamily from '@tiptap/extension-font-family';
import CharacterCount from '@tiptap/extension-character-count';

import { SlashCommand } from './SlashCommandList';
// CORREÇÃO: Importa as extensões dos seus ficheiros corretos e separados
import { WikiLink } from './WikiLink';
import { WikiLinkSuggestion } from './WikiLinkSuggestion';

import './TextEditor.css';

// O MenuBar permanece o mesmo
const MenuBar = React.memo(({ editor, onClose }: { editor: Editor; onClose: () => void; }) => {
    const [highlightColor, setHighlightColor] = useState('#ffcc00');
    const [currentColor, setCurrentColor] = useState(editor.getAttributes('textStyle').color || '#ffffff');

    const updateListener = useCallback(() => {
        setCurrentColor(editor.getAttributes('textStyle').color || '#ffffff');
    }, [editor]);

    useEffect(() => {
        editor.on('transaction', updateListener);
        editor.on('selectionUpdate', updateListener);
        return () => {
            editor.off('transaction', updateListener);
            editor.off('selectionUpdate', updateListener);
        };
    }, [editor, updateListener]);

    const setLink = useCallback(() => {
        if (editor.isActive('link')) return editor.chain().focus().unsetLink().run();
        const url = window.prompt('URL', editor.getAttributes('link').href || '');
        if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addYoutubeVideo = useCallback(() => {
        const url = prompt('Cole a URL do vídeo do YouTube:');
        if (url) editor.commands.setYoutubeVideo({ src: url });
    }, [editor]);

    const activeClass = "bg-accent text-accent-foreground";
    const selectClass = "h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
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
                onChange={(e) => {
                    if (e.target.value === 'default') editor.chain().focus().unsetFontFamily().run();
                    else editor.chain().focus().setFontFamily(e.target.value).run();
                }}
            >
                <option value="default">Padrão</option>
                <option value="Inter">Inter</option>
                <option value="serif">Serif</option>
                <option value="monospace">Mono</option>
            </select>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={cn(editor.isActive('bold') && activeClass)} title="Negrito"><Bold className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn(editor.isActive('italic') && activeClass)} title="Itálico"><Italic className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn(editor.isActive('underline') && activeClass)} title="Sublinhado"><Underline className="w-4 h-4" /></Button>
            </div>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(editor.isActive('bulletList') && activeClass)} title="Lista"><List className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(editor.isActive('orderedList') && activeClass)} title="Lista Numerada"><ListOrdered className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleTaskList().run()} className={cn(editor.isActive('taskList') && activeClass)} title="Lista de Tarefas"><CheckSquare className="w-4 h-4" /></Button>
            </div>
            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="sm" onClick={setLink} className={cn(editor.isActive('link') && activeClass)} title="Link"><LinkIcon className="w-4 h-4" /></Button>
                 <div className="flex items-center rounded border"><Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()} className={cn(editor.isActive('highlight') && activeClass)} title="Marca Texto"><Highlighter className="w-4 h-4" /></Button><input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer"/></div>
                 <div className="flex items-center rounded border">
                    <Palette className="w-4 h-4 mx-1 text-muted-foreground" />
                    <input 
                      type="color" 
                      onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
                      value={currentColor}
                      className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer"
                    />
                 </div>
                 <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Tabela"><TableIcon className="w-4 h-4" /></Button>
                 <Button variant="ghost" size="sm" onClick={addYoutubeVideo} title="YouTube"><Youtube className="w-4 h-4" /></Button>
            </div>
            <div className="flex-grow"></div>
            <Button variant="ghost" size="icon" onClick={onClose} title="Fechar"><X className="w-5 h-5" /></Button>
        </div>
    );
});
MenuBar.displayName = 'MenuBar';

interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<any>;
  onClose: () => void;
}

function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
    const [isEditorReady, setIsEditorReady] = useState(false);
    const debouncedSave = useDebouncedCallback((editor: Editor) => {
        if (editor && !editor.isDestroyed) {
            onSave(editor.getJSON());
        }
    }, 1000);

    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            Document, Paragraph, Text, History,
            Heading.configure({ levels: [1, 2, 3] }),
            BulletList, OrderedList, ListItem,
            TaskList, TaskItem.configure({ nested: true }),
            BoldExtension, ItalicExtension, UnderlineExtension,
            Link.configure({ openOnClick: false }),
            Highlight.configure({ multicolor: true }), 
            TextStyle, Color, FontFamily,
            Table.configure({ resizable: true }), TableRow, TableHeader, TableCell,
            YoutubeExtension.configure({ nocookie: true }),
            CharacterCount,
            SlashCommand,
            WikiLink, // Registra a Mark do link
            WikiLinkSuggestion, // Registra o plugin de sugestão
        ],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none p-4 focus:outline-none flex-grow',
            },
        },
        onUpdate: ({ editor }) => { debouncedSave(editor); },
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
            <style jsx global>{`
                .prose .wiki-link {
                  text-decoration: none;
                  border-bottom: 1px dashed hsl(var(--primary));
                  color: hsl(var(--primary));
                  background-color: hsl(var(--primary) / 0.1);
                  padding: 0 2px;
                  border-radius: 3px;
                  transition: all 0.2s;
                  cursor: pointer;
                }

                .prose .wiki-link:hover {
                  background-color: hsl(var(--primary) / 0.2);
                  border-bottom-style: solid;
                }
            `}</style>
            
            {editor && isEditorReady && <MenuBar editor={editor} onClose={onClose} />}
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;

