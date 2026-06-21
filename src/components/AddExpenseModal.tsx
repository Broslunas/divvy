'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Calendar, Tag, User, DollarSign, FileText, Hash, Check } from 'lucide-react';
import ReceiptScanner from './ReceiptScanner';
import AIInputParser from './AIInputParser';
import ItemizedSplitter from './ItemizedSplitter';
import type { User as UserType, SplitType, ExpenseSplit, Expense, ItemizedBillItem, MultiPayer } from '@/types';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Omit<UserType, 'passwordHash'>[];
  currentUserId: string;
  onAddExpense: (expenseData: Omit<Expense, 'id' | 'groupId' | 'createdAt'>) => Promise<void>;
}

const CATEGORIES = [
  { value: 'Comida', label: 'Comida / Restaurante' },
  { value: 'Transporte', label: 'Transporte / Viaje' },
  { value: 'Alojamiento', label: 'Alojamiento' },
  { value: 'Supermercado', label: 'Supermercado' },
  { value: 'Entretenimiento', label: 'Entretenimiento' },
  { value: 'Otros', label: 'Otros' },
];

const TEMPLATES = [
  { title: 'Café', amount: 2.50, category: 'Comida', label: 'Café' },
  { title: 'Taxi', amount: 15.00, category: 'Transporte', label: 'Taxi' },
  { title: 'Supermercado', amount: 24.50, category: 'Supermercado', label: 'Súper' },
  { title: 'Cena/Pizza', amount: 45.00, category: 'Comida', label: 'Cena/Pizza' },
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'bizum', label: 'Bizum' },
  { value: 'paypal', label: 'PayPal' },
];

interface ScannedExpenseData {
  title: string;
  amount: number;
  category: string;
  date: string;
  items?: ItemizedBillItem[];
}

interface parsedExpenseData {
  title: string;
  amount: number;
  category: string;
  paidById: string;
  date?: string;
  splits?: Array<{ userId: string; value?: number }>;
}

