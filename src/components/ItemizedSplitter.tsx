'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Check, AlertCircle, Equal, DollarSign, Percent, Users2 } from 'lucide-react';
import type { User, ItemizedBillItem, SplitType } from '@/types';
import { computeItemizedDebts } from '@/lib/utils';

interface ItemizedSplitterProps {
  members: Omit<User, 'passwordHash'>[];
  currentUserId: string;
  initialItems?: ItemizedBillItem[];
  currency?: string;
  onConfirm: (totalAmount: number, items: ItemizedBillItem[], splits: { userId: string; value: number }[]) => void;
  onCancel: () => void;
}

const SPLIT_TABS: { type: SplitType; label: string; icon: typeof Equal }[] = [
  { type: 'equal', label: 'Igual', icon: Equal },
  { type: 'exact', label: 'Exacto', icon: DollarSign },
  { type: 'percentage', label: '%', icon: Percent },
  { type: 'shares', label: 'Partes', icon: Users2 },
];

function getCurrencySymbol(code?: string): string {
  const symbols: Record<string, string> = {
    EUR: '€', USD: '$', GBP: '£', JPY: '¥', MXN: '$',
  };
  return symbols[code || 'EUR'] || code || '€';
}

function getUnitLabel(splitType: SplitType): string {
  switch (splitType) {
    case 'exact': return '';
    case 'percentage': return '%';
    case 'shares': return 'pts';
    default: return '';
  }
}

