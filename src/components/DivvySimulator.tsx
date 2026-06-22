'use client';

import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Users, Plus, Check, ArrowRight, Coins, RefreshCw } from 'lucide-react';

interface Expense {
  id: string;
  name: string;
  amount: number;
  paidBy: 'Ana' | 'Pablo' | 'Dani';
  emoji: string;
  checked: boolean;
}

const INITIAL_EXPENSES: Expense[] = [
  { id: '1', name: 'Cena de bienvenida', amount: 90, paidBy: 'Ana', emoji: '🍕', checked: true },
  { id: '2', name: 'Gasolina y peajes', amount: 30, paidBy: 'Pablo', emoji: '🚗', checked: true },
  { id: '3', name: 'Alojamiento rural', amount: 150, paidBy: 'Dani', emoji: '🏡', checked: true },
];

export default function DivvySimulator() {
  const [expenses, setExpenses] = useState<Expense[]>(INITIAL_EXPENSES);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationDone, setSimulationDone] = useState(false);
  
  // Simulation results
  const [total, setTotal] = useState(270);
  const [share, setShare] = useState(90);
  const [balances, setBalances] = useState({ Ana: 0, Pablo: -60, Dani: 60 });
  const [debts, setDebts] = useState<{ from: string; to: string; amount: number }[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const coinsContainerRef = useRef<HTMLDivElement>(null);

  // Recalculate anytime expenses check state changes
  useEffect(() => {
    const paid = { Ana: 0, Pablo: 0, Dani: 0 };
    expenses.forEach((exp) => {
      if (exp.checked) {
        paid[exp.paidBy] += exp.amount;
      }
    });

    const calculatedTotal = paid.Ana + paid.Pablo + paid.Dani;
    const calculatedShare = calculatedTotal / 3;

    const calculatedBalances = {
      Ana: Math.round((paid.Ana - calculatedShare) * 100) / 100,
      Pablo: Math.round((paid.Pablo - calculatedShare) * 100) / 100,
      Dani: Math.round((paid.Dani - calculatedShare) * 100) / 100,
    };

    // Calculate simplified debts
    const tempBalances = { ...calculatedBalances };
    const participants = ['Ana', 'Pablo', 'Dani'] as const;
    const debtList: { from: string; to: string; amount: number }[] = [];

    while (true) {
      let debtor: 'Ana' | 'Pablo' | 'Dani' | null = null;
      let creditor: 'Ana' | 'Pablo' | 'Dani' | null = null;
      let maxDebt = 0;
      let maxCredit = 0;

      participants.forEach((p) => {
        if (tempBalances[p] < -0.01 && tempBalances[p] < maxDebt) {
          maxDebt = tempBalances[p];
          debtor = p;
        }
        if (tempBalances[p] > 0.01 && tempBalances[p] > maxCredit) {
          maxCredit = tempBalances[p];
          creditor = p;
        }
      });

      if (!debtor || !creditor) break;

      const amount = Math.min(Math.abs(maxDebt), maxCredit);
      debtList.push({
        from: debtor,
        to: creditor,
        amount: Math.round(amount * 100) / 100,
      });

      tempBalances[debtor] = Math.round((tempBalances[debtor] + amount) * 100) / 100;
      tempBalances[creditor] = Math.round((tempBalances[creditor] - amount) * 100) / 100;
    }

    setTotal(calculatedTotal);
    setShare(Math.round(calculatedShare * 100) / 100);
    setBalances(calculatedBalances);
    setDebts(debtList);
    setSimulationDone(false);
  }, [expenses]);

  const toggleExpense = (id: string) => {
    if (isSimulating) return;
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, checked: !exp.checked } : exp))
    );
  };

  const runSimulation = () => {
    if (isSimulating || debts.length === 0) return;
    setIsSimulating(true);

    const timeline = gsap.timeline({
      onComplete: () => {
        setIsSimulating(false);
        setSimulationDone(true);
      },
    });

    // Clear any previous animated coins
    if (coinsContainerRef.current) {
      coinsContainerRef.current.innerHTML = '';
    }

    // 1. Highlight the debtor avatars
    timeline.to('.sim-avatar-debtor', {
      scale: 1.05,
      boxShadow: '0 0 20px rgba(176, 90, 90, 0.4)',
      duration: 0.3,
      stagger: 0.1,
    });

    // 2. Animate flowing coins/bills between friends based on calculated debts
    debts.forEach((debt) => {
      const fromEl = containerRef.current?.querySelector(`[data-name="${debt.from}"]`);
      const toEl = containerRef.current?.querySelector(`[data-name="${debt.to}"]`);
      const containerEl = coinsContainerRef.current;

      if (fromEl && toEl && containerEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();

        // Calculate positions relative to the simulator container
        const startX = fromRect.left - containerRect.left + fromRect.width / 2;
        const startY = fromRect.top - containerRect.top + fromRect.height / 2;
        const endX = toRect.left - containerRect.left + toRect.width / 2;
        const endY = toRect.top - containerRect.top + toRect.height / 2;

        // Create 3 animated coin elements per transfer path for a richer effect
        for (let i = 0; i < 3; i++) {
          const coin = document.createElement('div');
          coin.className = 'sim-animated-coin';
          coin.innerHTML = '€';
          containerEl.appendChild(coin);

          // Set starting position
          gsap.set(coin, {
            x: startX - 12,
            y: startY - 12,
            opacity: 0,
            scale: 0.5,
          });

          // Animate coin
          timeline.to(coin, {
            opacity: 1,
            scale: 1,
            x: startX + (Math.random() - 0.5) * 20 - 12,
            y: startY + (Math.random() - 0.5) * 20 - 12,
            duration: 0.2,
            delay: i * 0.1,
          }, '+=0')
          .to(coin, {
            x: endX - 12,
            y: endY - 12,
            duration: 0.8,
            ease: 'power2.inOut',
          })
          .to(coin, {
            opacity: 0,
            scale: 0.2,
            duration: 0.2,
          });
        }
      }
    });

    // 3. Highlight the creditor avatars and reset scale
    timeline.to('.sim-avatar-creditor', {
      scale: 1.05,
      boxShadow: '0 0 20px rgba(45, 106, 79, 0.4)',
      duration: 0.3,
    }, '-=0.3')
    .to('.simulator-friend-card', {
      scale: 1,
      boxShadow: 'none',
      duration: 0.3,
    });

    // 4. Fade in the results banner
    timeline.fromTo('.sim-results-banner', {
      y: 20,
      opacity: 0,
    }, {
      y: 0,
      opacity: 1,
      duration: 0.5,
      ease: 'back.out(1.5)',
    }, '-=0.2');
  };

  const getFriendColorClass = (name: string) => {
    switch (name) {
      case 'Ana': return 'bg-ana';
      case 'Pablo': return 'bg-pablo';
      case 'Dani': return 'bg-dani';
      default: return '';
    }
  };

  const formatBalance = (val: number) => {
    if (val === 0) return 'Saldado';
    return val > 0 ? `Le deben +${val}€` : `Debe ${Math.abs(val)}€`;
  };

  const getBalanceClass = (val: number) => {
    if (val === 0) return 'sim-balance-settled';
    return val > 0 ? 'sim-balance-credit' : 'sim-balance-debt';
  };

  return (
    <div ref={containerRef} className="simulator-card animate-fade-in">
      <div className="simulator-header">
        <div className="simulator-header-icon">
          <Coins size={20} />
        </div>
        <div>
          <h4 className="simulator-title">Simulador de Gastos</h4>
          <p className="simulator-subtitle">Elige qué gastos del grupo activar para ver cómo Divvy calcula y optimiza las deudas de forma automática.</p>
        </div>
      </div>

      <div className="simulator-grid">
        {/* Left Side: Expense selection */}
        <div className="simulator-expenses">
          <span className="simulator-section-label">Gastos del Viaje</span>
          <div className="simulator-expense-list">
            {expenses.map((exp) => (
              <button
                key={exp.id}
                onClick={() => toggleExpense(exp.id)}
                disabled={isSimulating}
                className={`simulator-expense-item ${exp.checked ? 'is-checked' : ''}`}
              >
                <div className="exp-checkbox">
                  {exp.checked && <Check size={12} />}
                </div>
                <span className="exp-emoji">{exp.emoji}</span>
                <div className="exp-info">
                  <span className="exp-name">{exp.name}</span>
                  <span className="exp-buyer">Pagó {exp.paidBy}</span>
                </div>
                <span className="exp-amount">{exp.amount}€</span>
              </button>
            ))}
          </div>

          <div className="simulator-summary">
            <div className="summary-row">
              <span>Gasto Total:</span>
              <strong>{total}€</strong>
            </div>
            <div className="summary-row">
              <span>Tocan a:</span>
              <strong>{share}€ / persona</strong>
            </div>
          </div>
        </div>

        {/* Right Side: Visualizing friends */}
        <div className="simulator-visualization">
          <span className="simulator-section-label">Amigos y Saldos</span>
          
          <div className="simulator-friends">
            {/* Friends Cards */}
            {(['Ana', 'Pablo', 'Dani'] as const).map((name) => {
              const balance = balances[name];
              const paid = expenses
                .filter((e) => e.checked && e.paidBy === name)
                .reduce((sum, e) => sum + e.amount, 0);

              const isDebtor = balance < 0;
              const isCreditor = balance > 0;

              return (
                <div
                  key={name}
                  data-name={name}
                  className={`simulator-friend-card ${
                    isDebtor ? 'sim-avatar-debtor-card' : isCreditor ? 'sim-avatar-creditor-card' : ''
                  }`}
                >
                  <div className={`simulator-friend-avatar ${getFriendColorClass(name)}`}>
                    {name[0]}
                  </div>
                  <span className="friend-name">{name}</span>
                  <span className="friend-paid">Pagó: {paid}€</span>
                  <span className={`friend-balance ${getBalanceClass(balance)}`}>
                    {formatBalance(balance)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Action Trigger */}
          <div className="simulator-actions">
            {debts.length > 0 ? (
              <button
                onClick={runSimulation}
                disabled={isSimulating}
                className="simulator-btn-solve"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw size={16} className="animate-spin-icon" />
                    Optimizando deudas...
                  </>
                ) : (
                  <>
                    Dividir Gastos con Divvy ⚡
                  </>
                )}
              </button>
            ) : (
              <div className="simulator-all-settled">
                <Check size={16} style={{ color: 'var(--success)' }} />
                <span>Cuentas totalmente claras y saldadas</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Animated Coins Container */}
      <div ref={coinsContainerRef} className="sim-coins-layer" />

      {/* Simplified Debts Results Banner */}
      {simulationDone && debts.length > 0 && (
        <div className="sim-results-banner">
          <span className="results-badge">Cuentas Divididas y Simplificadas</span>
          <p className="results-desc">
            En lugar de realizar múltiples transacciones, Divvy reduce las transferencias al mínimo absoluto:
          </p>
          <div className="results-list">
            {debts.map((debt, index) => (
              <div key={index} className="results-item">
                <span className="results-person debtor">{debt.from}</span>
                <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                <span className="results-person creditor">{debt.to}</span>
                <span className="results-amount">{debt.amount}€</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