export default function AddExpenseModal({
  isOpen,
  onClose,
  members,
  currentUserId,
  onAddExpense
}: AddExpenseModalProps) {
  // Navigation / sub-widget modes
  const [activeMode, setActiveMode] = useState<'form' | 'scan' | 'ai' | 'itemized'>('form');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form Fields
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Comida');
  
  // Payer configuration
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  const [paidById, setPaidById] = useState(currentUserId);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({}); // mapped by userId

  // Split configuration
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitValues, setSplitValues] = useState<Record<string, string>>({}); // mapped by userId
  
  // Extra fields
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Itemized split items (passed from ItemizedSplitter)
  const [itemizedItems, setItemizedItems] = useState<ItemizedBillItem[]>([]);

  // Initialize split and payer values when modal opens or members list changes
  useEffect(() => {
    if (isOpen && members.length > 0) {
      const initialSplits: Record<string, string> = {};
      const initialPayers: Record<string, string> = {};
      
      members.forEach((m) => {
        // Splits
        if (splitType === 'equal') {
          initialSplits[m.id] = 'true';
        } else if (splitType === 'shares') {
          initialSplits[m.id] = '1';
        } else {
          initialSplits[m.id] = '0';
        }
        
        // Payers
        initialPayers[m.id] = m.id === currentUserId ? amount || '0' : '0';
      });
      
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSplitValues(initialSplits);
      setPayerAmounts(initialPayers);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, members, splitType, currentUserId]);

  // Sync primary payer amount if not in multi-payer mode
  useEffect(() => {
    if (!isMultiPayer) {
      const newPayers: Record<string, string> = {};
      members.forEach((m) => {
        newPayers[m.id] = m.id === paidById ? amount || '0' : '0';
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPayerAmounts(newPayers);
    }
  }, [amount, paidById, isMultiPayer, members]);

  if (!isOpen) return null;

  const handleTemplateClick = (tpl: typeof TEMPLATES[0]) => {
    setTitle(tpl.title);
    setAmount(tpl.amount.toString());
    setCategory(tpl.category);
  };

  const handleScanComplete = (scannedData: ScannedExpenseData) => {
    setTitle(scannedData.title);
    setAmount(scannedData.amount.toString());
    setCategory(scannedData.category);
    setDate(scannedData.date);
    
    // If ticket has itemized details, automatically activate itemized mode
    if (scannedData.items && scannedData.items.length > 0) {
      const allMemberIds = members.map(m => m.id);
      const itemsWithUsers = scannedData.items.map(item => ({
        ...item,
        userIds: item.userIds && item.userIds.length > 0 ? item.userIds : [...allMemberIds]
      }));
      setItemizedItems(itemsWithUsers);
      setActiveMode('itemized');
    } else {
      setActiveMode('form');
    }
  };

  const handleAIParseComplete = (parsedData: parsedExpenseData) => {
    setTitle(parsedData.title);
    setAmount(parsedData.amount.toString());
    setCategory(parsedData.category);
    setPaidById(parsedData.paidById);
    setDate(parsedData.date || new Date().toISOString().split('T')[0]);
    
    if (parsedData.splits) {
      const newSplits: Record<string, string> = {};
      members.forEach(m => {
        const hasSplit = parsedData.splits?.some((s) => s.userId === m.id);
        newSplits[m.id] = hasSplit ? 'true' : 'false';
      });
      setSplitValues(newSplits);
      setSplitType('equal');
    }
    setActiveMode('form');
  };

  const handleItemizedConfirm = (totalAmount: number, items: ItemizedBillItem[], debts: { userId: string; value: number }[]) => {
    setAmount(totalAmount.toFixed(2));
    setItemizedItems(items);
    
    // Convert to Exact split
    setSplitType('exact');
    const newSplits: Record<string, string> = {};
    debts.forEach(d => {
      newSplits[d.userId] = d.value.toString();
    });
    setSplitValues(newSplits);
    setActiveMode('form');
  };

  const toggleEqualParticipant = (userId: string) => {
    setSplitValues(prev => ({
      ...prev,
      [userId]: prev[userId] === 'true' ? 'false' : 'true'
    }));
  };

  const handleSplitValueChange = (userId: string, val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setSplitValues(prev => ({
        ...prev,
        [userId]: val
      }));
    }
  };

  const handlePayerAmountChange = (userId: string, val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setPayerAmounts(prev => ({
        ...prev,
        [userId]: val
      }));
    }
  };

  const validateForm = (): boolean => {
    setError('');
    const parsedAmount = parseFloat(amount);
    
    if (!title.trim()) {
      setError('Por favor, ingresa un concepto para el gasto.');
      return false;
    }
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Por favor, ingresa un importe total válido mayor que 0.');
      return false;
    }

    // Payer validation
    if (isMultiPayer) {
      let sumPayers = 0;
      members.forEach((m) => {
        sumPayers += parseFloat(payerAmounts[m.id] || '0');
      });
      if (Math.abs(sumPayers - parsedAmount) > 0.05) {
        setError(`La suma de los importes aportados por los pagadores (${sumPayers.toFixed(2)}€) debe coincidir con el total del gasto (${parsedAmount.toFixed(2)}€).`);
        return false;
      }
    }

    // Split validation
    if (splitType === 'equal') {
      const participantsCount = Object.values(splitValues).filter(v => v === 'true').length;
      if (participantsCount === 0) {
        setError('Debes seleccionar al menos un participante para dividir el gasto.');
        return false;
      }
    } 
    else if (splitType === 'exact') {
      let sumSplits = 0;
      members.forEach((m) => {
        sumSplits += parseFloat(splitValues[m.id] || '0');
      });
      if (Math.abs(sumSplits - parsedAmount) > 0.05) {
        setError(`La suma de los importes de reparto (${sumSplits.toFixed(2)}€) debe coincidir con el total del gasto (${parsedAmount.toFixed(2)}€).`);
        return false;
      }
    } 
    else if (splitType === 'percentage') {
      let sumSplits = 0;
      members.forEach((m) => {
        sumSplits += parseFloat(splitValues[m.id] || '0');
      });
      if (Math.abs(sumSplits - 100) > 0.1) {
        setError(`La suma de los porcentajes debe ser exactamente 100% (Suma actual: ${sumSplits.toFixed(1)}%).`);
        return false;
      }
    } 
    else if (splitType === 'shares') {
      let totalShares = 0;
      members.forEach((m) => {
        totalShares += parseFloat(splitValues[m.id] || '0');
      });
      if (totalShares <= 0) {
        setError('La suma de las partes/cuotas debe ser mayor que 0.');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const parsedAmount = parseFloat(amount);

    // Build splits payload
    const splitsPayload: ExpenseSplit[] = [];
    if (splitType === 'equal') {
      members.forEach((m) => {
        if (splitValues[m.id] === 'true') {
          splitsPayload.push({ userId: m.id, value: 0, isPaid: false });
        }
      });
    } else {
      members.forEach((m) => {
        const val = parseFloat(splitValues[m.id] || '0');
        splitsPayload.push({ userId: m.id, value: val, isPaid: false });
      });
    }

    // Build multiPayers payload
    let multiPayersPayload: MultiPayer[] | undefined = undefined;
    if (isMultiPayer) {
      multiPayersPayload = [];
      members.forEach((m) => {
        const val = parseFloat(payerAmounts[m.id] || '0');
        if (val > 0) {
          multiPayersPayload?.push({ userId: m.id, amount: val });
        }
      });
    }

    // Parse tags
    const tagsPayload = tagsInput
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(t => t.length > 0);

    try {
      await onAddExpense({
        title,
        amount: parsedAmount,
        date: new Date(date).toISOString(),
        category,
        paidById: isMultiPayer ? currentUserId : paidById, // Fallback paidById to current user if multiPayers is active
        multiPayers: multiPayersPayload,
        splitType,
        splits: splitsPayload,
        isSettlement: false,
        notes: notes.trim(),
        tags: tagsPayload,
        paymentMethod,
        items: itemizedItems.length > 0 ? itemizedItems : undefined
      });
      
      // Clean states
      setTitle('');
      setAmount('');
      setNotes('');
      setTagsInput('');
      setItemizedItems([]);
      setIsMultiPayer(false);
      setActiveMode('form');
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el gasto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(28, 28, 30, 0.4)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 100,
        backdropFilter: 'blur(3px)',
        animation: 'backdropFadeIn 0.3s ease forwards',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          backgroundColor: 'var(--bg-card)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          padding: '24px 20px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUpSheet 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeMode === 'scan' && 'Escanear ticket'}
            {activeMode === 'ai' && 'Entrada por IA'}
            {activeMode === 'itemized' && 'Desglose de artículos'}
            {activeMode === 'form' && 'Añadir gasto'}
          </h2>
          <button
            onClick={() => {
              if (activeMode !== 'form') {
                setActiveMode('form');
              } else {
                onClose();
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-secondary)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* AI & Scanner quick switch buttons */}
        {activeMode === 'form' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setActiveMode('scan')}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.8rem', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', backgroundColor: 'rgba(200, 122, 83, 0.03)', display: 'flex', justifyContent: 'center', gap: '6px' }}
            >
              <Sparkles size={14} /> Escanear Ticket (OCR)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('ai')}
              className="btn btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.8rem', borderColor: 'var(--accent-secondary)', color: 'var(--accent-secondary)', backgroundColor: 'rgba(74, 93, 78, 0.03)', display: 'flex', justifyContent: 'center', gap: '6px' }}
            >
              <Sparkles size={14} /> Entrada por IA (Texto)
            </button>
          </div>
        )}

        {/* Sub-Widget Modes */}
        {activeMode === 'scan' && (
          <ReceiptScanner onScanComplete={handleScanComplete} onClose={() => setActiveMode('form')} />
        )}

        {activeMode === 'ai' && (
          <AIInputParser members={members} currentUserId={currentUserId} onParseComplete={handleAIParseComplete} />
        )}

        {activeMode === 'itemized' && (
          <ItemizedSplitter
            members={members}
            currentUserId={currentUserId}
            initialItems={itemizedItems}
            onConfirm={handleItemizedConfirm}
            onCancel={() => setActiveMode('form')}
          />
        )}

        {/* Main Form Fields */}
        {activeMode === 'form' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '12px', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontWeight: 600, border: '1px solid rgba(176, 90, 90, 0.15)', alignItems: 'center' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Concept */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={14} style={{ color: 'var(--text-secondary)' }} /> Concepto / Título
              </label>
              <input
                type="text"
                placeholder="Ej. Cena, Gasolina..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.9rem', backgroundColor: 'var(--bg-primary)' }}
                required
              />
              
              {/* Quick templates */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                {TEMPLATES.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleTemplateClick(tpl)}
                    style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', color: 'var(--text-secondary)' }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={14} style={{ color: 'var(--text-secondary)' }} /> Importe total
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                      setAmount(e.target.value);
                    }
                  }}
                  style={{ padding: '11px 14px 11px 32px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.9rem', width: '100%', backgroundColor: 'var(--bg-primary)', fontWeight: 700 }}
                  required
                />
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  €
                </span>
              </div>
            </div>

            {/* Date & Category */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={14} style={{ color: 'var(--text-secondary)' }} /> Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.9rem', backgroundColor: 'var(--bg-primary)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Tag size={14} style={{ color: 'var(--text-secondary)' }} /> Categoría
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.9rem', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Payers Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} style={{ color: 'var(--text-secondary)' }} /> Pagado por
                </label>
                <button
                  type="button"
                  onClick={() => setIsMultiPayer(!isMultiPayer)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isMultiPayer ? 'Un solo pagador' : 'Múltiples pagadores'}
                </button>
              </div>

              {!isMultiPayer ? (
                <select
                  value={paidById}
                  onChange={(e) => setPaidById(e.target.value)}
                  style={{ padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.9rem', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.username} {m.id === currentUserId && '(Tú)'}
                    </option>
                  ))}
                </select>
              ) : (
                /* Multi-payers fields */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '12px', backgroundColor: 'var(--bg-secondary)', maxHeight: '140px', overflowY: 'auto' }}>
                  {members.map((m) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{m.username}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="text"
                          value={payerAmounts[m.id] || ''}
                          onChange={(e) => handlePayerAmountChange(m.id, e.target.value)}
                          placeholder="0"
                          style={{ width: '70px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', textAlign: 'right', fontSize: '0.8rem', backgroundColor: 'var(--bg-card)', outline: 'none' }}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>€</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Split Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Cómo dividir el gasto
                </span>
                <button
                  type="button"
                  onClick={() => setActiveMode('itemized')}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  Desglosar artículos
                </button>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', backgroundColor: 'var(--bg-secondary)', padding: '4px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-light)' }}>
                {(['equal', 'exact', 'percentage', 'shares'] as SplitType[]).map((type) => {
                  const labels: Record<string, string> = { equal: 'Igual', exact: 'Exacto', percentage: '%', shares: 'Partes' };
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setSplitType(type);
                        setItemizedItems([]); // Clear itemized if they switch back manually
                      }}
                      style={{ padding: '8px 4px', border: 'none', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', backgroundColor: splitType === type ? 'var(--bg-card)' : 'transparent', color: splitType === type ? 'var(--text-primary)' : 'var(--text-secondary)', boxShadow: splitType === type ? 'var(--shadow-tactile)' : 'none', transition: 'var(--transition-smooth)' }}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>

              {itemizedItems.length > 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} />
                  <span>Desglose por artículos cargado ({itemizedItems.length} artículos)</span>
                </div>
              )}

              {/* Dynamic split input fields */}
              <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '12px', maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-secondary)' }}>
                {members.map((member) => {
                  const val = splitValues[member.id] || '';
                  return (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {splitType === 'equal' ? (
                          <input
                            type="checkbox"
                            checked={val === 'true'}
                            onChange={() => toggleEqualParticipant(member.id)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                          />
                        ) : (
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: member.avatarColor }} />
                        )}
                        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                          {member.username} {member.id === currentUserId && '(Tú)'}
                        </span>
                      </div>

                      {splitType !== 'equal' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="text"
                            value={val}
                            onChange={(e) => handleSplitValueChange(member.id, e.target.value)}
                            placeholder="0"
                            style={{ width: '70px', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', textAlign: 'right', fontSize: '0.8rem', outline: 'none', backgroundColor: 'var(--bg-card)' }}
                          />
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', width: '20px' }}>
                            {splitType === 'exact' && '€'}
                            {splitType === 'percentage' && '%'}
                            {splitType === 'shares' && 'part.'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Method & Tags */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <DollarSign size={14} style={{ color: 'var(--text-secondary)' }} /> Método de Pago
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.9rem', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hash size={14} style={{ color: 'var(--text-secondary)' }} /> Etiquetas (Tags)
                </label>
                <input
                  type="text"
                  placeholder="viaje, hotel, cena"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  style={{ padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.9rem', backgroundColor: 'var(--bg-primary)' }}
                />
              </div>
            </div>

            {/* Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} style={{ color: 'var(--text-secondary)' }} /> Notas internas
              </label>
              <textarea
                rows={2}
                placeholder="Añade detalles adicionales o notas privadas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.9rem', backgroundColor: 'var(--bg-primary)', resize: 'none', fontFamily: 'inherit' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ flex: 1, padding: '12px' }}
              >
                {loading ? 'Guardando...' : 'Guardar Gasto'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                style={{ padding: '12px' }}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>

      <style>{`
        @keyframes backdropFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
      `}</style>
    </div>
  );
}
