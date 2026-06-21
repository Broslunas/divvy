'use client';

import { useState } from 'react';
import { Target, AlertTriangle, Check, Edit2, ShieldAlert } from 'lucide-react';

interface BudgetProgressProps {
  totalSpent: number;
  currentBudget: number; // 0 means no limit set
  currency: string;
  onSaveBudget: (budget: number) => Promise<void>;
}

export default function BudgetProgress({
  totalSpent,
  currentBudget,
  currency,
  onSaveBudget
}: BudgetProgressProps) {
  const [budgetInput, setBudgetInput] = useState(currentBudget > 0 ? currentBudget.toString() : '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const parsed = parseFloat(budgetInput);
    const budgetVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    
    setSaving(true);
    try {
      await onSaveBudget(budgetVal);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const hasBudget = currentBudget > 0;
  const percentUsed = hasBudget ? (totalSpent / currentBudget) * 100 : 0;
  const isOverBudget = hasBudget && totalSpent > currentBudget;
  const isNearLimit = hasBudget && percentUsed >= 80 && percentUsed <= 100;
  
  // Progress bar color based on percentage
  let progressColor = 'var(--accent-primary)'; // Terracotta default
  if (isOverBudget) {
    progressColor = 'var(--danger)'; // Crimson over budget
  } else if (isNearLimit) {
    progressColor = '#D48C45'; // Ochre warning
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        boxShadow: 'var(--shadow-subtle)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
          <Target size={18} style={{ color: 'var(--accent-primary)' }} />
          <span>Límite de Presupuesto</span>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--accent-primary)',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Edit2 size={12} /> {hasBudget ? 'Editar Límite' : 'Establecer Límite'}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--success)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Check size={12} /> Guardar
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="Ej. 500"
              value={budgetInput}
              onChange={(e) => {
                if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                  setBudgetInput(e.target.value);
                }
              }}
              style={{
                width: '100%',
                padding: '8px 8px 8px 24px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-light)',
                fontSize: '0.8rem',
                outline: 'none',
                backgroundColor: 'var(--bg-primary)',
                fontWeight: 700
              }}
            />
            <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
              {currency}
            </span>
          </div>
          <button
            onClick={() => {
              setIsEditing(false);
              setBudgetInput(currentBudget > 0 ? currentBudget.toString() : '');
            }}
            className="btn btn-secondary"
            style={{ padding: '8px 12px', fontSize: '0.75rem' }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {hasBudget ? (
            <>
              {/* Progress text */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Consumido:</span>
                <div>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{totalSpent.toFixed(2)}{currency}</span>
                  <span style={{ color: 'var(--text-muted)' }}> / {currentBudget.toFixed(0)}{currency}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(percentUsed, 100)}%`,
                    height: '100%',
                    backgroundColor: progressColor,
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                <span>{percentUsed.toFixed(0)}% Utilizado</span>
                <span>Restan: {Math.max(currentBudget - totalSpent, 0).toFixed(2)}{currency}</span>
              </div>

              {/* Warning box */}
              {isOverBudget && (
                <div style={{ display: 'flex', gap: '8px', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(176, 90, 90, 0.15)', fontSize: '0.75rem', fontWeight: 600, marginTop: '4px', alignItems: 'center' }}>
                  <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                  <span>¡Alerta! Presupuesto superado por {(totalSpent - currentBudget).toFixed(2)}{currency}.</span>
                </div>
              )}

              {isNearLimit && (
                <div style={{ display: 'flex', gap: '8px', backgroundColor: '#FDF5E6', color: '#D48C45', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(212, 140, 69, 0.15)', fontSize: '0.75rem', fontWeight: 600, marginTop: '4px', alignItems: 'center' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                  <span>Advertencia: Has consumido más del 80% del presupuesto.</span>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontStyle: 'italic', padding: '4px 0' }}>
              No se ha establecido un límite de presupuesto. Pulsa en establecer límite para tener un control visual de gastos.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
