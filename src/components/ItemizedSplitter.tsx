'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, AlertCircle } from 'lucide-react';
import type { User, ItemizedBillItem } from '@/types';

interface ItemizedSplitterProps {
  members: Omit<User, 'passwordHash'>[];
  currentUserId: string;
  initialItems?: ItemizedBillItem[];
  onConfirm: (totalAmount: number, items: ItemizedBillItem[], splits: { userId: string; value: number }[]) => void;
  onCancel: () => void;
}

export default function ItemizedSplitter({
  members,
  currentUserId,
  initialItems = [],
  onConfirm,
  onCancel
}: ItemizedSplitterProps) {
  const [items, setItems] = useState<ItemizedBillItem[]>(initialItems);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const handleToggleUserForItem = (itemIdx: number, userId: string) => {
    setItems(prev =>
      prev.map((item, idx) => {
        if (idx !== itemIdx) return item;
        const exists = item.userIds.includes(userId);
        const newUserIds = exists
          ? item.userIds.filter(id => id !== userId)
          : [...item.userIds, userId];
        return {
          ...item,
          userIds: newUserIds
        };
      })
    );
  };
  
  // Form fields for a single item
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

    const newItem: ItemizedBillItem = {
      name: itemName.trim(),
      amount: parsedAmount,
      userIds: [...selectedUserIds]
    };

    setItems(prev => [...prev, newItem]);
    setItemName('');
    setItemAmount('');
    // Keep the current users selected for quick add or default back to current user
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Calculate totals
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  const calculateMemberDebts = (): { userId: string; value: number }[] => {
    const debts: Record<string, number> = {};
    members.forEach(m => { debts[m.id] = 0; });

    items.forEach(item => {
      if (item.userIds.length === 0) return;
      const share = item.amount / item.userIds.length;
      item.userIds.forEach(userId => {
        if (debts[userId] !== undefined) {
          debts[userId] += share;
        }
      });
    });

    return Object.entries(debts).map(([userId, value]) => ({
      userId,
      value: Math.round(value * 100) / 100
    }));
  };

  const handleConfirmClick = () => {
    if (items.length === 0) return;
    const memberDebts = calculateMemberDebts();
    onConfirm(totalAmount, items, memberDebts);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Desglose por Artículos</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Añade cada artículo y selecciona quién lo consumió.</p>
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
              €
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
        {items.map((item, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8rem'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, marginRight: '8px' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</span>
              
              {/* Inline Participant Toggles */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Para:</span>
                {members.map(member => {
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
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontWeight: 700 }}>{item.amount.toFixed(2)}€</span>
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
        ))}

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
            <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-primary)' }}>{totalAmount.toFixed(2)}€</span>
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
                  <span style={{ fontWeight: 700 }}>{debt.value.toFixed(2)}€</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={handleConfirmClick}
              className="btn btn-primary"
              style={{ flex: 1, padding: '10px', fontSize: '0.8rem' }}
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
