'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Copy, Plus, Trash2, Loader2, HelpCircle,
  Search, SlidersHorizontal, FileSpreadsheet,
  Utensils, Car, Home, ShoppingBag, Ticket, Package, FileCode, Settings,
  ChevronRight,
} from 'lucide-react';
import AddExpenseWizard from '@/components/expense/AddExpenseWizard';
import DebtSettlement from '@/components/DebtSettlement';
import ExpenseCharts from '@/components/ExpenseCharts';
import GroupNotes from '@/components/GroupNotes';
import BudgetProgress from '@/components/BudgetProgress';
import PwaPrompt from '@/components/PwaPrompt';
import type { Group, Expense, User } from '@/types';
import styles from './group.module.css';

const CATEGORY_COLORS: Record<string, string> = {
  Comida: '#C87A53', // Terracotta
  Transporte: '#4A5D4E', // Olive/Sage
  Alojamiento: '#5C768D', // Muted Blue
  Supermercado: '#BCA374', // Gold/Brass
  Entretenimiento: '#8A7B9F', // Lavender/Plum
  Otros: '#8E8D8A', // Warm Gray
};

const getCurrencySymbol = (code?: string) => {
  const symbols: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    JPY: '¥',
    MXN: '$',
  };
  return symbols[code || 'EUR'] || '€';
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GroupDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id: groupId } = use(params);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Omit<User, 'passwordHash'>[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'gastos' | 'liquidar' | 'stats' | 'notas' | 'config'>('gastos');

  // Settings tab form states
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsBudget, setSettingsBudget] = useState('');
  const [settingsHasBudget, setSettingsHasBudget] = useState(false);
  const [settingsCurrency, setSettingsCurrency] = useState('EUR');
  const [savingSettings, setSavingSettings] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Filter and Search States
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPayer, setFilterPayer] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // '', 'pendiente', 'saldado'
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc', 'date-asc', 'amount-desc', 'amount-asc', 'title-asc'

  // Clipboard copied indicator
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchGroupDetails = useCallback(async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.replace('/login');
        return;
      }
      const userData = await userRes.json();
      setCurrentUser(userData);

      const detailRes = await fetch(`/api/groups/${groupId}`);
      if (!detailRes.ok) {
        throw new Error('Error al cargar los detalles del grupo.');
      }
      const data = await detailRes.json();
      setGroup(data.group);
      setMembers(data.members);
      setExpenses(data.expenses);

      // Update config/settings form values
      setSettingsName(data.group.name || '');
      setSettingsDescription(data.group.description || '');
      setSettingsBudget(data.group.budget && data.group.budget > 0 ? data.group.budget.toString() : '');
      setSettingsHasBudget(!!(data.group.budget && data.group.budget > 0));
      setSettingsCurrency(data.group.currency || 'EUR');
    } catch (e: unknown) {
      console.error(e);
      showToast('Error de conexión o permisos.');
    } finally {
      setLoading(false);
    }
  }, [groupId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const handleCopyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    showToast('¡Código de invitación copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyInviteLink = () => {
    if (!group) return;
    const link = `${window.location.origin}/join/${group.inviteCode}`;
    navigator.clipboard.writeText(link);
    showToast('¡Enlace de invitación copiado!');
  };

  const handleSaveBudget = async (budget: number) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budget }),
      });
      if (!res.ok) throw new Error('No se pudo guardar el presupuesto');
      showToast('Presupuesto actualizado.');
      await fetchGroupDetails();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al guardar el presupuesto');
    }
  };

  const handleSaveNotes = async (notes: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error('No se pudieron guardar las notas');
      showToast('Notas del tablón guardadas.');
      await fetchGroupDetails();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al guardar las notas');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsName.trim()) {
      showToast('El nombre del grupo no puede estar vacío.');
      return;
    }

    setSavingSettings(true);
    try {
      const budgetVal = settingsHasBudget ? parseFloat(settingsBudget) || 0 : 0;
      const res = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settingsName.trim(),
          description: settingsDescription.trim(),
          budget: budgetVal,
          currency: settingsCurrency
        }),
      });

      if (!res.ok) {
        throw new Error('Error al actualizar la configuración del grupo.');
      }

      showToast('Ajustes guardados correctamente.');
      await fetchGroupDetails();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al guardar los ajustes.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'groupId' | 'createdAt'>) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...expenseData, groupId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al guardar gasto');
      }

      showToast('¡Gasto añadido con éxito!');
      await fetchGroupDetails();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al añadir el gasto');
      throw err;
    }
  };

  const handleDeleteExpense = async (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) return;

    try {
      const res = await fetch(`/api/expenses?id=${expenseId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar gasto');
      }

      showToast('Gasto eliminado.');
      await fetchGroupDetails();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar el gasto');
    }
  };

  const handleSettleDebt = async (from: string, to: string, amount: number) => {
    const fromUser = members.find(m => m.id === from);
    const toUser = members.find(m => m.id === to);
    if (!fromUser || !toUser) return;

    const settlementData = {
      groupId,
      title: `Liquidación: ${fromUser.username} → ${toUser.username}`,
      amount,
      date: new Date().toISOString(),
      category: 'Otros',
      paidById: from,
      splitType: 'exact',
      splits: [{ userId: to, value: amount, isPaid: true }], // Settlement starts as paid
      isSettlement: true
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settlementData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al registrar liquidación');
      }

      showToast('¡Pago de liquidación registrado!');
      await fetchGroupDetails();
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error al liquidar la deuda');
    }
  };

  // Toggle isPaid for an individual split in an expense card
  const handleToggleSplitPaid = async (e: React.MouseEvent, expense: Expense, splitUserId: string, currentIsPaid: boolean) => {
    e.stopPropagation();
    const updatedSplits = expense.splits.map(s => {
      if (s.userId === splitUserId) {
        return { ...s, isPaid: !currentIsPaid };
      }
      return s;
    });

    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: expense.id,
          splits: updatedSplits
        }),
      });

      if (!res.ok) {
        throw new Error('No se pudo actualizar el estado de pago.');
      }

      showToast('Estado de pago de cuota actualizado.');
      await fetchGroupDetails();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar el pago');
    }
  };

  // Export ledger to CSV
  const handleExportCSV = () => {
    if (!group || expenses.length === 0) return;
    const headers = ['Concepto', 'Importe', 'Categoria', 'Fecha', 'Pagador', 'Metodo Pago', 'Tags', 'Es Liquidacion'];
    const rows = expenses.map(e => [
      e.title,
      e.amount,
      e.category,
      e.date.split('T')[0],
      getPayerName(e.paidById),
      e.paymentMethod || 'cash',
      e.tags?.join('; ') || '',
      e.isSettlement ? 'Si' : 'No'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gastos_${group.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo CSV descargado.');
  };

  // Export ledger to JSON
  const handleExportJSON = () => {
    if (!group) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ group, members, expenses }, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `divvy_${group.name.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo JSON descargado.');
  };

  const getPayerName = (id: string) => {
    const m = members.find(member => member.id === id);
    return m ? m.username : 'Usuario desconocido';
  };

  const getCategoryIcon = (category: string, size = 18) => {
    const props = { size, style: { color: 'var(--text-secondary)' } };
    switch (category) {
      case 'Comida': return <Utensils {...props} />;
      case 'Transporte': return <Car {...props} />;
      case 'Alojamiento': return <Home {...props} />;
      case 'Supermercado': return <ShoppingBag {...props} />;
      case 'Entretenimiento': return <Ticket {...props} />;
      default: return <Package {...props} />;
    }
  };

  const getMemberShare = (expense: Expense, memberId: string): number => {
    const { splitType, splits, amount } = expense;
    
    if (splitType === 'equal') {
      const isParticipant = splits.some(s => s.userId === memberId);
      if (!isParticipant) return 0;
      return amount / (splits.length || 1);
    }
    
    const userSplit = splits.find(s => s.userId === memberId);
    if (!userSplit) return 0;
    
    if (splitType === 'exact' || splitType === 'itemized') {
      return userSplit.value;
    }
    if (splitType === 'percentage') {
      return (userSplit.value / 100) * amount;
    }
    if (splitType === 'shares') {
      const totalShares = splits.reduce((sum, s) => sum + s.value, 0);
      if (totalShares === 0) return 0;
      return (userSplit.value / totalShares) * amount;
    }
    return 0;
  };

  // Compile all unique tags in active expenses for filter suggestion
  const allGroupTags = Array.from(
    new Set(expenses.flatMap(e => e.tags || []))
  );

  // Filters logic
  const filteredExpenses = expenses.filter(expense => {
    if (searchQuery && !expense.title.toLowerCase().includes(searchQuery.toLowerCase()) && !(expense.notes || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filterCategory && expense.category !== filterCategory) {
      return false;
    }
    if (filterPayer && expense.paidById !== filterPayer) {
      return false;
    }
    if (filterPaymentMethod && expense.paymentMethod !== filterPaymentMethod) {
      return false;
    }
    if (filterTag && (!expense.tags || !expense.tags.includes(filterTag))) {
      return false;
    }
    if (filterStatus) {
      // An expense is settled when all splits (excluding payer) are marked isPaid
      const isPayerOnly = (sUserId: string) => expense.multiPayers && expense.multiPayers.length > 0
        ? expense.multiPayers.some(p => p.userId === sUserId)
        : sUserId === expense.paidById;

      const isSettled = expense.splits.every(s => s.isPaid || isPayerOnly(s.userId) || getMemberShare(expense, s.userId) === 0);
      if (filterStatus === 'saldado' && !isSettled) return false;
      if (filterStatus === 'pendiente' && isSettled) return false;
    }
    if (filterStartDate && new Date(expense.date) < new Date(filterStartDate)) {
      return false;
    }
    if (filterEndDate && new Date(expense.date) > new Date(filterEndDate)) {
      return false;
    }
    return true;
  });

  // Sort logic
  const sortedExpenses = [...filteredExpenses].sort((a, b) => {
    if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
    if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'amount-desc') return b.amount - a.amount;
    if (sortBy === 'amount-asc') return a.amount - b.amount;
    if (sortBy === 'title-asc') return a.title.localeCompare(b.title);
    return 0;
  });

  if (loading || !group) {
    return (
      <div className={styles.groupDetail} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: '12px' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cargando grupo...</span>
      </div>
    );
  }

  const totalSpent = expenses
    .filter(e => !e.isSettlement)
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className={`${styles.groupDetail} animate-fade-in`}>
      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.push('/')} title="Volver al inicio">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.headerInfo}>
          <span className={styles.groupName}>{group.name}</span>
          <span className={styles.memberSummary}>
            {members.length} miembros • Cód: {group.inviteCode}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        
        {/* Budget Progress Bar */}
        {group.budget && group.budget > 0 ? (
          <section style={{ marginBottom: '20px' }}>
            <BudgetProgress
              totalSpent={totalSpent}
              currentBudget={group.budget}
              currency={getCurrencySymbol(group.currency)}
              onSaveBudget={handleSaveBudget}
            />
          </section>
        ) : null}

        {/* Tabs */}
        <div className={styles.tabs} style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          <button className={`${styles.tabBtn} ${activeTab === 'gastos' ? styles.active : ''}`} onClick={() => setActiveTab('gastos')}>
            Gastos
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'liquidar' ? styles.active : ''}`} onClick={() => setActiveTab('liquidar')}>
            Cuentas
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'stats' ? styles.active : ''}`} onClick={() => setActiveTab('stats')}>
            Gráficos
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'notas' ? styles.active : ''}`} onClick={() => setActiveTab('notas')}>
            Notas
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'config' ? styles.active : ''}`} onClick={() => setActiveTab('config')}>
            Ajustes
          </button>
        </div>

        {activeTab === 'gastos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Advanced Filters Panel */}
            <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px', boxShadow: 'var(--shadow-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Buscar por concepto o notas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px 9px 32px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.82rem', outline: 'none', backgroundColor: 'var(--bg-primary)' }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                </div>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)' }}
                  title="Filtros avanzados"
                >
                  <SlidersHorizontal size={16} />
                </button>
              </div>

              {/* Collapsible advanced selectors */}
              {showFilters && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '12px', animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Categoría:</span>
                      <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ padding: '8px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-primary)' }}>
                        <option value="">Todas</option>
                        {CATEGORY_COLORS && Object.keys(CATEGORY_COLORS).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Pagado por:</span>
                      <select value={filterPayer} onChange={(e) => setFilterPayer(e.target.value)} style={{ padding: '8px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-primary)' }}>
                        <option value="">Cualquiera</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.username}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Método Pago:</span>
                      <select value={filterPaymentMethod} onChange={(e) => setFilterPaymentMethod(e.target.value)} style={{ padding: '8px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-primary)' }}>
                        <option value="">Todos</option>
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="bizum">Bizum</option>
                        <option value="paypal">PayPal</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Etiqueta:</span>
                      <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} style={{ padding: '8px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-primary)' }}>
                        <option value="">Cualquiera</option>
                        {allGroupTags.map(tag => (
                          <option key={tag} value={tag}>#{tag}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Estado:</span>
                      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '8px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-primary)' }}>
                        <option value="">Todos</option>
                        <option value="pendiente">Pendientes de Cobro</option>
                        <option value="saldado">Cuentas Saldadas</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Ordenar por:</span>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px', fontSize: '0.78rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-primary)' }}>
                        <option value="date-desc">Fecha: Recientes</option>
                        <option value="date-asc">Fecha: Antiguos</option>
                        <option value="amount-desc">Importe: Mayor</option>
                        <option value="amount-asc">Importe: Menor</option>
                        <option value="title-asc">Nombre (A-Z)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Desde fecha:</span>
                      <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} style={{ padding: '8px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-primary)', outline: 'none' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Hasta fecha:</span>
                      <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} style={{ padding: '8px', fontSize: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-primary)', outline: 'none' }} />
                    </div>
                  </div>

                  {/* Reset filters button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterCategory('');
                      setFilterPayer('');
                      setFilterPaymentMethod('');
                      setFilterTag('');
                      setFilterStatus('');
                      setFilterStartDate('');
                      setFilterEndDate('');
                      setSortBy('date-desc');
                    }}
                    className="btn btn-secondary"
                    style={{ padding: '6px', fontSize: '0.75rem', marginTop: '4px' }}
                  >
                    Restablecer Filtros
                  </button>
                </div>
              )}

              {/* CSV/JSON Exports */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '12px', justifyContent: 'flex-end' }}>
                <button onClick={handleExportCSV} style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileSpreadsheet size={14} /> Exportar CSV
                </button>
                <span style={{ color: 'var(--border-light)' }}>|</span>
                <button onClick={handleExportJSON} style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileCode size={14} /> Exportar JSON
                </button>
              </div>
            </div>

            {/* Members List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Miembros:</span>
              <div className={styles.membersList}>
                {members.map(member => (
                  <div key={member.id} className={styles.memberPill}>
                    <div className={styles.memberDot} style={{ backgroundColor: member.avatarColor }} />
                    <span>{member.username} {member.id === currentUser?.id && '(Tú)'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses Feed */}
            <section className={styles.expenseList}>
              {sortedExpenses.length > 0 ? (
                  sortedExpenses.map((expense) => {
                  const payerName = getPayerName(expense.paidById);
                  const isPayerCurrentUser = expense.paidById === currentUser?.id;
                  
                  const categoryIcon = getCategoryIcon(expense.category, 20);
                  const expenseDate = new Date(expense.date).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                  });

                  // Check if expense is fully settled
                  const isPayerOnly = (sUserId: string) => expense.multiPayers && expense.multiPayers.length > 0
                    ? expense.multiPayers.some(p => p.userId === sUserId)
                    : sUserId === expense.paidById;
                  const isExpenseFullySettled = expense.splits.every(s => s.isPaid || isPayerOnly(s.userId) || getMemberShare(expense, s.userId) === 0);

                  return (
                    <div
                      key={expense.id}
                      className={styles.expenseCard}
                      style={{ flexDirection: 'column', gap: '0', alignItems: 'stretch' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        <Link
                          href={`/group/${groupId}/${expense.id}`}
                          className={styles.expenseCardLink}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, textDecoration: 'none', color: 'inherit', minWidth: 0, gap: 8 }}
                        >
                          <div className={styles.expenseLeft}>
                            <div className={styles.categoryIcon}>{categoryIcon}</div>
                            <div className={styles.expenseInfo}>
                              <span className={styles.expenseTitle}>{expense.title}</span>
                              <span className={styles.expenseMeta}>
                                {expense.multiPayers && expense.multiPayers.length > 0 ? (
                                  <strong>Varios pagadores</strong>
                                ) : (
                                  <>Pagado por <strong>{isPayerCurrentUser ? 'ti' : payerName}</strong></>
                                )}{' '}
                                • {expenseDate}
                              </span>

                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                                {expense.isSettlement ? (
                                  <span className={styles.settlementBadge}>Liquidación</span>
                                ) : isExpenseFullySettled ? (
                                  <span className={styles.settlementBadge} style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>Saldado</span>
                                ) : (
                                  <span className={styles.settlementBadge} style={{ backgroundColor: '#FDF5E6', color: '#D48C45' }}>Pendiente</span>
                                )}

                                {expense.paymentMethod && expense.paymentMethod !== 'cash' && (
                                  <span className={styles.settlementBadge} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                    {expense.paymentMethod.toUpperCase()}
                                  </span>
                                )}

                                {expense.tags && expense.tags.map(t => (
                                  <span key={t} style={{ fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-secondary)' }}>#{t}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className={styles.expenseRight}>
                            <span className={styles.expenseAmount}>
                              {expense.amount.toFixed(2)}
                              {getCurrencySymbol(group.currency)}
                            </span>
                            <ChevronRight size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          </div>
                        </Link>

                        {(isPayerCurrentUser || expense.paidById === currentUser?.id) && (
                            <button
                              className={styles.deleteBtn}
                              onClick={(e) => handleDeleteExpense(e, expense.id)}
                              title="Eliminar gasto"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px dashed var(--text-muted)',
                  borderRadius: 'var(--radius-md)',
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <HelpCircle size={32} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Sin gastos coincidentes</span>
                  <span style={{ fontSize: '0.75rem' }}>Prueba a cambiar tus filtros o busca otro concepto.</span>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Tab 2: Debt Settlement */}
        {activeTab === 'liquidar' && currentUser && (
          <section className="animate-fade-in">
            <DebtSettlement
              members={members}
              expenses={expenses}
              currentUserId={currentUser.id}
              onSettleDebt={handleSettleDebt}
            />
          </section>
        )}

        {/* Tab 3: Charts/Stats */}
        {activeTab === 'stats' && (
          <section className="animate-fade-in">
            <ExpenseCharts
              members={members}
              expenses={expenses}
            />
          </section>
        )}

        {/* Tab 4: Markdown Notes Tab Board */}
        {activeTab === 'notas' && (
          <section className="animate-fade-in">
            <GroupNotes
              initialNotes={group.notes || ''}
              onSaveNotes={handleSaveNotes}
            />
          </section>
        )}

        {/* Tab 5: Settings / Config */}
        {activeTab === 'config' && (
          <section className="animate-fade-in" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '20px', boxShadow: 'var(--shadow-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.05rem', marginBottom: '20px', letterSpacing: '-0.02em' }}>
              <Settings size={20} style={{ color: 'var(--accent-primary)' }} />
              <span>Configuración del Grupo</span>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Group Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Nombre del Grupo</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Ej. Viaje a París"
                  style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', backgroundColor: 'var(--bg-primary)' }}
                  required
                />
              </div>

              {/* Group Description */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Descripción (Opcional)</label>
                <textarea
                  value={settingsDescription}
                  onChange={(e) => setSettingsDescription(e.target.value)}
                  placeholder="Ej. Gastos compartidos de las vacaciones"
                  rows={2}
                  style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', backgroundColor: 'var(--bg-primary)', resize: 'none', fontFamily: 'inherit' }}
                />
              </div>

              {/* Currency Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Divisa Principal</label>
                <select
                  value={settingsCurrency}
                  onChange={(e) => setSettingsCurrency(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', backgroundColor: 'var(--bg-primary)', cursor: 'pointer' }}
                >
                  <option value="EUR">Euro (€)</option>
                  <option value="USD">Dólar ($)</option>
                  <option value="GBP">Libra (£)</option>
                  <option value="JPY">Yen (¥)</option>
                  <option value="MXN">Peso Mexicano ($)</option>
                </select>
              </div>

              {/* Budget Limit Config */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    id="enableBudget"
                    checked={settingsHasBudget}
                    onChange={(e) => {
                      setSettingsHasBudget(e.target.checked);
                      if (!e.target.checked) setSettingsBudget('');
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
                  />
                  <label htmlFor="enableBudget" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', cursor: 'pointer' }}>
                    Establecer límite de presupuesto
                  </label>
                </div>

                {settingsHasBudget && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', animation: 'fadeIn 0.2s ease', marginLeft: '28px' }}>
                    <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Presupuesto límite</label>
                    <div style={{ position: 'relative', maxWidth: '200px' }}>
                      <input
                        type="text"
                        placeholder="Ej. 1000"
                        value={settingsBudget}
                        onChange={(e) => {
                          if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) {
                            setSettingsBudget(e.target.value);
                          }
                        }}
                        style={{ width: '100%', padding: '10px 12px 10px 24px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', backgroundColor: 'var(--bg-primary)', fontWeight: 700 }}
                      />
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                        {getCurrencySymbol(settingsCurrency)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={savingSettings}
                className="btn btn-primary"
                style={{ padding: '12px', fontSize: '0.85rem', marginTop: '10px' }}
              >
                {savingSettings ? 'Guardando...' : 'Guardar Ajustes'}
              </button>
            </form>

            {/* Invite Info Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Invitar Miembros
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Comparte el código o envía el enlace de invitación directa:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 700 }}>CÓDIGO</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em' }}>{group.inviteCode}</span>
                  </div>
                  <button className={styles.copyBtn} onClick={handleCopyCode}>
                    {copied ? '¡Copiado!' : 'Copiar Código'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyInviteLink}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.8rem', fontWeight: 700, borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', backgroundColor: 'transparent' }}
                >
                  <Copy size={14} /> Copiar Enlace de Invitación
                </button>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Floating Action Button */}
      {activeTab === 'gastos' && (
        <button
          className={styles.fab}
          onClick={() => setIsAddModalOpen(true)}
          title="Añadir gasto"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modal Add Expense */}
      {currentUser && (
        <AddExpenseWizard
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          members={members}
          currentUserId={currentUser.id}
          currency={group?.currency}
          onAddExpense={handleAddExpense}
        />
      )}

      {/* PWA Prompt */}
      <PwaPrompt />

      {/* Toast */}
      {toastMsg && <div className={styles.toast} style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 100 }}>{toastMsg}</div>}
    </div>
  );
}
