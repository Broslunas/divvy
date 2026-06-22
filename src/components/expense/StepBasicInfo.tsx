'use client';

import { useState, useRef } from 'react';
import { Camera, Sparkles, Tag, ChevronDown, Calendar, Hash, FileText, CreditCard, ImagePlus, X } from 'lucide-react';
import CategoryPicker from './CategoryPicker';
import QuickTemplates from './QuickTemplates';
import styles from './expense.module.css';

interface StepBasicInfoProps {
  title: string;
  setTitle: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  date: string;
  setDate: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  tagsInput: string;
  setTagsInput: (v: string) => void;
  paymentMethod: string;
  setPaymentMethod: (v: string) => void;
  currencySymbol: string;
  onOpenScan: () => void;
  onOpenAI: () => void;
  isBonoCultural?: boolean;
  receiptPreview: string | null;
  onReceiptFileSelect: (file: File | null) => void;
}

export default function StepBasicInfo({
  title,
  setTitle,
  amount,
  setAmount,
  date,
  setDate,
  category,
  setCategory,
  notes,
  setNotes,
  tagsInput,
  setTagsInput,
  paymentMethod,
  setPaymentMethod,
  currencySymbol,
  onOpenScan,
  onOpenAI,
  isBonoCultural,
  receiptPreview,
  onReceiptFileSelect,
}: StepBasicInfoProps) {
  const [showMore, setShowMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAmountChange = (value: string) => {
    // Allow only digits and a single decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      // More than one dot — keep only the first decimal
      setAmount(parts[0] + '.' + parts.slice(1).join(''));
    } else {
      setAmount(sanitized);
    }
  };

  const handleTemplateSelect = (tpl: { title: string; amount: number; category: string }) => {
    setTitle(tpl.title);
    setAmount(tpl.amount.toString());
    setCategory(tpl.category);
  };

  return (
    <div className={styles.stepContainer}>
      {/* AI Action Buttons */}
      <div className={styles.aiButtons}>
        <button type="button" className={styles.aiBtnScan} onClick={onOpenScan}>
          <Camera size={15} />
          Escanear Ticket
        </button>
        <button type="button" className={styles.aiBtnAI} onClick={onOpenAI}>
          <Sparkles size={15} />
          Entrada por IA
        </button>
        <button type="button" className={styles.aiBtnScan} onClick={() => fileInputRef.current?.click()}>
          <ImagePlus size={15} />
          {receiptPreview ? 'Cambiar foto' : 'Adjuntar foto'}
        </button>
      </div>

      {/* Hidden file input for receipt photo */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          onReceiptFileSelect(file);
          e.target.value = '';
        }}
      />

      {/* Receipt preview */}
      {receiptPreview && (
        <div className={styles.receiptPreviewWrap}>
          <img src={receiptPreview} alt="Preview recibo" className={styles.receiptPreviewImg} />
          <button
            type="button"
            className={styles.receiptPreviewRemove}
            onClick={() => onReceiptFileSelect(null)}
            title="Quitar foto"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Big Amount Input */}
      <div className={styles.amountContainer}>
        <div className={styles.amountInputWrap}>
          <span className={styles.amountCurrency}>{currencySymbol}</span>
          <input
            type="text"
            inputMode="decimal"
            className={styles.amountInput}
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0.00"
            autoComplete="off"
          />
        </div>
        <span className={styles.amountLabel}>Importe total</span>
      </div>

      {/* Title / Concepto */}
      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>
          <Tag size={14} />
          Concepto
        </label>
        <input
          type="text"
          className={styles.fieldInput}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={isBonoCultural ? "Ej. Entradas cine, Novela de misterio..." : "Ej. Cena, Gasolina..."}
          autoComplete="off"
        />
      </div>

      {/* Quick Templates */}
      {!isBonoCultural && <QuickTemplates currencySymbol={currencySymbol} onSelect={handleTemplateSelect} />}

      {/* Category Picker */}
      <CategoryPicker selected={category} onSelect={setCategory} isBonoCultural={isBonoCultural} />

      {/* Expandable "More Options" */}
      <button
        type="button"
        className={`${styles.expandToggle} ${showMore ? styles.open : ''}`}
        onClick={() => setShowMore((v) => !v)}
      >
        <ChevronDown size={14} />
        {showMore ? 'Menos opciones' : 'Más opciones'}
      </button>

      {showMore && (
        <div className={styles.expandContent}>
          {/* Date + Payment Method in a row */}
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <Calendar size={14} />
                Fecha
              </label>
              <input
                type="date"
                className={styles.fieldInput}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>
                <CreditCard size={14} />
                Método de pago
              </label>
              <select
                className={styles.fieldSelect}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="cash">Efectivo</option>
                <option value="card">Tarjeta</option>
                <option value="bizum">Bizum</option>
                <option value="paypal">PayPal</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          </div>

          {/* Tags Input */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              <Hash size={14} />
              Etiquetas
            </label>
            <input
              type="text"
              className={styles.fieldInput}
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="viaje, hotel, cena"
              autoComplete="off"
            />
          </div>

          {/* Notes Textarea */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              <FileText size={14} />
              Notas
            </label>
            <textarea
              className={styles.fieldTextarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas del gasto..."
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
}
