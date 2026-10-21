'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent, Node } from '@tiptap/react';
// Removido findParentNode
import {
    Italic, Bold, Link as LinkIcon, Youtube, Highlighter, Table as TableIcon,
    Underline, Palette, X,
    List, ListOrdered, CheckSquare,
    AlignLeft, AlignCenter, AlignRight,
    ChevronsUpDown
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

// Importações Nomeadas da Tabela
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

import YoutubeExtension from '@tiptap/extension-youtube';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import FontFamily from '@tiptap/extension-font-family';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';

// Outras importações
import { useDebouncedCallback } from 'use-debounce';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SlashCommand } from './SlashCommandList';
import { WikiLink } from './WikiLink';
import { WikiLinkSuggestion } from './WikiLinkSuggestion';
import './TextEditor.css';

// ============================================================================
// --- EXTENSÃO PERSONALIZADA: Bloco Recolhível ---
// ============================================================================

// Nó para o <summary>
const Summary = Node.create({
    name: 'summary',
    group: 'summary',
    content: 'inline*', // Permite conteúdo editável DENTRO do summary
    editable: false,   // <<< ADICIONADO: Marca o próprio nó summary como não editável
    parseHTML() {
        return [{ tag: 'summary' }];
    },
    renderHTML({ HTMLAttributes }) {
        // Sem onclick customizado, confiando no handleDOMEvents
        return ['summary', { ...HTMLAttributes, class: 'foldable-summary' }, 0];
    },
    selectable: false,
    draggable: false,
});

// Nó para o <details> (sem alterações)
const FoldableBlock = Node.create({
    name: 'foldableBlock',
    group: 'block',
    content: 'summary block+',
    defining: true,
    addAttributes() {
        return {
            open: {
                default: true,
                parseHTML: element => element.hasAttribute('open'),
                renderHTML: attributes => (attributes.open ? { open: '' } : {}),
            },
        };
    },
    parseHTML() {
        return [{ tag: 'details' }];
    },
    renderHTML({ HTMLAttributes }) {
        return ['details', HTMLAttributes, 0];
    },
    addKeyboardShortcuts() {
        return {
            'Shift-Enter': ({ editor }) => {
                const { state } = editor;
                const { selection } = state;
                const { $from } = selection;
                if ($from.parent.type.name === 'summary') {
                    return editor.chain().insertContentAt($from.after($from.depth - 1), { type: 'paragraph' }).focus().run();
                }
                return false;
            },
            'Enter': ({ editor }) => {
                 const { state } = editor;
                 const { selection } = state;
                 const { $from } = selection;
                 if ($from.parent.type.name === 'summary') {
                    const parentPos = $from.before($from.depth - 1);
                    const parentNodeSize = $from.node($from.depth - 1).nodeSize;
                    const nextPos = parentPos + parentNodeSize;
                    return editor.chain().insertContentAt(nextPos, { type: 'paragraph' }).focus(nextPos + 1).run();
                 }
                 return false;
            }
        }
    },
});

