'use client';

import { useMemo, type ComponentType } from 'react';
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
  Calendar,
  CreditCard,
  Check,
  type LucideProps,
} from 'lucide-react';
import MemberAvatar from './MemberAvatar';
import SplitBar from './SplitBar';
import type { User, SplitType, ItemizedBillItem } from '@/types';
import { getCurrencySymbol } from '@/lib/utils';
import styles from './expense.module.css';

interface StepReviewProps {
  title: string;
  amount: string;
  date: string;
  category: string;
  notes: string;
  tags: string;
  paymentMethod: string;
  currency?: string;
  // Payer
  paidById: string;
  isMultiPayer: boolean;
  payerAmounts: Record<string, string>;
  // Split
  splitType: SplitType;
  splitValues: Record<string, string>;
  // Members
  members: Omit<User, 'passwordHash'>[];
  currentUserId: string;
  // Itemized
  itemizedItems: ItemizedBillItem[];
}

// --- Category → Icon map ---
const CATEGORY_ICONS: Record<string, ComponentType<LucideProps>> = {
  Comida: UtensilsCrossed,
  Transporte: Car,
  Alojamiento: Hotel,
  Supermercado: ShoppingCart,
  Entretenimiento: Music,
  Compras: ShoppingBag,
  Salud: Heart,
  Servicios: Wrench,
  Otros: MoreHorizontal,
};

// --- Category → display label ---
const CATEGORY_LABELS: Record<string, string> = {
  Comida: 'Comida',
  Transporte: 'Transporte',
  Alojamiento: 'Alojamiento',
  Supermercado: 'Supermercado',
  Entretenimiento: 'Ocio',
  Compras: 'Compras',
  Salud: 'Salud',
  Servicios: 'Servicios',
  Otros: 'Otros',
};

// --- Payment method → display label ---
const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  bizum: 'Bizum',
  paypal: 'PayPal',
  transfer: 'Transferencia',
};

// --- Split type → display label ---
const SPLIT_LABELS: Record<SplitType, string> = {
  equal: 'Partes iguales',
  exact: 'Cantidades exactas',
  percentage: 'Porcentaje',
  shares: 'Proporcional',
  itemized: 'Desglose por artículos',
};

