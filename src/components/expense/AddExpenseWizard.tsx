'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, Check, AlertCircle, Loader2 } from 'lucide-react';
import ReceiptScanner from '../ReceiptScanner';
import AIInputParser from '../AIInputParser';
import ItemizedSplitter from '../ItemizedSplitter';
import StepBasicInfo from './StepBasicInfo';
import StepSplitConfig from './StepSplitConfig';
import StepReview from './StepReview';
import { getCurrencySymbol } from '@/lib/utils';
import type { User as UserType, SplitType, ExpenseSplit, Expense, ItemizedBillItem, MultiPayer } from '@/types';
import styles from './expense.module.css';

interface AddExpenseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  members: Omit<UserType, 'passwordHash'>[];
  currentUserId: string;
  currency?: string;
  onAddExpense: (expenseData: Omit<Expense, 'id' | 'groupId' | 'createdAt'>) => Promise<string | undefined>;
  isBonoCultural?: boolean;
}

interface ScannedExpenseData {
  title: string;
  amount: number;
  category: string;
  date: string;
  items?: ItemizedBillItem[];
}

interface ParsedExpenseData {
  title: string;
  amount: number;
  category: string;
  paidById: string;
  date?: string;
  splits?: Array<{ userId: string; value?: number }>;
}

const STEP_TITLES = ['Datos del gasto', 'Dividir gasto', 'Resumen'];

