// src/components/TextEditor.tsx

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useEditor, EditorContent, Editor, JSONContent } from '@tiptap/react';
import { Italic, Bold, X, Underline, List, ListOrdered, Blockquote } from 'lucide-react';
import StarterKit from '@tiptap/starter-kit';
import { useDebouncedCallback } from 'use-debounce';
import { cn } from '@/lib/utils';

// ============================================================================
// --- MenuBar (Versão Estável com HTML Nativo) ---
// ============================================================================
interface MenuBarProps {
  editor: Editor;
  onClose: () => void;
}

const MenuBar = ({ editor, onClose }: MenuBarProps) => {
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

    const buttonClass = "p-2 rounded inline-flex items-center justify-center text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors";
    const activeClass = "bg-accent text-accent-foreground";

    return (
        <div className="p-2 bg-card border-b rounded-t-lg flex flex-wrap gap-2 items-center sticky top-0 z-10">
            {/* GRUPO DE ESTILOS BÁSICOS */}
            <div className="flex items-center gap-1">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={cn(buttonClass, editor.isActive('bold') ? activeClass : '')} title="Negrito"><Bold className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={cn(buttonClass, editor.isActive('italic') ? activeClass : '')} title="Itálico"><Italic className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={cn(buttonClass, editor.isActive('underline') ? activeClass : '')} title="Sublinhado"><Underline className="w-4 h-4" /></button>
            </div>

            {/* GRUPO DE LISTAS E BLOCOS */}
            <div className="flex items-center gap-1">
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(buttonClass, editor.isActive('bulletList') ? activeClass : '')} title="Lista"><List className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(buttonClass, editor.isActive('orderedList') ? activeClass : '')} title="Lista Numerada"><ListOrdered className="w-4 h-4" /></button>
                <button onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn(buttonClass, editor.isActive('blockquote') ? activeClass : '')} title="Citação"><Blockquote className="w-4 h-4" /></button>
            </div>
            
            <div className="flex-grow"></div>
            
            <button onClick={onClose} className={buttonClass} title="Fechar Editor"><X className="w-5 h-5" /></button>
        </div>
    );
};

// ============================================================================
// --- Componente TextEditor (Arquitetura Final) ---
// ============================================================================
interface TextEditorProps {
  initialContent: JSONContent | string | null;
  onSave: (newContent: JSONContent) => Promise<any>;
  onClose: () => void;
}

function TextEditor({ initialContent, onSave, onClose }: TextEditorProps) {
    const [isEditorReady, setIsEditorReady] = useState(false);

    const debouncedSave = useDebouncedCallback((editor) => {
        onSave(editor.getJSON());
    }, 1000);

    const editor = useEditor({
        extensions: [
            // CORREÇÃO FINAL: Configuração explícita para garantir que tudo seja incluído.
            StarterKit.configure({
                bold: true,
                italic: true,
                underline: true,
                bulletList: true,
                orderedList: true,
                blockquote: true,
            }),
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
        onCreate: () => {
            setIsEditorReady(true);
        },
    });
    
    useEffect(() => {
        if (editor && initialContent) {
            const isSame = JSON.stringify(editor.getJSON()) === JSON.stringify(initialContent);
            if (!isSame) editor.commands.setContent(initialContent, false);
        }
    }, [initialContent, editor]);

    return (
        <div className="h-full flex flex-col border rounded-lg bg-card shadow-lg">
            {editor && isEditorReady && <MenuBar editor={editor} onClose={onClose} />}
            <EditorContent editor={editor} className="flex-grow overflow-y-auto" />
        </div>
    );
}

export default TextEditor;

