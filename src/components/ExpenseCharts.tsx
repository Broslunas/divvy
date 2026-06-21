'use client';

import { TrendingUp, Award } from 'lucide-react';
import type { Expense, User } from '@/types';

interface ExpenseChartsProps {
  members: Omit<User, 'passwordHash'>[];
  expenses: Expense[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Comida: '#C87A53', // Terracotta
  Transporte: '#4A5D4E', // Olive/Sage
  Alojamiento: '#5C768D', // Muted Blue
  Supermercado: '#BCA374', // Gold/Brass
  Entretenimiento: '#8A7B9F', // Lavender/Plum
  Otros: '#8E8D8A', // Warm Gray
};

export default function ExpenseCharts({ members, expenses }: ExpenseChartsProps) {
  const standardExpenses = expenses.filter(e => !e.isSettlement);
  const totalSpent = standardExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 1. Calculate category spending totals
  const categoryTotals: Record<string, number> = {};
  standardExpenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
  });

  // Sort categories by amount spent
  const sortedCategories = Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category,
      amount,
      color: CATEGORY_COLORS[category] || '#8E8D8A',
      percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // Generate Conic Gradient CSS for the Donut Chart
  const gradientParts: string[] = [];
  let currentPercentage = 0;
  sortedCategories.forEach(cat => {
    const start = currentPercentage;
    const end = currentPercentage + cat.percentage;
    gradientParts.push(`${cat.color} ${start.toFixed(1)}% ${end.toFixed(1)}%`);
    currentPercentage = end;
  });
  const conicGradientCss = gradientParts.length > 0 
    ? `conic-gradient(${gradientParts.join(', ')})` 
    : 'var(--bg-secondary)';

  // 2. Metrics: Top Spender (who paid the most)
  const memberPaidTotals: Record<string, number> = {};
  members.forEach(m => { memberPaidTotals[m.id] = 0; });
  standardExpenses.forEach(e => {
    // If multiPayers exist, sum them. Otherwise sum paidById
    if (e.multiPayers && e.multiPayers.length > 0) {
      e.multiPayers.forEach(p => {
        if (memberPaidTotals[p.userId] !== undefined) {
          memberPaidTotals[p.userId] += p.amount;
        }
      });
    } else {
      if (memberPaidTotals[e.paidById] !== undefined) {
        memberPaidTotals[e.paidById] += e.amount;
      }
    }
  });

  let topSpenderId = '';
  let topSpenderAmount = -1;
  Object.entries(memberPaidTotals).forEach(([id, amount]) => {
    if (amount > topSpenderAmount) {
      topSpenderAmount = amount;
      topSpenderId = id;
    }
  });
  const topSpender = members.find(m => m.id === topSpenderId);

  // 3. Metrics: Average Expense size
  const averageExpense = standardExpenses.length > 0 ? totalSpent / standardExpenses.length : 0;

  // 4. Metrics: Most Expensive Category

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 2x2 Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', gap: '10px', alignItems: 'center', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ backgroundColor: 'rgba(200, 122, 83, 0.08)', color: 'var(--accent-primary)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
            <Award size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Máximo Pagador</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{topSpender ? topSpender.username : 'Ninguno'}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700 }}>{topSpenderAmount > 0 ? `${topSpenderAmount.toFixed(1)}€` : '0€'}</span>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '14px', display: 'flex', gap: '10px', alignItems: 'center', boxShadow: 'var(--shadow-subtle)' }}>
          <div style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
            <TrendingUp size={18} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Gasto Medio</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{averageExpense.toFixed(2)}€</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>por gasto</span>
          </div>
        </div>
      </div>

      {/* Donut Chart & Category breakdown */}
      {totalSpent > 0 ? (
        <div style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-subtle)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px'
        }}>
          {/* Pure CSS Donut Chart */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: conicGradientCss,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
              position: 'relative'
            }}
          >
            {/* Center Hole for Donut effect */}
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-card)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            >
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>{totalSpent.toFixed(0)}€</span>
            </div>
          </div>

          {/* Categories breakdown list */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sortedCategories.map(cat => (
              <div key={cat.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: cat.color }} />
                    <span style={{ fontWeight: 600 }}>{cat.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', fontWeight: 700 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{cat.percentage.toFixed(0)}%</span>
                    <span>{cat.amount.toFixed(2)}€</span>
                  </div>
                </div>
                {/* Visual horizontal bar */}
                <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-secondary)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${cat.percentage}%`, height: '100%', backgroundColor: cat.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: '0.8rem', border: '1px dashed var(--border-light)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-card)' }}>
          No hay estadísticas disponibles. Añade gastos al grupo para visualizar gráficos.
        </div>
      )}
    </div>
  );
}
