// src/extensions/WikiLinkExtension.ts
import { Node, mergeAttributes } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import { WikiLinkSuggestion } from '@/components/WikiLinkSuggestion'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabaseClient'

export const WikiLinkExtension = Node.create({
  name: 'wikilink',

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: { default: null },
      title: { default: '' },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="wikilink"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'wikilink', class: 'text-blue-500 underline cursor-pointer' }), HTMLAttributes.title]
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        char: '[[',
        allowSpaces: true,
        startOfLine: false,
        items: async ({ query }) => {
          if (!query) return []

          // 🔍 Busca no Supabase
          const { data, error } = await supabase
            .from('notes')
            .select('id, title')
            .ilike('title', `%${query}%`)
            .limit(5)

          if (error) {
            console.error(error)
            return []
          }

          return data || []
        },
        render: () => {
          let reactRenderer: any
          let popup: any

          return {
            onStart: props => {
              reactRenderer = new ReactRenderer(WikiLinkSuggestion, {
                props,
                editor: props.editor,
              })

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect as any,
                appendTo: () => document.body,
                content: reactRenderer.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              })
            },
            onUpdate(props) {
              reactRenderer.updateProps(props)

              popup[0].setProps({
                getReferenceClientRect: props.clientRect as any,
              })
            },
            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                popup[0].hide()
                return true
              }
              return reactRenderer.ref?.onKeyDown?.(props)
            },
            onExit() {
              popup[0].destroy()
              reactRenderer.destroy()
            },
          }
        },
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'wikilink',
                attrs: props,
              },
              { type: 'text', text: ' ' },
            ])
            .run()
        },
      }),
    ]
  },
})
