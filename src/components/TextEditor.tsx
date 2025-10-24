'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent, Node } from '@tiptap/react'; // Import Node
import {
    Italic, Bold, Link as LinkIcon, Youtube, Highlighter, Table as TableIcon,
    Underline, Palette, X,
    List, ListOrdered, CheckSquare,
    AlignLeft, AlignCenter, AlignRight, ChevronsUpDown, // Removido CornerDownRight, ChevronRight que não estavam sendo usados aqui
} from 'lucide-react';

// Importações Tiptap Core e Extensões Existentes
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

// === REABILITADAS: Importações de Tabela ===
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
// ===========================================

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
// --- EXTENSÃO PERSONALIZADA: Bloco Recolhível (Foldable Block) ---
// ============================================================================

// Nó para o <summary>
const Summary = Node.create({
    name: 'summary',
    group: 'summary', // Grupo específico para garantir que só pode estar dentro de 'foldableBlock'
    content: 'inline*', // Permite texto e outras marcas inline
    parseHTML() {
        return [{ tag: 'summary' }];
    },
    renderHTML({ HTMLAttributes }) {
        // Adicionamos classe para estilização e conteúdo (0)
        return ['summary', { ...HTMLAttributes, class: 'foldable-summary' }, 0];
    },
    selectable: false, // O summary em si não deve ser selecionável como um bloco
    draggable: false, // Não deve ser arrastável separadamente
});

// Nó para o <details> (o bloco recolhível)
const FoldableBlock = Node.create({
    name: 'foldableBlock',
    group: 'block',
    content: 'summary block+', // Deve conter um 'summary' seguido por um ou mais blocos
    defining: true, // Garante que o conteúdo corresponda estritamente a 'summary block+'

    addAttributes() {
        return {
            open: {
                default: true, // Começa aberto por padrão
                parseHTML: element => element.hasAttribute('open'),
                renderHTML: attributes => (attributes.open ? { open: '' } : {}),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'details' }];
    },

    // CORREÇÃO: Simplificado renderHTML para usar um único 'content hole' (0)
    // O Tiptap mapeará 'summary' para o primeiro elemento e 'block+' para o restante dentro de <details>
    renderHTML({ HTMLAttributes }) {
        return ['details', HTMLAttributes, 0];
    },

    // Atalho para facilitar a saída do <summary>
    addKeyboardShortcuts() {
        return {
            'Shift-Enter': ({ editor }) => {
                const { state } = editor;
                const { selection } = state;
                const { $from } = selection;
                // Se o cursor estiver dentro de um 'summary'
                if ($from.parent.type.name === 'summary') {
                    // Insere um novo parágrafo *depois* do <details> (nó FoldableBlock)
                    return editor.chain().insertContentAt($from.after($from.depth - 1), { type: 'paragraph' }).focus().run();
                }
                return false; // Deixa o Shift-Enter funcionar normalmente em outros contextos
            },
        }
    },
});


// ============================================================================
// --- MenuBar (Atualizado) ---
// ============================================================================
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
        if (url) {
            editor.commands.setYoutubeVideo({ src: url });
        }
    }, [editor]);

    // Função para adicionar o bloco recolhível
    const addFoldableBlock = useCallback(() => {
        editor.chain().focus().insertContent({
            type: 'foldableBlock',
            attrs: { open: true }, // Começa aberto
            content: [
                {
                    type: 'summary',
                    content: [{ type: 'text', text: 'Título Recolhível' }]
                },
                {
                    type: 'paragraph', // Conteúdo inicial
                    content: [{ type: 'text', text: 'Conteúdo aqui...' }]
                },
            ],
        }).run();
    }, [editor]);


    const activeClass = "bg-accent text-accent-foreground";
    const selectClass = "h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
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
                {/* REABILITADO: Botão Tabela */}
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
// --- Componente TextEditor (Atualizado) ---
// ============================================================================
interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<any>;
  onClose: () => void;
}

