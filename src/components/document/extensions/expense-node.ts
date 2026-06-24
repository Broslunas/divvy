import { Node, mergeAttributes } from '@tiptap/core';

export const ExpenseBlock = Node.create({
  name: 'expenseBlock',
  group: 'block',
  atom: true, // No permite edición de texto interno, se comporta como un bloque único

  addAttributes() {
    return {
      id: { default: null },
      title: { default: 'Gasto' },
      amount: { default: 0 },
      category: { default: 'Otros' },
      paidBy: { default: '' },
      currency: { default: 'EUR' }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-expense-id]',
        getAttrs: (dom) => {
          if (typeof dom === 'string') return {};
          const element = dom as HTMLElement;
          return {
            id: element.getAttribute('data-expense-id'),
            title: element.getAttribute('data-title'),
            amount: parseFloat(element.getAttribute('data-amount') || '0'),
            category: element.getAttribute('data-category'),
            paidBy: element.getAttribute('data-paid-by'),
            currency: element.getAttribute('data-currency') || 'EUR'
          };
        }
      }
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { id, title, amount, category, paidBy, currency } = node.attrs;
    const currencySymbols: Record<string, string> = {
      EUR: '€',
      USD: '$',
      GBP: '£',
      JPY: '¥',
      MXN: '$',
    };
    const symbol = currencySymbols[currency || 'EUR'] || '€';

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-expense-id': id,
        'data-title': title,
        'data-amount': amount,
        'data-category': category,
        'data-paid-by': paidBy,
        'data-currency': currency,
        class: 'expense-embed-block',
        contenteditable: 'false' // Evita que ProseMirror intente escribir texto dentro de este nodo
      }),
      [
        'div',
        { class: 'expense-embed-left' },
        ['span', { class: 'expense-embed-icon' }, '💰'],
        [
          'div',
          { class: 'expense-embed-info' },
          ['div', { class: 'expense-embed-title' }, title],
          ['div', { class: 'expense-embed-meta' }, `${paidBy ? `Pagado por ${paidBy}` : ''} • ${category}`]
        ]
      ],
      [
        'div',
        { class: 'expense-embed-right' },
        ['span', { class: 'expense-embed-amount' }, `${amount.toFixed(2)}${symbol}`]
      ]
    ];
  }
});