function formatDateES(dateStr: string): string {
  if (!dateStr) return '';
  const months = [
    'ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.',
    'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.',
  ];
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function StepReview({
  title,
  amount,
  date,
  category,
  notes,
  tags,
  paymentMethod,
  currency,
  paidById,
  isMultiPayer,
  payerAmounts,
  splitType,
  splitValues,
  members,
  currentUserId,
  itemizedItems,
}: StepReviewProps) {
  const currencySymbol = getCurrencySymbol(currency);
  const totalAmount = parseFloat(amount) || 0;
  const CategoryIcon = CATEGORY_ICONS[category] || MoreHorizontal;

  // Sort members: current user first
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return a.username.localeCompare(b.username);
    });
  }, [members, currentUserId]);

  // Find member by ID
  const getMember = (id: string) => members.find((m) => m.id === id);
  const getDisplayName = (member: Omit<User, 'passwordHash'> | undefined) => {
    if (!member) return 'Desconocido';
    return member.id === currentUserId ? 'Tú' : member.username;
  };

  // Calculate participant amount
  const getParticipantAmount = (userId: string): number => {
    const val = parseFloat(splitValues[userId] || '0');

    switch (splitType) {
      case 'equal': {
        if (splitValues[userId] === 'false') return 0;
        const activeCount = Object.values(splitValues).filter((v) => v !== 'false').length;
        return activeCount > 0 ? totalAmount / activeCount : 0;
      }
      case 'itemized':
      case 'exact':
        return val;
      case 'percentage':
        return (val / 100) * totalAmount;
      case 'shares': {
        const totalShares = Object.entries(splitValues).reduce(
          (sum, [, v]) => sum + (parseFloat(v) || 0),
          0
        );
        return totalShares > 0 ? (val / totalShares) * totalAmount : 0;
      }
      default:
        return 0;
    }
  };

  const getBarPercentage = (userId: string): number => {
    if (totalAmount <= 0) return 0;
    return Math.min(100, Math.max(0, (getParticipantAmount(userId) / totalAmount) * 100));
  };

  // Active participants for the split list
  const activeMembers = useMemo(() => {
    return sortedMembers.filter((m) => {
      if (splitType === 'equal') return splitValues[m.id] !== 'false';
      return (parseFloat(splitValues[m.id] || '0')) > 0;
    });
  }, [sortedMembers, splitValues, splitType]);

  // Parse tags
  const tagsList = tags
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  // Payers for multi-payer display
  const activePayers = useMemo(() => {
    if (!isMultiPayer) return [];
    return sortedMembers.filter((m) => parseFloat(payerAmounts[m.id] || '0') > 0);
  }, [isMultiPayer, sortedMembers, payerAmounts]);

  const primaryPayer = getMember(paidById);

  return (
    <div className={styles.stepContainer}>
      <div className={styles.reviewCard}>
        {/* --- Header --- */}
        <div className={styles.reviewHeader}>
          <div className={styles.reviewIconWrap}>
            <CategoryIcon size={24} />
          </div>
          <div className={styles.reviewTitleGroup}>
            <div className={styles.reviewTitle}>{title || 'Sin concepto'}</div>
            <div className={styles.reviewMeta}>
              {date && (
                <>
                  <Calendar size={11} />
                  {formatDateES(date)}
                </>
              )}
              {category && (
                <>
                  <span>·</span>
                  {CATEGORY_LABELS[category] || category}
                </>
              )}
              {paymentMethod && (
                <>
                  <span>·</span>
                  <CreditCard size={11} />
                  {PAYMENT_LABELS[paymentMethod] || paymentMethod}
                </>
              )}
            </div>
          </div>
        </div>

        {/* --- Amount --- */}
        <div className={styles.reviewAmountBig}>
          {currencySymbol}{totalAmount.toFixed(2)}
        </div>

        <div className={styles.reviewDivider} />

        {/* --- Payer Section --- */}
        <div className={styles.reviewSection}>
          <span className={styles.reviewSectionTitle}>Pagado por</span>
          {!isMultiPayer ? (
            <div className={styles.reviewSplitRow}>
              {primaryPayer && (
                <>
                  <MemberAvatar
                    name={primaryPayer.username}
                    color={primaryPayer.avatarColor}
                    size="sm"
                  />
                  <div className={styles.reviewSplitInfo}>
                    <span className={styles.reviewSplitName}>
                      {getDisplayName(primaryPayer)}
                    </span>
                  </div>
                  <span className={styles.reviewSplitAmount}>
                    {currencySymbol}{totalAmount.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          ) : (
            activePayers.map((member) => {
              const payerAmt = parseFloat(payerAmounts[member.id] || '0');
              return (
                <div key={member.id} className={styles.reviewSplitRow}>
                  <MemberAvatar
                    name={member.username}
                    color={member.avatarColor}
                    size="sm"
                  />
                  <div className={styles.reviewSplitInfo}>
                    <span className={styles.reviewSplitName}>
                      {getDisplayName(member)}
                    </span>
                  </div>
                  <span className={styles.reviewSplitAmount}>
                    {currencySymbol}{payerAmt.toFixed(2)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.reviewDivider} />

        {/* --- Split Section --- */}
        <div className={styles.reviewSection}>
          <span className={styles.reviewSectionTitle}>
            Reparto · {SPLIT_LABELS[splitType]}
          </span>
          {activeMembers.map((member) => {
            const memberAmount = getParticipantAmount(member.id);
            const barPct = getBarPercentage(member.id);

            return (
              <div key={member.id} className={styles.reviewSplitRow}>
                <MemberAvatar
                  name={member.username}
                  color={member.avatarColor}
                  size="sm"
                />
                <div className={styles.reviewSplitInfo}>
                  <span className={styles.reviewSplitName}>
                    {getDisplayName(member)}
                  </span>
                  <SplitBar color={member.avatarColor} percentage={barPct} />
                </div>
                <span className={styles.reviewSplitAmount}>
                  {currencySymbol}{memberAmount.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>

        {/* --- Itemized Summary --- */}
        {itemizedItems.length > 0 && (
          <>
            <div className={styles.reviewDivider} />
            <div className={styles.reviewSection}>
              <span className={styles.reviewSectionTitle}>
                <Check size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                Desglose ({itemizedItems.length} artículos)
              </span>
            </div>
          </>
        )}

        {/* --- Tags --- */}
        {tagsList.length > 0 && (
          <div className={styles.tagsWrap}>
            {tagsList.map((tag) => (
              <span key={tag} className={styles.tagPill}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* --- Notes --- */}
        {notes && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, margin: 0, lineHeight: 1.5 }}>
            {notes}
          </p>
        )}
      </div>
    </div>
  );
}