export default function AddExpenseWizard({
  isOpen,
  onClose,
  members,
  currentUserId,
  currency,
  onAddExpense,
  isBonoCultural,
}: AddExpenseWizardProps) {
  // --- Wizard navigation ---
  const [currentStep, setCurrentStep] = useState(1);
  const [activeMode, setActiveMode] = useState<'wizard' | 'scan' | 'ai' | 'itemized'>('wizard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // --- Form Fields (Step 1) ---
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(isBonoCultural ? 'Artes en vivo, patrimonio y audiovisual' : 'Comida');
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // --- Payer (Step 2) ---
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  const [paidById, setPaidById] = useState(currentUserId);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>({});

  // --- Split (Step 2) ---
  const [splitType, setSplitType] = useState<SplitType>('equal');
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});

  // --- Receipt ---
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // --- Itemized ---
  const [itemizedItems, setItemizedItems] = useState<ItemizedBillItem[]>([]);

  const currencySymbol = getCurrencySymbol(currency);

  // --- Initialize split/payer values ---
  const initializeValues = useCallback(() => {
    const initialSplits: Record<string, string> = {};
    const initialPayers: Record<string, string> = {};

    members.forEach((m) => {
      if (splitType === 'equal') {
        initialSplits[m.id] = 'true';
      } else if (splitType === 'shares') {
        initialSplits[m.id] = '1';
      } else {
        initialSplits[m.id] = '0';
      }
      initialPayers[m.id] = m.id === currentUserId ? amount || '0' : '0';
    });

    setSplitValues(initialSplits);
    setPayerAmounts(initialPayers);
  }, [members, splitType, currentUserId, amount]);

  useEffect(() => {
    if (isOpen && members.length > 0) {
      initializeValues();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, members, splitType]);

  useEffect(() => {
    if (isOpen) {
      setCategory(isBonoCultural ? 'Artes en vivo, patrimonio y audiovisual' : 'Comida');
    }
  }, [isOpen, isBonoCultural]);

  // Sync primary payer amount
  useEffect(() => {
    if (!isMultiPayer && members.length > 0) {
      const newPayers: Record<string, string> = {};
      members.forEach((m) => {
        newPayers[m.id] = m.id === paidById ? amount || '0' : '0';
      });
      setPayerAmounts(newPayers);
    }
  }, [amount, paidById, isMultiPayer, members]);

  // --- Receipt file handler ---
  const handleReceiptFileSelect = (file: File | null) => {
    setReceiptFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setReceiptPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setReceiptPreview(null);
    }
  };

  // --- Full reset ---
  const resetForm = useCallback(() => {
    setCurrentStep(1);
    setActiveMode('wizard');
    setLoading(false);
    setError('');
    setSuccess(false);
    setTitle('');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setCategory(isBonoCultural ? 'Artes en vivo, patrimonio y audiovisual' : 'Comida');
    setNotes('');
    setTagsInput('');
    setPaymentMethod('cash');
    setIsMultiPayer(false);
    setPaidById(currentUserId);
    setSplitType('equal');
    setItemizedItems([]);
    setReceiptFile(null);
    setReceiptPreview(null);
  }, [currentUserId, isBonoCultural]);

  // --- Close handler ---
  const handleClose = useCallback(() => {
    if (activeMode !== 'wizard') {
      setActiveMode('wizard');
      return;
    }
    resetForm();
    onClose();
  }, [activeMode, resetForm, onClose]);

  if (!isOpen) return null;

  // --- Navigation ---
  const goNext = () => {
    setError('');
    if (currentStep === 1) {
      // Validate step 1
      if (!title.trim()) {
        setError('Escribe un concepto para el gasto.');
        return;
      }
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setError('Introduce un importe válido mayor que 0.');
        return;
      }
    }
    if (currentStep === 2) {
      // Validate step 2
      const parsedAmount = parseFloat(amount);

      if (isMultiPayer) {
        let sumPayers = 0;
        members.forEach((m) => {
          sumPayers += parseFloat(payerAmounts[m.id] || '0');
        });
        if (Math.abs(sumPayers - parsedAmount) > 0.05) {
          setError(`La suma de los pagadores (${sumPayers.toFixed(2)}${currencySymbol}) no coincide con el total (${parsedAmount.toFixed(2)}${currencySymbol}).`);
          return;
        }
      }

      if (splitType === 'equal') {
        const count = Object.values(splitValues).filter(v => v === 'true').length;
        if (count === 0) {
          setError('Selecciona al menos un participante.');
          return;
        }
      } else if (splitType === 'itemized') {
        if (itemizedItems.length === 0) {
          setError('Añade al menos un artículo al desglose.');
          return;
        }
      } else if (splitType === 'exact') {
        let sum = 0;
        members.forEach((m) => { sum += parseFloat(splitValues[m.id] || '0'); });
        if (Math.abs(sum - parsedAmount) > 0.05) {
          setError(`Los importes de reparto (${sum.toFixed(2)}${currencySymbol}) no coinciden con el total (${parsedAmount.toFixed(2)}${currencySymbol}).`);
          return;
        }
      } else if (splitType === 'percentage') {
        let sum = 0;
        members.forEach((m) => { sum += parseFloat(splitValues[m.id] || '0'); });
        if (Math.abs(sum - 100) > 0.1) {
          setError(`Los porcentajes deben sumar 100% (suma actual: ${sum.toFixed(1)}%).`);
          return;
        }
      } else if (splitType === 'shares') {
        let total = 0;
        members.forEach((m) => { total += parseFloat(splitValues[m.id] || '0'); });
        if (total <= 0) {
          setError('El total de partes debe ser mayor que 0.');
          return;
        }
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const goBack = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // --- Handlers from sub-widgets ---
  const handleScanComplete = (scannedData: ScannedExpenseData) => {
    setTitle(scannedData.title);
    setAmount(scannedData.amount.toString());
    setCategory(scannedData.category);
    setDate(scannedData.date);

    if (scannedData.items && scannedData.items.length > 0) {
      const allMemberIds = members.map(m => m.id);
      const itemsWithUsers = scannedData.items.map(item => ({
        ...item,
        userIds: item.userIds && item.userIds.length > 0 ? item.userIds : [...allMemberIds],
      }));
      setItemizedItems(itemsWithUsers);
      setActiveMode('itemized');
    } else {
      setActiveMode('wizard');
    }
  };

  const handleAIParseComplete = (parsedData: ParsedExpenseData) => {
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
    setActiveMode('wizard');
    // Jump to review step since AI filled everything
    setCurrentStep(3);
  };

  const handleItemizedConfirm = (totalAmount: number, items: ItemizedBillItem[], debts: { userId: string; value: number }[]) => {
    setAmount(totalAmount.toFixed(2));
    setItemizedItems(items);
    setSplitType('itemized');
    const newSplits: Record<string, string> = {};
    debts.forEach(d => {
      newSplits[d.userId] = d.value.toString();
    });
    setSplitValues(newSplits);
    setActiveMode('wizard');
  };

  // --- Split helpers ---
  const toggleEqualParticipant = (userId: string) => {
    setSplitValues(prev => ({
      ...prev,
      [userId]: prev[userId] === 'true' ? 'false' : 'true',
    }));
  };

  const handleSplitValueChange = (userId: string, val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setSplitValues(prev => ({ ...prev, [userId]: val }));
    }
  };

  const handlePayerAmountChange = (userId: string, val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setPayerAmounts(prev => ({ ...prev, [userId]: val }));
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const parsedAmount = parseFloat(amount);

    // Build splits
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

    // Build multiPayers
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
      const expenseId = await onAddExpense({
        title,
        amount: parsedAmount,
        date: new Date(date).toISOString(),
        category,
        paidById: isMultiPayer ? currentUserId : paidById,
        multiPayers: multiPayersPayload,
        splitType,
        splits: splitsPayload,
        isSettlement: false,
        notes: notes.trim(),
        tags: tagsPayload,
        paymentMethod,
        items: itemizedItems.length > 0 ? itemizedItems : undefined,
      });

      // Upload receipt photo if one was selected
      if (receiptFile && expenseId) {
        try {
          const receiptFormData = new FormData();
          receiptFormData.append('receipt', receiptFile);
          await fetch(`/api/expenses/${expenseId}/receipt`, {
            method: 'POST',
            body: receiptFormData,
          });
        } catch (err) {
          console.error('Error uploading receipt:', err);
        }
      }

      setSuccess(true);
      setTimeout(() => {
        resetForm();
        onClose();
      }, 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar el gasto.');
    } finally {
      setLoading(false);
    }
  };

  // --- Derive header title ---
  const getHeaderTitle = () => {
    if (activeMode === 'scan') return 'Escanear ticket';
    if (activeMode === 'ai') return 'Entrada por IA';
    if (activeMode === 'itemized') return 'Desglose de artículos';
    return STEP_TITLES[currentStep - 1];
  };

  return (
    <div className={styles.overlay} onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={styles.wizard}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>{getHeaderTitle()}</h2>
          <button className={styles.closeBtn} onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        {/* Progress Stepper — only in wizard mode */}
        {activeMode === 'wizard' && (
          <div className={styles.stepper}>
            {[1, 2, 3].map((step, i) => (
              <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  className={`${styles.stepDot} ${currentStep === step ? styles.active : ''} ${currentStep > step ? styles.completed : ''}`}
                />
                {i < 2 && (
                  <div className={`${styles.stepLine} ${currentStep > step ? styles.completed : ''}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className={styles.stepContent}>
          {/* Success overlay */}
          {success && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '16px' }}>
              <div className={styles.successIcon} style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={32} style={{ color: 'var(--success)' }} />
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>Gasto guardado</span>
            </div>
          )}

          {/* Sub-widget modes */}
          {!success && activeMode === 'scan' && (
            <ReceiptScanner onScanComplete={handleScanComplete} onClose={() => setActiveMode('wizard')} isBonoCultural={isBonoCultural} />
          )}

          {!success && activeMode === 'ai' && (
            <AIInputParser members={members} currentUserId={currentUserId} onParseComplete={handleAIParseComplete} isBonoCultural={isBonoCultural} />
          )}

          {!success && activeMode === 'itemized' && (
            <ItemizedSplitter
              members={members}
              currentUserId={currentUserId}
              initialItems={itemizedItems}
              currency={currency}
              onConfirm={handleItemizedConfirm}
              onCancel={() => setActiveMode('wizard')}
            />
          )}

          {/* Wizard Steps */}
          {!success && activeMode === 'wizard' && (
            <>
              {error && (
                <div className={styles.errorBanner}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {currentStep === 1 && (
                <StepBasicInfo
                  title={title}
                  setTitle={setTitle}
                  amount={amount}
                  setAmount={setAmount}
                  date={date}
                  setDate={setDate}
                  category={category}
                  setCategory={setCategory}
                  notes={notes}
                  setNotes={setNotes}
                  tagsInput={tagsInput}
                  setTagsInput={setTagsInput}
                  paymentMethod={paymentMethod}
                  setPaymentMethod={setPaymentMethod}
                  currencySymbol={currencySymbol}
                  onOpenScan={() => setActiveMode('scan')}
                  onOpenAI={() => setActiveMode('ai')}
                  isBonoCultural={isBonoCultural}
                  receiptPreview={receiptPreview}
                  onReceiptFileSelect={handleReceiptFileSelect}
                />
              )}

              {currentStep === 2 && (
                <StepSplitConfig
                  members={members}
                  currentUserId={currentUserId}
                  amount={amount}
                  currency={currency}
                  paidById={paidById}
                  setPaidById={setPaidById}
                  isMultiPayer={isMultiPayer}
                  setIsMultiPayer={setIsMultiPayer}
                  payerAmounts={payerAmounts}
                  onPayerAmountChange={handlePayerAmountChange}
                  splitType={splitType}
                  setSplitType={(type) => {
                    setSplitType(type);
                    setItemizedItems([]);
                  }}
                  splitValues={splitValues}
                  onToggleParticipant={toggleEqualParticipant}
                  onSplitValueChange={handleSplitValueChange}
                  itemizedItems={itemizedItems}
                  onOpenItemized={() => setActiveMode('itemized')}
                />
              )}

              {currentStep === 3 && (
                <StepReview
                  title={title}
                  amount={amount}
                  date={date}
                  category={category}
                  notes={notes}
                  tags={tagsInput}
                  paymentMethod={paymentMethod}
                  currency={currency}
                  paidById={paidById}
                  isMultiPayer={isMultiPayer}
                  payerAmounts={payerAmounts}
                  splitType={splitType}
                  splitValues={splitValues}
                  members={members}
                  currentUserId={currentUserId}
                  itemizedItems={itemizedItems}
                  receiptPreview={receiptPreview}
                />
              )}
            </>
          )}
        </div>

        {/* Footer Navigation — only in wizard mode */}
        {!success && activeMode === 'wizard' && (
          <div className={styles.footer}>
            {currentStep > 1 && (
              <button className={styles.footerBtnSecondary} onClick={goBack}>
                <ArrowLeft size={16} />
                Atrás
              </button>
            )}
            {currentStep < 3 ? (
              <button className={styles.footerBtnPrimary} onClick={goNext} style={{ flex: 1 }}>
                Siguiente
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className={styles.footerBtnPrimary}
                onClick={handleSubmit}
                disabled={loading}
                style={{ flex: 1 }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Confirmar gasto
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
