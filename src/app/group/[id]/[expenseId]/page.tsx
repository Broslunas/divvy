'use client';

import { useState, useEffect, use, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Trash2, Loader2, CheckSquare, Square,
  Utensils, Car, Home, ShoppingBag, Ticket, Package,
  Calendar, CreditCard, Hash, Users, FileText,
  Check, AlertCircle, Equal, DollarSign, Percent, Users2,
} from 'lucide-react';
import type { Group, Expense, User, ExpenseSplit, ItemizedBillItem, SplitType } from '@/types';
import { getCurrencySymbol, computeItemShare } from '@/lib/utils';
import styles from './expense-detail.module.css';

interface PageProps {
  params: Promise<{ id: string; expenseId: string }>;
}

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

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  bizum: 'Bizum',
  paypal: 'PayPal',
  transfer: 'Transferencia',
};

const SPLIT_LABELS: Record<SplitType, string> = {
  equal: 'Partes iguales',
  exact: 'Cantidades exactas',
  percentage: 'Porcentaje',
  shares: 'Proporcional',
  itemized: 'Desglose por artículos',
};

const SPLIT_TABS: { type: SplitType; label: string; icon: typeof Equal }[] = [
  { type: 'equal', label: 'Igual', icon: Equal },
  { type: 'exact', label: 'Exacto', icon: DollarSign },
  { type: 'percentage', label: '%', icon: Percent },
  { type: 'shares', label: 'Partes', icon: Users2 },
];

function getCategoryIcon(category: string, size = 18) {
  const props = { size, style: { color: 'var(--text-secondary)' } };
  switch (category) {
    case 'Comida': return <Utensils {...props} />;
    case 'Transporte': return <Car {...props} />;
    case 'Alojamiento': return <Home {...props} />;
    case 'Supermercado': return <ShoppingBag {...props} />;
    case 'Entretenimiento': return <Ticket {...props} />;
    default: return <Package {...props} />;
  }
}

