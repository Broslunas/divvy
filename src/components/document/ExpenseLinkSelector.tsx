import { useState } from 'react';
import { Search, X, DollarSign, Calendar } from 'lucide-react';
import type { Expense, User } from '@/types';

interface ExpenseLinkSelectorProps {
  expenses: Expense[];
  members: Omit<User, 'passwordHash'>[];
  onSelect: (expense: Expense, paidByName: string) => void;
  onClose: () => void;
}

export default function ExpenseLinkSelector({
  expenses,
  members,
  onSelect,
  onClose
}: ExpenseLinkSelectorProps) {
  const [search, setSearch] = useState('');

  // Get member name helper
  const getMemberName = (id: string) => {
    const member = members.find((m) => m.id === id);
    return member ? member.username : 'Usuario';
  };

  // Filter out settlement expenses
  const nonSettlementExpenses = expenses.filter((e) => !e.isSettlement);

  // Filter by search query
  const filteredExpenses = nonSettlementExpenses.filter((e) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="doc-modal-overlay">
      <div className="doc-modal-card" style={{ maxWidth: '420px', maxHeight: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="doc-modal-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={18} style={{ color: 'var(--accent-primary)' }} />
            Vincular Gasto del Grupo
          </span>
          <button onClick={onClose} className="doc-modal-close">
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          Selecciona un gasto para embeberlo como un bloque visual interactivo en el documento.
        </p>

        {/* Search Bar */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }}
          />
          <input
            type="text"
            placeholder="Buscar por título o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 30px',
              fontSize: '0.75rem',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-light)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        </div>

        {/* Expenses List */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            flexGrow: 1,
            paddingRight: '4px',
            minHeight: '200px'
          }}
        >
          {filteredExpenses.length === 0 ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexGrow: 1,
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                fontStyle: 'italic',
                textAlign: 'center',
                padding: '20px 0'
              }}
            >
              No se encontraron gastos disponibles.
            </div>
          ) : (
            filteredExpenses.map((expense) => {
              const paidByName = getMemberName(expense.paidById);
              return (
                <div
                  key={expense.id}
                  onClick={() => {
                    onSelect(expense, paidByName);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'var(--transition-smooth)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {expense.title}
                    </span>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>
                      Pagado por <strong>{paidByName}</strong> • {expense.category}
                    </span>
                    {expense.date && (
                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Calendar size={10} />
                        {new Date(expense.date).toLocaleDateString('es-ES', { dateStyle: 'short' })}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {expense.amount.toFixed(2)}€
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
