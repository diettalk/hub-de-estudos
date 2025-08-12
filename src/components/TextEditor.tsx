// src/components/TextEditor.tsx
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { 
    Italic, Bold, Link2, Youtube, Highlighter, Paintbrush, Table as TableIcon
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

import './TextEditor.css';

const MenuBar = ({ editor }: { editor: Editor | null }) => {
    if (!editor) return null;

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
            editor.commands.setYoutubeVideo({ src: url, width: 640, height: 480 });
        }
    }, [editor]);

    return (
        <div className="p-2 bg-gray-700 rounded-t-lg flex flex-col gap-2 border-b border-gray-600">
            {/* Barra Principal */}
            <div className="flex flex-wrap gap-2 items-center">
                <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive('bold') ? 'bg-blue-500 text-white p-2 rounded' : 'bg-gray-600 p-2 rounded'} title="Negrito"><Bold className="w-4 h-4" /></button>
                <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive('italic') ? 'bg-blue-500 text-white p-2 rounded' : 'bg-gray-600 p-2 rounded'} title="Itálico"><Italic className="w-4 h-4" /></button>
                <button type="button" onClick={setLink} className={editor.isActive('link') ? 'bg-blue-500 text-white p-2 rounded' : 'bg-gray-600 p-2 rounded'} title="Adicionar Link"><Link2 className="w-4 h-4" /></button>
                
                {/* CORREÇÃO: Grupo de Marca-Texto com seletor de cor funcional */}
                <div className="flex items-center bg-gray-600 rounded">
                    <button type="button" onClick={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()} className={editor.isActive('highlight', { color: highlightColor }) ? 'bg-blue-500 text-white p-2 rounded-l' : 'p-2 rounded-l'} title="Marca Texto"><Highlighter className="w-4 h-4" /></button>
                    <input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-8 h-8 p-1 bg-transparent rounded-r cursor-pointer" title="Escolher Cor do Marca-Texto"/>
                </div>
                
                {/* Seletor de Cor da Fonte */}
                <input type="color" onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()} value={editor.getAttributes('textStyle').color || '#ffffff'} className="w-8 h-8 p-0 border-none bg-gray-600 rounded cursor-pointer" title="Cor da Fonte" />
                
                <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="bg-gray-600 p-2 rounded" title="Inserir Tabela"><TableIcon className="w-4 h-4" /></button>
                <button onClick={addYoutubeVideo} className="bg-gray-600 p-2 rounded" title="Inserir Vídeo do YouTube"><Youtube className="w-4 h-4" /></button>
            </div>
            
            {/* Barra de Ferramentas da Tabela */}
            {editor.isActive('table') && (
                <div className="flex flex-wrap gap-2 items-center border-t border-gray-600 pt-2">
                    <button onClick={() => editor.chain().focus().addColumnBefore().run()} className="bg-gray-600 p-2 rounded text-xs">Add Coluna Antes</button>
                    <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="bg-gray-600 p-2 rounded text-xs">Add Coluna Depois</button>
                    <button onClick={() => editor.chain().focus().deleteColumn().run()} className="bg-red-500/50 p-2 rounded text-xs">Deletar Coluna</button>
                    <button onClick={() => editor.chain().focus().addRowBefore().run()} className="bg-gray-600 p-2 rounded text-xs">Add Linha Antes</button>
                    <button onClick={() => editor.chain().focus().addRowAfter().run()} className="bg-gray-600 p-2 rounded text-xs">Add Linha Depois</button>
                    <button onClick={() => editor.chain().focus().deleteRow().run()} className="bg-red-500/50 p-2 rounded text-xs">Deletar Linha</button>
                    <button onClick={() => editor.chain().focus().mergeOrSplit().run()} className="bg-gray-600 p-2 rounded text-xs">Mesclar/Dividir</button>
                    <button onClick={() => editor.chain().focus().deleteTable().run()} className="bg-red-500/50 p-2 rounded text-xs">Deletar Tabela</button>
                </div>
            )}
        </div>
    );
};

interface TextEditorProps {
  initialContent: any;
  onSave: (newContent: any) => Promise<any>;
}

function TextEditor({ initialContent, onSave }: TextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            TiptapLink.configure({ openOnClick: true, autolink: true }),
            YoutubeExtension.configure({ controls: true, modestBranding: true }),
            Table.configure({ resizable: true }),
            TableRow, TableHeader, TableCell,
        ],
        content: initialContent || '',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-invert max-w-none p-4 focus:outline-none min-h-[calc(100vh-20rem)] bg-gray-800 text-white rounded-b-lg overflow-y-auto',
            },
        },
        // CORREÇÃO: Usando onUpdate para salvar as alterações em tempo real
        onUpdate: ({ editor }) => {
            onSave(editor.getJSON());
        },
    });

    useEffect(() => {
        if (editor && initialContent) {
            // Compara o conteúdo atual com o inicial para evitar atualizações desnecessárias
            const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(initialContent);
            if (!isSame) {
                editor.commands.setContent(initialContent, false);
            }
        }
    }, [initialContent, editor]);

    return (
        <div className="h-full flex flex-col">
            <MenuBar editor={editor} />
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;
