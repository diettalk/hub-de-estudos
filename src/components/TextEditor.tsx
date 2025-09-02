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

            <div className="flex items-center gap-1">
                <Toggle size="sm" pressed={editor.isActive('bold')} onPressedChange={() => editor.chain().focus().toggleBold().run()} title="Negrito"><Bold className="w-4 h-4" /></Toggle>
                <Toggle size="sm" pressed={editor.isActive('italic')} onPressedChange={() => editor.chain().focus().toggleItalic().run()} title="Itálico"><Italic className="w-4 h-4" /></Toggle>
                <Toggle size="sm" pressed={editor.isActive('underline')} onPressedChange={() => editor.chain().focus().toggleUnderline().run()} title="Sublinhado"><Underline className="w-4 h-4" /></Toggle>
            </div>

             <div className="flex items-center gap-1">
                <Toggle size="sm" pressed={editor.isActive('bulletList')} onPressedChange={() => editor.chain().focus().toggleBulletList().run()} title="Lista"><List className="w-4 h-4" /></Toggle>
                <Toggle size="sm" pressed={editor.isActive('orderedList')} onPressedChange={() => editor.chain().focus().toggleOrderedList().run()} title="Lista Numerada"><ListOrdered className="w-4 h-4" /></Toggle>
                <Toggle size="sm" pressed={editor.isActive('blockquote')} onPressedChange={() => editor.chain().focus().toggleBlockquote().run()} title="Citação"><Blockquote className="w-4 h-4" /></Toggle>
            </div>

            <div className="flex items-center gap-2">
                <Toggle size="sm" pressed={editor.isActive('link')} onPressedChange={setLink} title="Adicionar Link"><LinkIcon className="w-4 h-4" /></Toggle>
                
                <div className="flex items-center rounded bg-transparent border">
                     <Toggle size="sm" pressed={editor.isActive('highlight')} onPressedChange={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()} title="Marca Texto"><Highlighter className="w-4 h-4" /></Toggle>
                     <input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer" title="Escolher Cor do Marca-Texto"/>
                </div>
                
                <div className="flex items-center rounded bg-transparent border">
                    <Palette className="w-4 h-4 mx-1 text-muted-foreground" />
                    <input type="color" onInput={event => editor.chain().focus().setColor((event.target as HTMLInputElement).value).run()} value={editor.getAttributes('textStyle').color || (typeof window !== 'undefined' && document.body.classList.contains('dark') ? '#ffffff' : '#000000')} className="w-6 h-6 p-0 border-none bg-transparent rounded cursor-pointer" title="Cor da Fonte" />
                </div>
                
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Inserir Tabela"><TableIcon className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={addYoutubeVideo} title="Inserir Vídeo do YouTube"><Youtube className="w-4 h-4" /></Button>
            </div>

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
            FontSize // Nossa nova extensão
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

