'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent, BubbleMenu } from '@tiptap/react';
import { 
    Italic, Bold, Link as LinkIcon, Youtube, Highlighter, Table as TableIcon, Underline, Palette
} from 'lucide-react';

// Imports de Extensões do Tiptap
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
// 1. CORREÇÃO: Remover a importação explícita de Link e Underline, pois já vêm no StarterKit
// import TiptapLink from '@tiptap/extension-link';
// import TiptapUnderline from '@tiptap/extension-underline';
import YoutubeExtension from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';


import './TextEditor.css';

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null;
    
    const [highlightColor, setHighlightColor] = useState('#ffcc00');

    const setLink = useCallback(() => {
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null) return;
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addYoutubeVideo = useCallback(() => {
        const url = prompt('Cole a URL do vídeo do YouTube:');
        if (url) {
            editor.commands.setYoutubeVideo({ src: url });
        }
    }, [editor]);

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center">
            <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-primary text-primary-foreground p-2 rounded' : 'bg-secondary p-2 rounded'} title="Negrito"><Bold className="w-4 h-4" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-primary text-primary-foreground p-2 rounded' : 'bg-secondary p-2 rounded'} title="Itálico"><Italic className="w-4 h-4" /></button>
            <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive('underline') ? 'bg-primary text-primary-foreground p-2 rounded' : 'bg-secondary p-2 rounded'} title="Sublinhado"><Underline className="w-4 h-4" /></button>
            <button type="button" onClick={setLink} className={editor.isActive('link') ? 'bg-primary text-primary-foreground p-2 rounded' : 'bg-secondary p-2 rounded'} title="Adicionar Link"><LinkIcon className="w-4 h-4" /></button>
            <div className="flex items-center bg-secondary rounded">
                <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()} className={editor.isActive('highlight') ? 'bg-primary text-primary-foreground p-2 rounded-l' : 'p-2 rounded-l'} title="Marca Texto"><Highlighter className="w-4 h-4" /></button>
                <input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-8 h-8 p-1 bg-transparent rounded-r cursor-pointer" title="Escolher Cor do Marca-Texto"/>
            </div>
            <input type="color" onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()} value={editor.getAttributes('textStyle').color || (typeof window !== 'undefined' && document.body.classList.contains('dark') ? '#ffffff' : '#000000')} className="w-8 h-8 p-0 border-none bg-secondary rounded cursor-pointer" title="Cor da Fonte" />
            <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="bg-secondary p-2 rounded" title="Inserir Tabela"><TableIcon className="w-4 h-4" /></button>
            <button onClick={addYoutubeVideo} className="bg-secondary p-2 rounded" title="Inserir Vídeo do YouTube"><Youtube className="w-4 h-4" /></button>
        </div>
    );
};

interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<void>;
}

function TextEditor({ initialContent, onSave }: TextEditorProps) {
    const editor = useEditor({
        extensions: [
            // 2. CORREÇÃO: O StarterKit já inclui Link e Underline. Apenas configuramos o Link aqui.
            StarterKit.configure({
                link: {
                    openOnClick: false,
                    autolink: true,
                },
            }),
            Highlight.configure({ multicolor: true }), 
            TextStyle, 
            Color,
            YoutubeExtension.configure({ nocookie: true }),
            Table.configure({ resizable: true }), 
            TableRow, 
            TableHeader, 
            TableCell.extend({
                addAttributes() {
                    return {
                        ...this.parent?.(),
                        backgroundColor: { default: null },
                    };
                },
            }),
        ],
        content: initialContent || '',
        editorProps: {
            attributes: { class: 'prose dark:prose-invert max-w-none p-4 focus:outline-none min-h-[calc(100vh-20rem)] bg-card text-card-foreground rounded-b-lg' },
        },
        onUpdate: ({ editor }) => { onSave(editor.getJSON()); },
    });

    useEffect(() => {
        if (editor && initialContent) {
            const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(initialContent);
            if (!isSame) editor.commands.setContent(initialContent, { emitUpdate: false });
        }
    }, [initialContent, editor]);

    return (
        <div className="h-full flex flex-col relative">
            <MenuBar editor={editor} />
            
            {editor && (
                <BubbleMenu 
                    editor={editor} 
                    tippyOptions={{ duration: 100 }} 
                    pluginKey="tableMenu"
                    shouldShow={({ editor }) => editor.isActive('table')}
                >
                    <div className="flex flex-wrap gap-1 items-center bg-secondary p-2 rounded-lg border shadow-xl">
                        <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="bg-background p-2 rounded text-xs">Add Col Antes</button>
                        <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="bg-background p-2 rounded text-xs">Add Col Depois</button>
                        <button onClick={() => editor.chain().focus().deleteColumn().run()} className="bg-destructive/80 p-2 rounded text-xs">Deletar Coluna</button>
                        <button onClick={() => editor.chain().focus().addRowBefore().run()} className="bg-background p-2 rounded text-xs">Add Linha Antes</button>
                        <button onClick={() => editor.chain().focus().addRowAfter().run()} className="bg-background p-2 rounded text-xs">Add Linha Depois</button>
                        <button onClick={() => editor.chain().focus().deleteRow().run()} className="bg-destructive/80 p-2 rounded text-xs">Deletar Linha</button>
                        <button onClick={() => editor.chain().focus().deleteTable().run()} className="bg-destructive/80 p-2 rounded text-xs">Deletar Tabela</button>
                        <div className="flex items-center bg-background rounded p-1" title="Cor de Fundo da Célula">
                            <Palette className="w-4 h-4 mx-1 text-muted-foreground" />
                            <input type="color" onInput={event => editor.chain().focus().setCellAttribute('backgroundColor', (event.target as HTMLInputElement).value).run()} className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"/>
                        </div>
                    </div>
                </BubbleMenu>
            )}

            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;
