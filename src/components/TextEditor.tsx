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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import FontFamily from '@tiptap/extension-font-family';

import './TextEditor.css';

// ============================================================================
// --- MenuBar ---
// ============================================================================
// ALTERADO: Adicionamos a prop 'onSave' para acionamento manual
const MenuBar = React.memo(({ editor, onClose, onSave }: { editor: Editor; onClose: () => void; onSave: () => void; }) => {
    const [highlightColor, setHighlightColor] = useState('#ffcc00');
    
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

    const setLink = useCallback(() => { /* ...código inalterado... */ }, [editor]);
    const addYoutubeVideo = useCallback(() => { /* ...código inalterado... */ }, [editor]);

    const activeClass = "bg-accent text-accent-foreground";
    const selectClass = "h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
            {/* ...outros botões e selects inalterados... */}
            
            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="sm" onClick={setLink} className={cn(editor.isActive('link') && activeClass)} title="Link"><LinkIcon className="w-4 h-4" /></Button>
                 <div className="flex items-center rounded border"><Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()} className={cn(editor.isActive('highlight') && activeClass)} title="Marca Texto"><Highlighter className="w-4 h-4" /></Button><input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer"/></div>
                 
                 {/* ALTERADO: O onInput agora também chama a função onSave */}
                 <div className="flex items-center rounded border">
                    <Palette className="w-4 h-4 mx-1 text-muted-foreground" />
                    <input 
                      type="color" 
                      onInput={(e) => {
                        const newColor = (e.target as HTMLInputElement).value;
                        editor.chain().focus().setColor(newColor).run();
                        // Força o salvamento imediatamente após a mudança de cor
                        onSave();
                      }} 
                      value={editor.getAttributes('textStyle').color || '#ffffff'} // Mudei o default para branco para temas escuros
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

// ============================================================================
// --- Componente Principal TextEditor ---
// ============================================================================
interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<any>;
  onClose: () => void;
}

function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
    const [isEditorReady, setIsEditorReady] = useState(false);
    // IMPORTANTE: Passamos o editor para a função de debounce
    const debouncedSave = useDebouncedCallback((currentEditor: Editor) => {
        if (currentEditor && !currentEditor.isDestroyed) {
            onSave(currentEditor.getJSON());
        }
    }, 1000);

    const editor = useEditor({
        // A configuração das extensões pode voltar ao que estava, pois a correção é manual agora
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                bulletList: { keepMarks: true, keepAttributes: true },
                orderedList: { keepMarks: true, keepAttributes: true },
            }),
            Highlight.configure({ multicolor: true }), 
            TextStyle, 
            Color.configure({ types: ['textStyle'] }),
            FontFamily.configure({ types: ['textStyle'] }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Table.configure({ resizable: true }), 
            TableRow, 
            TableHeader, 
            TableCell,
            YoutubeExtension.configure({ nocookie: true }),
        ],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none p-4 focus:outline-none flex-grow',
            },
        },
        // O onUpdate continua a funcionar para todas as outras alterações
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
            {/* ALTERADO: Passamos a função de salvamento para o MenuBar */}
            {editor && isEditorReady && <MenuBar editor={editor} onClose={onClose} onSave={() => debouncedSave(editor)} />}
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;

