'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';
import { calculateBalances, SettlementTransaction } from '@/lib/settlement';
import type { Expense, User } from '@/types';

interface DebtSettlementProps {
  members: Omit<User, 'passwordHash'>[];
  expenses: Expense[];
  currentUserId: string;
  onSettleDebt: (from: string, to: string, amount: number) => Promise<void>;
}

export default function DebtSettlement({
  members,
  expenses,
  currentUserId,
  onSettleDebt
}: DebtSettlementProps) {
  const memberIds = members.map(m => m.id);
  const { balances, transactions } = calculateBalances(memberIds, expenses);
  const [settlingId, setSettlingId] = useState<string | null>(null);

  const getMember = (id: string) => members.find(m => m.id === id);

  const handleSettleClick = async (tx: SettlementTransaction, idx: number) => {
    setSettlingId(`${tx.from}-${tx.to}-${idx}`);
    try {
      await onSettleDebt(tx.from, tx.to, tx.amount);
    } catch (e) {
      console.error(e);
    } finally {
      setSettlingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Balances Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Balances de miembros
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {members.map(member => {
            const net = balances[member.id] || 0;
            const isPositive = net > 0;
            const isNegative = net < 0;
            
            return (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-light)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: member.avatarColor,
                      color: '#FFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      textTransform: 'uppercase'
                    }}
                  >
                    {member.username.charAt(0)}
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {member.username} {member.id === currentUserId && '(Tú)'}
                  </span>
                </div>

                <span
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--text-secondary)'
                  }}
                >
                  {isPositive ? `+${net.toFixed(2)}€` : isNegative ? `${net.toFixed(2)}€` : 'Saldado'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlements/Transactions Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Plan de Liquidación Optimizado
        </h3>

        {transactions.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px 20px',
              backgroundColor: 'var(--success-light)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(45, 106, 79, 0.12)',
              color: 'var(--success)',
              textAlign: 'center',
              gap: '8px'
            }}
          >
            <CheckCircle2 size={28} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>¡Cuentas al día!</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>Todos los gastos del grupo están completamente saldados.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {transactions.map((tx, idx) => {
              const fromUser = getMember(tx.from);
              const toUser = getMember(tx.to);
              
              if (!fromUser || !toUser) return null;
              
              const isParticipant = tx.from === currentUserId || tx.to === currentUserId;
              const isSettling = settlingId === `${tx.from}-${tx.to}-${idx}`;

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    boxShadow: 'var(--shadow-subtle)',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{fromUser.username}</span>
                      </div>
                      
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{toUser.username}</span>
                      </div>
                    </div>

                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                      {tx.amount.toFixed(2)}€
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {isParticipant && <UserCheck size={14} style={{ color: 'var(--success)' }} />}
                      {isParticipant ? 'Te afecta a ti' : 'Saldar entre ellos'}
                    </span>

                    <button
                      onClick={() => handleSettleClick(tx, idx)}
                      className="btn"
                      disabled={isSettling}
                      style={{
                        padding: '6px 14px',
                        fontSize: '0.75rem',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--accent-secondary)',
                        color: '#FFF',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      {isSettling ? 'Registrando...' : 'Registrar Pago'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
