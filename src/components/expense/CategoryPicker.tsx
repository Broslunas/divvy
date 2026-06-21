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
  type LucideIcon,
} from 'lucide-react';
import styles from './expense.module.css';

interface CategoryPickerProps {
  selected: string;
  onSelect: (category: string) => void;
}

interface CategoryItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

const categories: CategoryItem[] = [
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

export default function CategoryPicker({ selected, onSelect }: CategoryPickerProps) {
  return (
    <div className={styles.categoryGrid}>
      {categories.map(({ key, label, icon: Icon }) => {
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
          >
            <Icon size={24} className={styles.categoryIcon} />
            <span className={styles.categoryLabel}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
