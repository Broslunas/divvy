'use client';

import {
  Coffee,
  Car,
  ShoppingCart,
  UtensilsCrossed,
  Fuel,
  Ticket,
  type LucideIcon,
} from 'lucide-react';
import styles from './expense.module.css';

interface TemplateData {
  title: string;
  amount: number;
  category: string;
  icon: LucideIcon;
}

interface QuickTemplatesProps {
  onSelect: (template: { title: string; amount: number; category: string }) => void;
  currencySymbol: string;
}

const templates: TemplateData[] = [
  { title: 'Café', amount: 2.5, category: 'Comida', icon: Coffee },
  { title: 'Taxi', amount: 15.0, category: 'Transporte', icon: Car },
  { title: 'Supermercado', amount: 24.5, category: 'Supermercado', icon: ShoppingCart },
  { title: 'Cena', amount: 45.0, category: 'Comida', icon: UtensilsCrossed },
  { title: 'Gasolina', amount: 40.0, category: 'Transporte', icon: Fuel },
  { title: 'Entradas', amount: 20.0, category: 'Entretenimiento', icon: Ticket },
];

export default function QuickTemplates({ onSelect, currencySymbol }: QuickTemplatesProps) {
  return (
    <div className={styles.templatesRow}>
      {templates.map(({ title, amount, category, icon: Icon }) => (
        <button
          key={title}
          type="button"
          className={styles.templateChip}
          onClick={() => onSelect({ title, amount, category })}
        >
          <Icon size={14} />
          <span>{title}</span>
          <span>
            {currencySymbol}
            {amount.toFixed(2)}
          </span>
        </button>
      ))}
    </div>
  );
}