function formatDateES(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ExpenseDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id: groupId, expenseId } = use(params);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Omit<User, 'passwordHash'>[]>([]);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const currencySymbol = getCurrencySymbol(group?.currency);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.replace('/login');
        return;
      }
      const userData = await userRes.json();
      setCurrentUser(userData);

      const groupRes = await fetch(`/api/groups/${groupId}`);
      if (!groupRes.ok) {
        const data = await groupRes.json();
        throw new Error(data.error || 'No se pudo cargar el grupo.');
      }
      const groupData = await groupRes.json();
      setGroup(groupData.group);
      setMembers(groupData.members);

      const found = groupData.expenses.find((e: Expense) => e.id === expenseId);
      if (!found) {
        setError('No se encontró este gasto en el grupo.');
        setExpense(null);
      } else {
        setExpense(found);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar el gasto.');
    } finally {
      setLoading(false);
    }
  }, [groupId, expenseId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAll();
  }, [fetchAll]);

  const memberById = useMemo(() => {
    const map = new Map<string, Omit<User, 'passwordHash'>>();
    members.forEach(m => map.set(m.id, m));
    return map;
  }, [members]);

  const payerName = (uid: string) => memberById.get(uid)?.username || 'Desconocido';
  const isCurrentUser = (uid: string) => uid === currentUser?.id;

  // --- Handlers ---
  const handleToggleSplitPaid = async (splitUserId: string, currentIsPaid: boolean) => {
    if (!expense) return;
    setUpdating(true);
    const updatedSplits: ExpenseSplit[] = expense.splits.map(s =>
      s.userId === splitUserId ? { ...s, isPaid: !currentIsPaid } : s
    );

    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expense.id, splits: updatedSplits }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar el pago.');
      }
      const data = await res.json();
      setExpense(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar el pago.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses?id=${expense.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar el gasto.');
      }
      router.push(`/group/${groupId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el gasto.');
      setDeleting(false);
    }
  };

  // --- Derived data ---
  const getMemberShare = (memberId: string): number => {
    if (!expense) return 0;
    const { splitType, splits, amount } = expense;

    if (splitType === 'equal') {
      const isParticipant = splits.some(s => s.userId === memberId);
      if (!isParticipant) return 0;
      return amount / (splits.length || 1);
    }

    if (splitType === 'itemized') {
      // Derive from configured items if available, else fall back to stored splits.
      if (expense.items && expense.items.length > 0) {
        return expense.items.reduce((sum, item) => {
          const shares = computeItemShare(item);
          return sum + (shares[memberId] || 0);
        }, 0);
      }
      const split = splits.find(s => s.userId === memberId);
      return split?.value || 0;
    }

    const userSplit = splits.find(s => s.userId === memberId);
    if (!userSplit) return 0;

    if (splitType === 'exact') return userSplit.value;
    if (splitType === 'percentage') return (userSplit.value / 100) * amount;
    if (splitType === 'shares') {
      const totalShares = splits.reduce((sum, s) => sum + s.value, 0);
      return totalShares > 0 ? (userSplit.value / totalShares) * amount : 0;
    }
    return 0;
  };

  const isFullySettled = useMemo(() => {
    if (!expense) return false;
    const isPayerOnly = (uid: string) =>
      expense.multiPayers && expense.multiPayers.length > 0
        ? expense.multiPayers.some(p => p.userId === uid)
        : uid === expense.paidById;
    return expense.splits.every(s => s.isPaid || isPayerOnly(s.userId) || getMemberShare(s.userId) === 0);
  }, [expense]);

  const totalAllocated = useMemo(() => {
    if (!expense) return 0;
    return members.reduce((sum, m) => sum + getMemberShare(m.id), 0);
  }, [expense, members]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Render ---
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spin} />
          <span>Cargando gasto...</span>
        </div>
      </div>
    );
  }

  if (error && !expense) {
    return (
      <div className={styles.page}>
        <header className={styles.header}>
          <Link href={`/group/${groupId}`} className={styles.backBtn}>
            <ArrowLeft size={16} /> Volver al grupo
          </Link>
        </header>
        <div className={styles.errorState}>
          <AlertCircle size={28} />
          <p>{error}</p>
          <Link href={`/group/${groupId}`} className={styles.retryBtn}>
            Volver al grupo
          </Link>
        </div>
      </div>
    );
  }

  if (!expense || !group) {
    return null;
  }

  const canDelete =
    expense.paidById === currentUser?.id ||
    (expense.multiPayers?.some(p => p.userId === currentUser?.id) ?? false) ||
    group.members[0] === currentUser?.id; // fallback: any member can delete if owner check missing

  const isPayerOf = (uid: string) =>
    expense.multiPayers && expense.multiPayers.length > 0
      ? expense.multiPayers.some(p => p.userId === uid)
      : uid === expense.paidById;

  const statusBadge = expense.isSettlement
    ? { label: 'Liquidación', bg: 'var(--accent-light, rgba(200,122,83,0.15))', color: 'var(--accent-primary)' }
    : isFullySettled
      ? { label: 'Saldado', bg: 'var(--success-light)', color: 'var(--success)' }
      : { label: 'Pendiente', bg: '#FDF5E6', color: '#D48C45' };

  const hasItems = !!(expense.items && expense.items.length > 0);
  const showSplitDetail = !expense.isSettlement;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link href={`/group/${groupId}`} className={styles.backBtn}>
          <ArrowLeft size={16} /> Volver al grupo
        </Link>
        {canDelete && (
          <button
            className={styles.deleteBtn}
            onClick={handleDelete}
            disabled={deleting}
            title="Eliminar gasto"
          >
            {deleting ? <Loader2 size={15} className={styles.spin} /> : <Trash2 size={15} />}
            <span>Eliminar</span>
          </button>
        )}
      </header>

      {error && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* --- Title & Amount --- */}
      <section className={styles.heroCard}>
        <div className={styles.heroTop}>
          <div className={styles.heroIcon}>{getCategoryIcon(expense.category, 24)}</div>
          <div className={styles.heroInfo}>
            <h1 className={styles.heroTitle}>{expense.title}</h1>
            <div className={styles.heroMeta}>
              <span className={styles.heroCategory}>{CATEGORY_LABELS[expense.category] || expense.category}</span>
              <span className={styles.metaDot}>·</span>
              <span className={styles.metaItem}>
                <Calendar size={12} /> {formatDateES(expense.date)}
              </span>
              {expense.paymentMethod && (
                <>
                  <span className={styles.metaDot}>·</span>
                  <span className={styles.metaItem}>
                    <CreditCard size={12} /> {PAYMENT_LABELS[expense.paymentMethod] || expense.paymentMethod}
                  </span>
                </>
              )}
            </div>
            <div className={styles.heroBadges}>
              <span
                className={styles.statusBadge}
                style={{ backgroundColor: statusBadge.bg, color: statusBadge.color }}
              >
                {statusBadge.label}
              </span>
              {expense.tags && expense.tags.length > 0 && expense.tags.map(t => (
                <span key={t} className={styles.tagPill}>
                  <Hash size={11} /> {t}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.heroAmount}>
          {expense.amount.toFixed(2)} {currencySymbol}
        </div>
      </section>

      {/* --- Payer Section --- */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          <Users size={14} /> Pagado por
        </h2>
        <div className={styles.payerCard}>
          {expense.multiPayers && expense.multiPayers.length > 0 ? (
            expense.multiPayers.map(p => {
              const m = memberById.get(p.userId);
              return (
                <div key={p.userId} className={styles.payerRow}>
                  <span
                    className={styles.payerDot}
                    style={{ backgroundColor: m?.avatarColor || '#888' }}
                  />
                  <span className={styles.payerName}>
                    {isCurrentUser(p.userId) ? 'Tú' : payerName(p.userId)}
                  </span>
                  <span className={styles.payerAmount}>
                    {p.amount.toFixed(2)} {currencySymbol}
                  </span>
                </div>
              );
            })
          ) : (
            <div className={styles.payerRow}>
              <span
                className={styles.payerDot}
                style={{ backgroundColor: memberById.get(expense.paidById)?.avatarColor || '#888' }}
              />
              <span className={styles.payerName}>
                {isCurrentUser(expense.paidById) ? 'Tú' : payerName(expense.paidById)}
              </span>
              <span className={styles.payerAmount}>
                {expense.amount.toFixed(2)} {currencySymbol}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* --- Itemized Breakdown --- */}
      {hasItems && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Hash size={14} /> Desglose por artículos
            <span className={styles.sectionCount}>({expense.items!.length})</span>
          </h2>
          <div className={styles.itemsList}>
            {expense.items!.map((item, idx) => (
              <ItemRow
                key={idx}
                item={item}
                currencySymbol={currencySymbol}
                currentUserId={currentUser?.id || ''}
                memberById={memberById}
              />
            ))}
          </div>
        </section>
      )}

      {/* --- Splits Section --- */}
      {showSplitDetail && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <Users size={14} /> Reparto
            <span className={styles.splitLabel}>{SPLIT_LABELS[expense.splitType]}</span>
          </h2>
          <div className={styles.splitsList}>
            {members.map(member => {
              const share = getMemberShare(member.id);
              if (share === 0) return null;
              const splitInfo = expense.splits.find(s => s.userId === member.id);
              const isPaid = splitInfo ? splitInfo.isPaid : false;
              const isPayer = isPayerOf(member.id);
              const barPct = expense.amount > 0 ? Math.min(100, (share / expense.amount) * 100) : 0;

              return (
                <div key={member.id} className={styles.splitRow}>
                  <span
                    className={styles.splitDot}
                    style={{ backgroundColor: member.avatarColor }}
                  />
                  <div className={styles.splitBody}>
                    <span className={styles.splitName}>
                      {isCurrentUser(member.id) ? 'Tú' : member.username}
                    </span>
                    <div className={styles.splitBarTrack}>
                      <div
                        className={styles.splitBarFill}
                        style={{ width: `${barPct}%`, backgroundColor: member.avatarColor }}
                      />
                    </div>
                  </div>
                  <span
                    className={styles.splitAmount}
                    style={{ color: isPaid ? 'var(--text-muted)' : 'var(--text-primary)' }}
                  >
                    {share.toFixed(2)} {currencySymbol}
                  </span>
                  {isPayer ? (
                    <span className={styles.payerTag}>PAGÓ</span>
                  ) : (
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      onClick={() => handleToggleSplitPaid(member.id, isPaid)}
                      disabled={updating}
                      title={isPaid ? 'Marcar como pendiente' : 'Marcar como pagado'}
                    >
                      {isPaid ? (
                        <CheckSquare size={18} style={{ color: 'var(--success)' }} />
                      ) : (
                        <Square size={18} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.totalRow}>
            <span>Total asignado</span>
            <span className={styles.totalAmount}>
              {totalAllocated.toFixed(2)} {currencySymbol}
            </span>
          </div>
        </section>
      )}

      {/* --- Notes --- */}
      {expense.notes && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <FileText size={14} /> Notas
          </h2>
          <div className={styles.notesCard}>
            {expense.notes}
          </div>
        </section>
      )}

      {/* --- Settlement specific --- */}
      {expense.isSettlement && (
        <section className={styles.section}>
          <div className={styles.settlementBanner}>
            <Check size={20} />
            <div>
              <strong>Liquidación registrada</strong>
              <p>Este gasto refleja un pago entre miembros para saldar deudas.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

// --- Item row subcomponent (read-only display) ---
function ItemRow({
  item,
  currencySymbol,
  currentUserId,
  memberById,
}: {
  item: ItemizedBillItem;
  currencySymbol: string;
  currentUserId: string;
  memberById: Map<string, Omit<User, 'passwordHash'>>;
}) {
  const splitType: SplitType = item.splitType ?? 'equal';
  const splitValues = item.splitValues ?? {};
  const tabInfo = SPLIT_TABS.find(t => t.type === splitType);
  const TabIcon = tabInfo?.icon || Equal;

  const shares = computeItemShare(item);

  return (
    <div className={styles.itemCard}>
      <div className={styles.itemHeader}>
        <span className={styles.itemName}>{item.name}</span>
        <span className={styles.itemAmount}>
          {item.amount.toFixed(2)} {currencySymbol}
        </span>
      </div>

      <div className={styles.itemMetaRow}>
        <span className={styles.itemMetaLabel}>Para:</span>
        <div className={styles.participantChips}>
          {item.userIds.length === 0 && (
            <span className={styles.warning}>
              <AlertCircle size={11} /> Sin asignar
            </span>
          )}
          {item.userIds.map(uid => {
            const m = memberById.get(uid);
            if (!m) return null;
            return (
              <span
                key={uid}
                className={styles.participantChip}
                style={{ backgroundColor: m.avatarColor }}
                title={m.username}
              >
                {m.username.substring(0, 2).toUpperCase()}
              </span>
            );
          })}
        </div>

        <span className={styles.itemMetaLabel}>Reparto:</span>
        <span className={styles.itemSplitBadge}>
          <TabIcon size={11} /> {tabInfo?.label || 'Igual'}
        </span>
      </div>

      {splitType !== 'equal' && (
        <div className={styles.itemValueList}>
          {item.userIds.map(uid => {
            const m = memberById.get(uid);
            if (!m) return null;
            const raw = splitValues[uid] || '0';
            const computed = shares[uid] || 0;
            return (
              <div key={uid} className={styles.itemValueRow}>
                <span
                  className={styles.itemValueDot}
                  style={{ backgroundColor: m.avatarColor }}
                />
                <span className={styles.itemValueName}>
                  {uid === currentUserId ? 'Tú' : m.username}
                </span>
                <span className={styles.itemValueRaw}>
                  {parseFloat(raw) > 0 ? `${raw}${splitType === 'exact' ? currencySymbol : splitType === 'percentage' ? '%' : ' pts'}` : '—'}
                </span>
                <span className={styles.itemValueComputed}>
                  → {computed.toFixed(2)} {currencySymbol}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
