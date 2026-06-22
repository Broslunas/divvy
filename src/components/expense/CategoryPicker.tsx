'use client';

import {
  UtensilsCrossed,
  Car,
  Hotel,
  ShoppingCart,
  Music,
  ShoppingBag,
  Heart,
  Wrench,
  MoreHorizontal,
  Ticket,
  BookOpen,
  Laptop,
  type LucideIcon,
} from 'lucide-react';
import styles from './expense.module.css';

interface CategoryPickerProps {
  selected: string;
  onSelect: (category: string) => void;
  isBonoCultural?: boolean;
}

interface CategoryItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

const standardCategories: CategoryItem[] = [
  { key: 'Comida', label: 'Comida', icon: UtensilsCrossed },
  { key: 'Transporte', label: 'Transporte', icon: Car },
  { key: 'Alojamiento', label: 'Alojamiento', icon: Hotel },
  { key: 'Supermercado', label: 'Súper', icon: ShoppingCart },
  { key: 'Entretenimiento', label: 'Ocio', icon: Music },
  { key: 'Compras', label: 'Compras', icon: ShoppingBag },
  { key: 'Salud', label: 'Salud', icon: Heart },
  { key: 'Servicios', label: 'Servicios', icon: Wrench },
  { key: 'Otros', label: 'Otros', icon: MoreHorizontal },
];

const bonoCategories: CategoryItem[] = [
  { key: 'Artes en vivo, patrimonio y audiovisual', label: 'Artes en vivo', icon: Ticket },
  { key: 'Soporte físico', label: 'Soporte físico', icon: BookOpen },
  { key: 'Consumo digital', label: 'Consumo digital', icon: Laptop },
];

export default function CategoryPicker({ selected, onSelect, isBonoCultural }: CategoryPickerProps) {
  const categoriesList = isBonoCultural ? bonoCategories : standardCategories;

  return (
    <div 
      className={styles.categoryGrid}
      style={isBonoCultural ? { gridTemplateColumns: 'repeat(3, 1fr)' } : undefined}
    >
      {categoriesList.map(({ key, label, icon: Icon }) => {
        const isActive = selected === key;
        const cardClass = isActive
          ? `${styles.categoryCard} ${styles.selected}`
          : styles.categoryCard;

        return (
          <button
            key={key}
            type="button"
            className={cardClass}
            onClick={() => onSelect(key)}
            aria-pressed={isActive}
            style={isBonoCultural ? { padding: '12px 6px', gap: '6px' } : undefined}
          >
            <Icon size={isBonoCultural ? 28 : 24} className={styles.categoryIcon} />
            <span className={styles.categoryLabel} style={isBonoCultural ? { fontSize: '0.72rem', whiteSpace: 'normal', lineHeight: 1.1 } : undefined}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
