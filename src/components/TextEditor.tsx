'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent } from '@tiptap/react';
import { 
    Italic, Bold, Link as LinkIcon, Youtube, Highlighter, Table as TableIcon
} from 'lucide-react';

// Imports de Extensões do Tiptap
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import TiptapLink from '@tiptap/extension-link';
import YoutubeExtension from '@tiptap/extension-youtube';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';

// Importa o nosso novo CSS
import './TextEditor.css';

const MenuBar = ({ editor }: { editor: Editor }) => {
    const [highlightColor, setHighlightColor] = useState('#ffcc00'); // Cor padrão do marca-texto

    const setLink = useCallback(() => {
        if (editor.isActive('link')) {
            return editor.chain().focus().unsetLink().run();
        }
        const previousUrl = editor.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);
        if (url === null || url === '') return;
        editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addYoutubeVideo = useCallback(() => {
        const url = prompt('Cole a URL do vídeo do YouTube:');
        if (url) {
            editor.commands.setYoutubeVideo({ src: url });
        }
    }, [editor]);

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-col gap-2">
            {/* Barra Principal */}
            <div className="flex flex-wrap gap-2 items-center">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-primary text-primary-foreground p-2 rounded' : 'bg-secondary p-2 rounded'} title="Negrito"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-primary text-primary-foreground p-2 rounded' : 'bg-secondary p-2 rounded'} title="Itálico"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={setLink} className={editor.isActive('link') ? 'bg-primary text-primary-foreground p-2 rounded' : 'bg-secondary p-2 rounded'} title="Adicionar Link"><LinkIcon className="w-4 h-4" /></button>
                
                <div className="flex items-center bg-secondary rounded">
                    <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()} className={editor.isActive('highlight') ? 'bg-primary text-primary-foreground p-2 rounded-l' : 'p-2 rounded-l'} title="Marca Texto"><Highlighter className="w-4 h-4" /></button>
                    <input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-8 h-8 p-1 bg-transparent rounded-r cursor-pointer" title="Escolher Cor do Marca-Texto"/>
                </div>
                
                <input type="color" onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()} value={editor.getAttributes('textStyle').color || (document.body.classList.contains('dark') ? '#ffffff' : '#000000')} className="w-8 h-8 p-0 border-none bg-secondary rounded cursor-pointer" title="Cor da Fonte" />
                
                <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="bg-secondary p-2 rounded" title="Inserir Tabela"><TableIcon className="w-4 h-4" /></button>
                <button onClick={addYoutubeVideo} className="bg-secondary p-2 rounded" title="Inserir Vídeo do YouTube"><Youtube className="w-4 h-4" /></button>
            </div>
            
            {/* Barra de Ferramentas da Tabela (só aparece quando o cursor está numa tabela) */}
            {editor.isActive('table') && (
                <div className="flex flex-wrap gap-2 items-center border-t pt-2 mt-2">
                    <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="bg-secondary p-2 rounded text-xs">Add Coluna Antes</button>
                    <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="bg-secondary p-2 rounded text-xs">Add Coluna Depois</button>
                    <button onClick={() => editor.chain().focus().deleteColumn().run()} className="bg-destructive/80 p-2 rounded text-xs">Deletar Coluna</button>
                    <button onClick={() => editor.chain().focus().addRowBefore().run()} className="bg-secondary p-2 rounded text-xs">Add Linha Antes</button>
                    <button onClick={() => editor.chain().focus().addRowAfter().run()} className="bg-secondary p-2 rounded text-xs">Add Linha Depois</button>
                    <button onClick={() => editor.chain().focus().deleteRow().run()} className="bg-destructive/80 p-2 rounded text-xs">Deletar Linha</button>
                    <button onClick={() => editor.chain().focus().deleteTable().run()} className="bg-destructive/80 p-2 rounded text-xs">Deletar Tabela</button>
                </div>
            )}
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
            StarterKit,
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            TiptapLink.configure({ openOnClick: true, autolink: true }),
            YoutubeExtension.configure({ nocookie: true }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: initialContent || '',
        editorProps: {
            attributes: {
                // Usa as cores do tema do Tailwind para o fundo e o texto
                class: 'prose prose-invert max-w-none p-4 focus:outline-none min-h-[calc(100vh-20rem)] bg-card text-card-foreground rounded-b-lg',
            },
        },
        onUpdate: ({ editor }) => {
            // A sua lógica de auto-save continua a funcionar aqui
            onSave(editor.getJSON());
        },
    });

    useEffect(() => {
        // Garante que o editor atualiza o conteúdo quando a página selecionada muda
        if (editor && initialContent) {
            const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(initialContent);
            if (!isSame) {
                editor.commands.setContent(initialContent, false);
            }
        }
    }, [initialContent, editor]);

    return (
        <div className="h-full flex flex-col">
            {editor && <MenuBar editor={editor} />}
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;
