// src/components/TextEditor.tsx

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent } from '@tiptap/react';
import { 
    Italic, Bold, Link as LinkIcon, Youtube, Highlighter, Table as TableIcon, Underline, Palette, X
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

import './TextEditor.css';

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-background-color'),
        renderHTML: attributes => {
          if (!attributes.backgroundColor) return {};
          return {
            'data-background-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
});

const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-background-color'),
        renderHTML: attributes => {
          if (!attributes.backgroundColor) return {};
          return {
            'data-background-color': attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`,
          };
        },
      },
    };
  },
});


const MenuBar = ({ editor, isTableActive, onClose }: { editor: Editor | null; isTableActive: boolean; onClose: () => void; }) => {
    const [highlightColor, setHighlightColor] = useState('#ffcc00');

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

    const addYoutubeVideo = useCallback(() => {
        if (!editor) return;
        const url = prompt('Cole a URL do vídeo do YouTube:');
        if (url) {
            editor.commands.setYoutubeVideo({ src: url });
        }
    }, [editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-col gap-2 sticky top-0 z-10">
            <div className="flex justify-between items-center">
                <div className="flex flex-wrap gap-2 items-center">
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
                <Button variant="ghost" size="icon" onClick={onClose} title="Fechar Editor">
                    <X className="w-5 h-5" />
                </Button>
            </div>
            
            {isTableActive && (
                <div className="flex flex-wrap gap-2 items-center border-t pt-2 mt-2">
                    {/* ... botões da tabela ... */}
                </div>
            )}
        </div>
    );
};

interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<any>;
  onClose: () => void;
}

function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
    const [isTableActive, setIsTableActive] = useState(false);

    const debouncedSave = useDebouncedCallback((editor) => {
        onSave(editor.getJSON());
    }, 1000);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({ multicolor: true }),
            TextStyle,
            Color,
            YoutubeExtension.configure({ nocookie: true }),
            Table.configure({ resizable: true }),
            TableRow,
            CustomTableHeader,
            CustomTableCell,
        ],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none p-4 focus:outline-none flex-grow',
            },
        },
        onUpdate: ({ editor }) => {
            debouncedSave(editor);
            setIsTableActive(editor.isActive('table'));
        },
        onSelectionUpdate: ({ editor }) => {
            setIsTableActive(editor.isActive('table'));
        },
    });

    // --- CORREÇÃO DO "ENTER": Apenas atualiza se o conteúdo for diferente ---
    useEffect(() => {
        if (editor && initialContent) {
            const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(initialContent);
            if (!isSame) {
                editor.commands.setContent(initialContent, false);
            }
        }
    }, [initialContent, editor]);


    return (
        <div className="h-full flex flex-col border rounded-lg bg-card">
            <MenuBar editor={editor} isTableActive={isTableActive} onClose={onClose} />
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;

