import { Mark, mergeAttributes } from '@tiptap/core';

export const WikiLink = Mark.create({
  name: 'wikiLink',
  
  addAttributes() {
    return {
      href: { default: null },
      'data-type': { default: 'wikiLink' },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="wikiLink"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    // Adiciona uma classe CSS que será usada no TextEditor.tsx
    return ['a', mergeAttributes({ class: 'wiki-link' }, HTMLAttributes), 0];
  },
});

