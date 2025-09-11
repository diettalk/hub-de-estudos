import { Mark } from '@tiptap/core';

// Define um novo tipo de "Mark" para os nossos links [[...]]
// para que possamos estilizá-los de forma diferente de links normais.
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
    // Adiciona uma classe CSS específica para podermos estilizar no TextEditor.css
    return ['a', { ...HTMLAttributes, class: 'wiki-link' }, 0];
  },
});