// ============================================================================
// --- MenuBar ---
// ============================================================================
const MenuBar = React.memo(({ editor, onClose }: { editor: Editor; onClose: () => void; }) => {
    // ... (Hooks useState, useCallback, useEffect - sem alterações) ...
    const [highlightColor, setHighlightColor] = useState('#ffcc00');
    const [currentColor, setCurrentColor] = useState('#ffffff');

    const updateListener = useCallback(() => {
        if(editor && !editor.isDestroyed) {
          setCurrentColor(editor.getAttributes('textStyle').color || '#ffffff');
        }
    }, [editor]);

     useEffect(() => {
        if (!editor) return;
         setCurrentColor(editor.getAttributes('textStyle').color || '#ffffff');

        editor.on('transaction', updateListener);
        editor.on('selectionUpdate', updateListener);
        return () => {
             if (editor && !editor.isDestroyed) {
                editor.off('transaction', updateListener);
                editor.off('selectionUpdate', updateListener);
             }
        };
    }, [editor, updateListener]);


    const setLink = useCallback(() => {
         if (!editor) return;
        if (editor.isActive('link')) return editor.chain().focus().unsetLink().run();
        const url = window.prompt('URL', editor.getAttributes('link').href || '');
        if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addYoutubeVideo = useCallback(() => {
         if (!editor) return;
        const url = prompt('Cole a URL do vídeo do YouTube:');
        if (url) {
            editor.chain().focus().setYoutubeVideo({ src: url }).run();
        }
    }, [editor]);

    const addFoldableBlock = useCallback(() => {
        if (!editor) return;
        editor.chain().focus().insertContent({
            type: 'foldableBlock',
            attrs: { open: true },
            content: [
                { type: 'summary', content: [{ type: 'text', text: 'Título Recolhível' }] },
                { type: 'paragraph', content: [{ type: 'text', text: 'Conteúdo aqui...' }] },
            ],
        }).run();
    }, [editor]);

     if (!editor) {
        return null;
     }

    const activeClass = "bg-accent text-accent-foreground";
    const selectClass = "h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
            {/* ... (Todo o JSX da MenuBar permanece o mesmo) ... */}
              {/* Select de Estilo e Fonte */}
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

            {/* Negrito, Itálico, Sublinhado */}
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={cn(editor.isActive('bold') && activeClass)} title="Negrito"><Bold className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn(editor.isActive('italic') && activeClass)} title="Itálico"><Italic className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn(editor.isActive('underline') && activeClass)} title="Sublinhado"><Underline className="w-4 h-4" /></Button>
            </div>

             {/* Alinhamento */}
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('left').run()} className={cn(editor.isActive({ textAlign: 'left' }) && activeClass)} title="Alinhar à Esquerda"><AlignLeft className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('center').run()} className={cn(editor.isActive({ textAlign: 'center' }) && activeClass)} title="Centralizar"><AlignCenter className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().setTextAlign('right').run()} className={cn(editor.isActive({ textAlign: 'right' }) && activeClass)} title="Alinhar à Direita"><AlignRight className="w-4 h-4" /></Button>
            </div>

            {/* Listas */}
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(editor.isActive('bulletList') && activeClass)} title="Lista"><List className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(editor.isActive('orderedList') && activeClass)} title="Lista Numerada"><ListOrdered className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleTaskList().run()} className={cn(editor.isActive('taskList') && activeClass)} title="Lista de Tarefas"><CheckSquare className="w-4 h-4" /></Button>
            </div>

            {/* Link, Highlight, Cor, Tabela, Youtube, Bloco Recolhível */}
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
                <Button variant="ghost" size="sm" onClick={addFoldableBlock} title="Bloco Recolhível"><ChevronsUpDown className="w-4 h-4" /></Button>
            </div>


            {/* Espaçador e Botão Fechar */}
            <div className="flex-grow"></div>
            <Button variant="ghost" size="icon" onClick={onClose} title="Fechar"><X className="w-5 h-5" /></Button>
        </div>
    );
});
MenuBar.displayName = 'MenuBar';

// ============================================================================
// --- Componente TextEditor ---
// ============================================================================
interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<any>;
  onClose: () => void;
}

