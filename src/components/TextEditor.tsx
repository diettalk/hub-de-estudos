// src/components/TextEditor.tsx

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
// --- Componente MenuBar (Reconstruído para ser Puramente Visual) ---
// ============================================================================

/**
 * Props para o componente MenuBar.
 * Este componente é "burro", recebendo todo o seu estado e lógica do componente pai.
 */
interface MenuBarProps {
  editor: Editor;
  onClose: () => void;
}

/**
 * A barra de ferramentas visual do editor.
 * Não contém lógica de estado complexa; apenas renderiza botões e chama
 * as funções de handler fornecidas pelo componente pai (TextEditor).
 * Usamos React.memo para otimizar a performance, evitando re-renderizações
 * desnecessárias se as props não mudarem.
 */
const MenuBar = React.memo(({ editor, onClose }: MenuBarProps) => {
    // --- State Interno da MenuBar (Apenas para elementos da UI) ---
    const [highlightColor, setHighlightColor] = useState('#ffcc00');
    
    // --- Forçar Re-renderização para Sincronia da UI ---
    // Um truque simples para garantir que a UI da barra de ferramentas (botões ativos)
    // se atualize sempre que a seleção ou o conteúdo do editor mudar.
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

    // --- Handlers de Ações ---
    const setLink = useCallback(() => {
        if (editor.isActive('link')) {
            return editor.chain().focus().unsetLink().run();
        }
        const url = window.prompt('URL', editor.getAttributes('link').href);
        if (url) editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    const addYoutubeVideo = useCallback(() => {
        const url = prompt('Cole a URL do vídeo do YouTube:');
        if (url) editor.commands.setYoutubeVideo({ src: url });
    }, [editor]);

    // --- Constantes de Estilo ---
    const activeClass = "bg-accent text-accent-foreground";
    const selectClass = "h-9 items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

    // --- Renderização ---
    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
            {/* GRUPO: FONTES E TÍTULOS */}
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
                onChange={(e) => e.target.value === 'default' ? editor.chain().focus().unsetFontFamily().run() : editor.chain().focus().setFontFamily(e.target.value).run()}
            >
                <option value="default">Padrão</option>
                <option value="Inter">Inter</option>
                <option value="serif">Serif</option>
                <option value="monospace">Mono</option>
            </select>
            
            {/* GRUPO: ESTILOS BÁSICOS */}
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBold().run()} className={cn(editor.isActive('bold') && activeClass)} title="Negrito"><Bold className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn(editor.isActive('italic') && activeClass)} title="Itálico"><Italic className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn(editor.isActive('underline') && activeClass)} title="Sublinhado"><Underline className="w-4 h-4" /></Button>
            </div>
            
            {/* GRUPO: LISTAS */}
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(editor.isActive('bulletList') && activeClass)} title="Lista"><List className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(editor.isActive('orderedList') && activeClass)} title="Lista Numerada"><ListOrdered className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleTaskList().run()} className={cn(editor.isActive('taskList') && activeClass)} title="Lista de Tarefas"><CheckSquare className="w-4 h-4" /></Button>
            </div>

            {/* GRUPO: INSERÇÃO E CORES */}
            <div className="flex items-center gap-2">
                 <Button variant="ghost" size="sm" onClick={setLink} className={cn(editor.isActive('link') && activeClass)} title="Link"><LinkIcon className="w-4 h-4" /></Button>
                 <div className="flex items-center rounded border"><Button variant="ghost" size="sm" onClick={() => editor.chain().focus().toggleHighlight({ color: highlightColor }).run()} className={cn(editor.isActive('highlight') && activeClass)} title="Marca Texto"><Highlighter className="w-4 h-4" /></Button><input type="color" value={highlightColor} onChange={e => setHighlightColor(e.target.value)} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer"/></div>
                 <div className="flex items-center rounded border"><Palette className="w-4 h-4 mx-1 text-muted-foreground" /><input type="color" onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()} value={editor.getAttributes('textStyle').color || '#000000'} className="w-6 h-6 p-0 bg-transparent border-none cursor-pointer"/></div>
                 <Button variant="ghost" size="sm" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Tabela"><TableIcon className="w-4 h-4" /></Button>
                 <Button variant="ghost" size="sm" onClick={addYoutubeVideo} title="YouTube"><Youtube className="w-4 h-4" /></Button>
            </div>
            
            <div className="flex-grow"></div>
            <Button variant="ghost" size="icon" onClick={onClose} title="Fechar"><X className="w-5 h-5" /></Button>
        </div>
    );
});
MenuBar.displayName = 'MenuBar'; // Nome para facilitar a depuração no React DevTools


// ============================================================================
// --- Componente Principal TextEditor (O Cérebro da Operação) ---
// ============================================================================
interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<any>;
  onClose: () => void;
}

/**
 * O componente principal do editor.
 * É responsável por:
 * 1. Inicializar e gerir a instância do editor Tiptap.
 * 2. Lidar com o estado de carregamento para evitar erros de hidratação.
 * 3. Gerir o salvamento automático (debounced).
 * 4. Passar o estado e os handlers para o componente MenuBar.
 */
function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
    // --- State Management ---
    const [isEditorReady, setIsEditorReady] = useState(false);

    // --- Debounced Save Callback ---
    const debouncedSave = useDebouncedCallback((editor) => {
        onSave(editor.getJSON());
    }, 1000);

    // --- Editor Instance ---
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                // Configuração explícita para garantir que as extensões funcionem.
                heading: { levels: [1, 2, 3] },
            }),
            Highlight.configure({ multicolor: true }), 
            TextStyle, 
            Color,
            FontFamily.configure({
                types: ['textStyle'], // Permite que a fonte seja aplicada a qualquer texto
            }),
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
        onUpdate: ({ editor }) => {
            debouncedSave(editor);
        },
        // A solução para o erro do React: só consideramos o editor pronto
        // quando o Tiptap nos dá o "sinal verde".
        onCreate: () => {
            setIsEditorReady(true);
        },
    });
    
    // --- Effects ---
    // Este efeito garante que, se o utilizador clicar noutro documento,
    // o conteúdo do editor seja atualizado corretamente.
    useEffect(() => {
        if (editor && initialContent) {
            const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(initialContent);
            if (!isSame) editor.commands.setContent(initialContent, false);
        }
    }, [initialContent, editor]);

    // --- Render Logic ---
    return (
        <div className="h-full flex flex-col border rounded-lg bg-card shadow-lg">
            {/* A MenuBar só é renderizada quando o editor está 100% pronto */}
            {editor && isEditorReady && <MenuBar editor={editor} onClose={onClose} />}
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;