export default function ItemizedSplitter({
  members,
  currentUserId,
  initialItems = [],
  currency,
  onConfirm,
  onCancel
}: ItemizedSplitterProps) {
  const [items, setItems] = useState<ItemizedBillItem[]>(initialItems);
  const currencySymbol = getCurrencySymbol(currency);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(initialItems);
    }
  }, [initialItems]);

  // --- Helpers ---

  const ensureItemShape = (item: ItemizedBillItem): ItemizedBillItem => {
    const splitType: SplitType = item.splitType ?? 'equal';
    const splitValues = { ...(item.splitValues ?? {}) };
    // For non-equal splits, ensure every selected user has a value key
    if (splitType !== 'equal') {
      item.userIds.forEach((uid) => {
        if (!(uid in splitValues)) splitValues[uid] = '0';
      });
    }
    return { ...item, splitType, splitValues };
  };

  const handleToggleUserForItem = (itemIdx: number, userId: string) => {
    setItems(prev =>
      prev.map((item, idx) => {
        if (idx !== itemIdx) return item;
        const exists = item.userIds.includes(userId);
        const newUserIds = exists
          ? item.userIds.filter(id => id !== userId)
          : [...item.userIds, userId];

        const newSplitValues = { ...(item.splitValues ?? {}) };
        const t = item.splitType ?? 'equal';
        if (t === 'equal') {
          // userIds drives participation; no per-user value needed
        } else if (exists) {
          delete newSplitValues[userId];
        } else {
          newSplitValues[userId] = '0';
        }

        return {
          ...item,
          userIds: newUserIds,
          splitValues: newSplitValues,
        };
      })
    );
  };

  const handleChangeSplitType = (itemIdx: number, newType: SplitType) => {
    setItems(prev =>
      prev.map((item, idx) => {
        if (idx !== itemIdx) return item;
        const oldType: SplitType = item.splitType ?? 'equal';
        if (oldType === newType) return item;

        const newValues: Record<string, string> = {};
        if (newType === 'equal') {
          // Nothing to migrate; userIds drives participation
        } else {
          // Pre-fill new mode values. Equal split values are computed live
          // from userIds, so we have to derive numeric seeds here.
          if (oldType === 'equal' && item.userIds.length > 0) {
            const share = item.amount / item.userIds.length;
            item.userIds.forEach(uid => {
              if (newType === 'exact') newValues[uid] = share.toFixed(2);
              else if (newType === 'percentage') newValues[uid] = ((1 / item.userIds.length) * 100).toFixed(2);
              else if (newType === 'shares') newValues[uid] = '1';
            });
          } else {
            item.userIds.forEach(uid => {
              newValues[uid] = newType === 'shares' ? '1' : '0';
            });
          }
        }
        return {
          ...item,
          splitType: newType,
          splitValues: newValues,
        };
      })
    );
  };

  const handleSplitValueChange = (itemIdx: number, userId: string, val: string) => {
    if (val !== '' && !/^\d*\.?\d*$/.test(val)) return;
    setItems(prev =>
      prev.map((item, idx) => {
        if (idx !== itemIdx) return item;
        return {
          ...item,
          splitValues: { ...(item.splitValues ?? {}), [userId]: val },
        };
      })
    );
  };

  // --- Add-item form state ---
  const [itemName, setItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([currentUserId]);

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(itemAmount);
    if (!itemName.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;
    if (selectedUserIds.length === 0) return;

    const newItem: ItemizedBillItem = ensureItemShape({
      name: itemName.trim(),
      amount: parsedAmount,
      userIds: [...selectedUserIds],
      splitType: 'equal',
    });

    setItems(prev => [...prev, newItem]);
    setItemName('');
    setItemAmount('');
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // --- Calculations ---

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const calculateMemberDebts = (): { userId: string; value: number }[] => {
    return computeItemizedDebts(items, members.map(m => m.id));
  };

  // --- Validation summary per item (for the confirmation footer) ---
  const itemValidation = useMemo(() => {
    return items.map(item => {
      const t: SplitType = item.splitType ?? 'equal';
      if (item.userIds.length === 0) return { ok: false, msg: 'Sin participantes' };
      if (t === 'equal') return { ok: true, msg: '' };
      const values = item.splitValues ?? {};
      if (t === 'exact') {
        const sum = item.userIds.reduce((s, uid) => s + (parseFloat(values[uid] || '0') || 0), 0);
        return Math.abs(sum - item.amount) < 0.05
          ? { ok: true, msg: '' }
          : { ok: false, msg: `Suma ${sum.toFixed(2)}${currencySymbol} ≠ ${item.amount.toFixed(2)}${currencySymbol}` };
      }
      if (t === 'percentage') {
        const sum = item.userIds.reduce((s, uid) => s + (parseFloat(values[uid] || '0') || 0), 0);
        return Math.abs(sum - 100) < 0.1
          ? { ok: true, msg: '' }
          : { ok: false, msg: `Suma ${sum.toFixed(1)}% ≠ 100%` };
      }
      if (t === 'shares') {
        const total = item.userIds.reduce((s, uid) => s + (parseFloat(values[uid] || '0') || 0), 0);
        return total > 0
          ? { ok: true, msg: '' }
          : { ok: false, msg: 'Partes totales = 0' };
      }
      return { ok: true, msg: '' };
    });
  }, [items, currencySymbol]);

  const hasInvalidItems = itemValidation.some(v => !v.ok);

  const handleConfirmClick = () => {
    if (items.length === 0) return;
    if (hasInvalidItems) return;
    // Sanitize: persist normalized items (with defaults applied)
    const normalized = items.map(ensureItemShape);
    const memberDebts = calculateMemberDebts();
    onConfirm(totalAmount, normalized, memberDebts);
  };

  // --- Sort members for stable display ---
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
      return a.username.localeCompare(b.username);
    });
  }, [members, currentUserId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Desglose por Artículos</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          Añade cada artículo, elige quién lo consume y cómo se reparte.
        </p>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px' }}>
          <input
            type="text"
            placeholder="Artículo (ej: Pizza, Cerveza)"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-light)',
              fontSize: '0.8rem',
              outline: 'none',
              backgroundColor: 'var(--bg-card)'
            }}
          />
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="0.00"
              value={itemAmount}
              onChange={(e) => {
                if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                  setItemAmount(e.target.value);
                }
              }}
              style={{
                padding: '8px 8px 8px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontSize: '0.8rem',
                outline: 'none',
                width: '100%',
                textAlign: 'right',
                backgroundColor: 'var(--bg-card)',
                fontWeight: 700
              }}
            />
            <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              {currencySymbol}
            </span>
          </div>
        </div>

        {/* User selectors for this item */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>¿Quién lo comparte?</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {members.map(member => {
              const isSelected = selectedUserIds.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleToggleUser(member.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid',
                    borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-light)',
                    backgroundColor: isSelected ? 'rgba(200, 122, 83, 0.05)' : 'var(--bg-card)',
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: member.avatarColor }} />
                  <span>{member.username}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={!itemName.trim() || !itemAmount || selectedUserIds.length === 0}
          className="btn btn-primary"
          style={{
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            marginTop: '4px'
          }}
        >
          <Plus size={14} /> Añadir Artículo
        </button>
      </form>

      {/* Items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto' }}>
        {items.map((item, idx) => {
          const itemType: SplitType = item.splitType ?? 'equal';
          const itemValues = item.splitValues ?? {};
          const validation = itemValidation[idx];

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '10px',
                backgroundColor: 'var(--bg-card)',
                border: `1px solid ${validation && !validation.ok ? 'var(--danger)' : 'var(--border-light)'}`,
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.8rem'
              }}
            >
              {/* Header row: name + amount + delete */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{item.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700 }}>{item.amount.toFixed(2)}{currencySymbol}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = 'var(--danger)')}
                    onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Participants row */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Para:</span>
                {sortedMembers.map(member => {
                  const isSelected = item.userIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => handleToggleUserForItem(idx, member.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '1px solid',
                        borderColor: isSelected ? member.avatarColor : 'var(--border-light)',
                        backgroundColor: isSelected ? member.avatarColor : 'var(--bg-secondary)',
                        color: isSelected ? '#FFF' : 'var(--text-secondary)',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'var(--transition-smooth)',
                        padding: 0
                      }}
                      title={member.username}
                    >
                      {member.username.substring(0, 2).toUpperCase()}
                    </button>
                  );
                })}
                {item.userIds.length === 0 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--danger)', fontWeight: 600 }}>
                    <AlertCircle size={12} /> Sin asignar
                  </span>
                )}
              </div>

              {/* Split type tabs */}
              {item.userIds.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Reparto:</span>
                  <div style={{ display: 'inline-flex', gap: '2px', backgroundColor: 'var(--bg-secondary)', padding: '2px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    {SPLIT_TABS.map(tab => {
                      const Icon = tab.icon;
                      const isActive = itemType === tab.type;
                      return (
                        <button
                          key={tab.type}
                          type="button"
                          onClick={() => handleChangeSplitType(idx, tab.type)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: 'none',
                            backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                            color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            fontSize: '0.7rem',
                            fontWeight: isActive ? 700 : 500,
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)',
                            boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none'
                          }}
                          title={tab.label}
                        >
                          <Icon size={11} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Per-user value inputs (non-equal) */}
              {item.userIds.length > 0 && itemType !== 'equal' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {item.userIds.map(uid => {
                    const member = members.find(m => m.id === uid);
                    if (!member) return null;
                    const value = itemValues[uid] || '0';
                    return (
                      <div
                        key={uid}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '4px 8px',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 600 }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: member.avatarColor, display: 'inline-block' }} />
                          {uid === currentUserId ? 'Tú' : member.username}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={value}
                            placeholder="0"
                            onChange={(e) => handleSplitValueChange(idx, uid, e.target.value)}
                            style={{
                              width: '60px',
                              padding: '3px 6px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-light)',
                              fontSize: '0.72rem',
                              textAlign: 'right',
                              outline: 'none',
                              backgroundColor: 'var(--bg-card)',
                              fontWeight: 600
                            }}
                          />
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '14px' }}>
                            {itemType === 'exact' ? currencySymbol : getUnitLabel(itemType)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Validation hint */}
              {validation && !validation.ok && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', color: 'var(--danger)', fontWeight: 600 }}>
                  <AlertCircle size={11} /> {validation.msg}
                </span>
              )}
            </div>
          );
        })}

        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.75rem', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
            No se han añadido artículos todavía.
          </div>
        )}
      </div>

      {/* Running total and confirm */}
      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Importe total:</span>
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{totalAmount.toFixed(2)}{currencySymbol}</span>
          </div>

          {/* Member split summary preview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', backgroundColor: 'var(--bg-secondary)', padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontSize: '0.72rem' }}>
            <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>Resumen de cuotas:</span>
            {calculateMemberDebts().map(debt => {
              const u = members.find(m => m.id === debt.userId);
              if (debt.value === 0) return null;
              return (
                <div key={debt.userId} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                  <span>{u?.username}:</span>
                  <span style={{ fontWeight: 700 }}>{debt.value.toFixed(2)}{currencySymbol}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleConfirmClick}
              disabled={hasInvalidItems}
              className="btn btn-primary"
              style={{ flex: 1, padding: '10px', fontSize: '0.8rem', opacity: hasInvalidItems ? 0.5 : 1 }}
            >
              <Check size={14} /> Confirmar Desglose
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              style={{ padding: '10px', fontSize: '0.8rem' }}
            >
              Volver
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