function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
    // ... (Hooks useState, useDebouncedCallback) ...
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
            YoutubeExtension.configure({ nocookie: true }),
            CharacterCount,
            SlashCommand,
            WikiLink,
            WikiLinkSuggestion,
            TextAlign.configure({
                types: ['heading', 'paragraph', 'summary'],
            }),
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            Summary, // Extensão Summary (agora com editable: false)
            FoldableBlock, // Extensão FoldableBlock
        ],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none p-4 focus:outline-none flex-grow',
                spellcheck: 'true',
            },
            // MODIFICADO: handleDOMEvents (sem console.log e stopImmediatePropagation)
             handleDOMEvents: {
                 click: (view, event) => {
                     const target = event.target as HTMLElement;
                     const summaryElement = target.closest('summary.foldable-summary');

                     if (summaryElement) {
                         // Retorna false para indicar ao ProseMirror/Tiptap para NÃO lidar com este evento
                         return false;
                     }
                     // Deixa o Tiptap lidar com outros cliques
                     return undefined;
                 },
             },
        },
        onUpdate: ({ editor }) => { debouncedSave(editor); },
        onCreate: () => setIsEditorReady(true),
    });

    // ... (useEffect para setContent) ...
     useEffect(() => {
        if (editor && !editor.isDestroyed && initialContent) {
            try {
                const initialContentJSON = typeof initialContent === 'string'
                    ? JSON.parse(initialContent)
                    : initialContent;
                const currentContentJSON = editor.getJSON();
                if (JSON.stringify(currentContentJSON) !== JSON.stringify(initialContentJSON)) {
                    editor.commands.setContent(initialContentJSON || '', false);
                }
            } catch (error) {
                console.error("Erro ao processar ou definir conteúdo inicial:", error);
                editor.commands.setContent('', false);
            }
        } else if (editor && !editor.isDestroyed && !initialContent) {
             editor.commands.setContent('', false);
        }
    }, [initialContent, editor]);


    return (
        <div className="h-full flex flex-col border rounded-lg bg-card shadow-lg">
             <style jsx global>{`
                {/* ... (Estilos CSS - sem alterações) ... */}
                /* Estilos WikiLink */
                .prose .wiki-link { text-decoration: none; border-bottom: 1px dashed hsl(var(--primary)); color: hsl(var(--primary)); background-color: hsl(var(--primary) / 0.1); padding: 0 2px; border-radius: 3px; transition: all 0.2s; cursor: pointer; }
                .prose .wiki-link:hover { background-color: hsl(var(--primary) / 0.2); border-bottom-style: solid; }

                /* Estilos Bloco Recolhível */
                .prose details {
                    border: 1px solid hsl(var(--border));
                    border-radius: 0.5rem;
                    margin-bottom: 1em;
                    overflow: hidden;
                }
                .prose summary.foldable-summary {
                    cursor: pointer;
                    padding: 0.5em 1em;
                    background-color: hsl(var(--secondary) / 0.5);
                    font-weight: 600;
                    display: list-item; /* Importante para o ::before funcionar como marcador */
                    position: relative;
                    padding-left: 2.2em; /* Mais espaço para o ícone */
                    list-style: none; /* Esconde marcador padrão */
                    transition: background-color 0.2s;
                    user-select: none;
                }
                 /* Ícone de seta usando ::before */
                .prose summary.foldable-summary::before {
                    content: '';
                    display: inline-block; /* Mudado para inline-block */
                    width: 1em;
                    height: 1em;
                    /* CORRIGIDO: URL SVG corretamente codificada */
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 18 6-6-6-6'/%3E%3C/svg%3E");
                    background-size: contain;
                    background-position: center; /* Centraliza o ícone */
                    background-repeat: no-repeat;
                    position: absolute;
                    left: 0.75em;
                    top: 50%;
                    transform: translateY(-50%) rotate(0deg);
                    transition: transform 0.2s ease-in-out;
                    filter: invert(0.6) brightness(0.9);
                    pointer-events: none;
                }
                .prose details[open] > summary.foldable-summary::before {
                    transform: translateY(-50%) rotate(90deg);
                }
                 .prose details[open] > summary.foldable-summary {
                    border-bottom: 1px solid hsl(var(--border));
                }
                .prose summary.foldable-summary:hover {
                    background-color: hsl(var(--secondary));
                }
                .prose details > :not(summary) {
                     padding: 1em;
                }
                .prose details > :not(summary):first-of-type {
                    margin-top: 0;
                }
                .prose details > :not(summary):last-of-type {
                    margin-bottom: 0;
                }

             `}</style>
             {editor && isEditorReady && <MenuBar editor={editor} onClose={onClose} />}
             <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;

