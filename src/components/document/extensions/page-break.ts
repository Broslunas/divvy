import { Node } from '@tiptap/core';

export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  selectable: true,
  draggable: true,

  parseHTML() {
    return [
      { tag: 'hr[data-type="page-break"]' }
    ];
  },

  renderHTML() {
    return ['hr', { 'data-type': 'page-break', class: 'page-break-divider', contenteditable: 'false' }];
  },

  addCommands() {
    return {
      insertPageBreak: () => ({ commands }) => {
        return commands.insertContent({ type: this.name });
      }
    };
  }
});

// TypeScript declaration merge for custom command typings
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
  }
}