function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
    const [isEditorReady, setIsEditorReady] = useState(false);
    const debouncedSave = useDebouncedCallback((editor: Editor) => {
        if (editor && !editor.isDestroyed) onSave(editor.getJSON());
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

            // === REABILITADAS: Extensões de Tabela ===
            Table.configure({ resizable: true }),
            TableRow,
            TableHeader,
            TableCell,
            // =======================================

            YoutubeExtension.configure({ nocookie: true }),
            CharacterCount,
            SlashCommand,
            WikiLink,
            WikiLinkSuggestion,
            TextAlign.configure({
                types: ['heading', 'paragraph', 'summary'], // Aplica alinhamento a estes tipos
            }),
            Summary,       // Adiciona a extensão Summary
            FoldableBlock, // Adiciona a extensão FoldableBlock
        ],
        content: initialContent || '',
        editorProps: {
            attributes: {
                class: 'prose dark:prose-invert max-w-none p-4 focus:outline-none flex-grow',
                spellcheck: 'true', // Habilita verificação ortográfica do navegador
            },
        },
        onUpdate: ({ editor }) => { debouncedSave(editor); },
        onCreate: () => setIsEditorReady(true),
    });

    // useEffect para setContent (com tratamento de erro para JSON inválido)
    useEffect(() => {
        if (editor && initialContent) {
            try {
                // Tenta fazer parse se for string, senão usa diretamente
                const initialContentJSON = typeof initialContent === 'string'
                    ? JSON.parse(initialContent)
                    : initialContent;

                // Compara com o conteúdo atual para evitar atualizações desnecessárias
                const currentContentJSON = editor.getJSON();
                if (JSON.stringify(currentContentJSON) !== JSON.stringify(initialContentJSON)) {
                    // Define o conteúdo (ou vazio se initialContentJSON for nulo/inválido)
                    editor.commands.setContent(initialContentJSON || '', false);
                }
            } catch (error) {
                console.error("Erro ao processar ou definir conteúdo inicial:", error);
                // Define como vazio em caso de erro no parse
                editor.commands.setContent('', false);
            }
        } else if (editor && !initialContent) {
             // Garante que o editor fique vazio se initialContent for null/undefined
             editor.commands.setContent('', false);
        }
    }, [initialContent, editor]);


    return (
        <div className="h-full flex flex-col border rounded-lg bg-card shadow-lg">
             <style jsx global>{`
                /* Estilos WikiLink */
                .prose .wiki-link { text-decoration: none; border-bottom: 1px dashed hsl(var(--primary)); color: hsl(var(--primary)); background-color: hsl(var(--primary) / 0.1); padding: 0 2px; border-radius: 3px; transition: all 0.2s; cursor: pointer; }
                .prose .wiki-link:hover { background-color: hsl(var(--primary) / 0.2); border-bottom-style: solid; }

                /* Estilos Bloco Recolhível */
                .prose details {
                    border: 1px solid hsl(var(--border));
                    border-radius: 0.5rem; /* rounded-lg */
                    margin-bottom: 1em;
                    overflow: hidden; /* Para conter bordas arredondadas */
                }
                .prose summary.foldable-summary {
                    cursor: pointer;
                    padding: 0.5em 1em;
                    background-color: hsl(var(--secondary) / 0.5);
                    font-weight: 600;
                    display: list-item; /* Necessário para o marcador padrão ou ::before */
                    position: relative; /* Para posicionar o ::before */
                    padding-left: 2em; /* Espaço para o ícone */
                    list-style: none; /* Remove o marcador padrão do browser */
                    transition: background-color 0.2s;
                }
                 /* Ícone de seta usando ::before */
                .prose summary.foldable-summary::before {
                    content: '';
                    display: inline-block;
                    width: 1em;
                    height: 1em;
                     /* SVG da seta ChevronRight (cor ajustada via filter) */
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 18 6-6-6-6'/%3E%3C/svg%3E");
                    background-size: contain;
                    background-repeat: no-repeat;
                    position: absolute;
                    left: 0.75em; /* Posiciona o ícone */
                    top: 50%;
                    transform: translateY(-50%) rotate(0deg); /* Estado inicial (fechado) */
                    transition: transform 0.2s ease-in-out;
                     /* Ajuste a cor do ícone SVG. invert(0.5) deixa cinza claro. ajuste conforme necessário */
                    filter: invert(0.6) brightness(0.9);
                }
                /* Rotaciona a seta quando o details está aberto */
                .prose details[open] > summary.foldable-summary::before {
                    transform: translateY(-50%) rotate(90deg);
                }
                /* Adiciona borda inferior ao summary quando aberto */
                 .prose details[open] > summary.foldable-summary {
                    border-bottom: 1px solid hsl(var(--border));
                }
                .prose summary.foldable-summary:hover {
                    background-color: hsl(var(--secondary));
                }
                 /* Estiliza a área de conteúdo dentro do details */
                .prose details > div[data-content-wrapper] { /* Seleciona o wrapper se estiver usando */
                     padding: 1em;
                }
                /* Remove margens extras do primeiro/último filho dentro do conteúdo */
                 .prose details > div[data-content-wrapper] > :first-child,
                 .prose details > :not(summary):first-of-type { /* Fallback se não usar wrapper */
                    margin-top: 0;
                }
                .prose details > div[data-content-wrapper] > :last-child,
                 .prose details > :not(summary):last-of-type { /* Fallback se não usar wrapper */
                    margin-bottom: 0;
                }
                 /* Remove padding do wrapper do summary, se estiver usando */
                .prose details > div[data-summary-wrapper] {
                     padding: 0;
                }

             `}</style>
             {editor && isEditorReady && <MenuBar editor={editor} onClose={onClose} />}
             <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;

