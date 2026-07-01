'use client';

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, Copy, Plus, Trash2, Loader2, HelpCircle,
  Search, SlidersHorizontal, FileSpreadsheet,
  Utensils, Car, Home, ShoppingBag, Ticket, Package, FileCode, Settings,
  ChevronRight, Music, BookOpen, Laptop, Printer, ImageIcon, X, Upload, Bell, Pencil,
  QrCode, Camera
} from 'lucide-react';
import AddExpenseWizard from '@/components/expense/AddExpenseWizard';
import QRInviteModal from '@/components/QRInviteModal';
import DebtSettlement from '@/components/DebtSettlement';
import ExpenseCharts from '@/components/ExpenseCharts';
import GroupDocument from '@/components/document/GroupDocument';
import BudgetProgress from '@/components/BudgetProgress';
import PwaPrompt from '@/components/PwaPrompt';
import NotificationCenter from '@/components/NotificationCenter';
import CountdownWidget from '@/components/CountdownWidget';
import BonoCulturalHub from '@/components/BonoCulturalHub';
import PrintableInvoice from '@/components/PrintableInvoice';
import type { Group, Expense, User } from '@/types';
import PremiumLoader from '@/components/PremiumLoader';
import { offlineDb } from '@/lib/offline-db';
import { useOfflineSync } from '@/lib/useOfflineSync';
import styles from './group.module.css';

const CATEGORY_COLORS: Record<string, string> = {
  Comida: '#C87A53', // Terracotta
  Transporte: '#4A5D4E', // Olive/Sage
  Alojamiento: '#5C768D', // Muted Blue
  Supermercado: '#BCA374', // Gold/Brass
  Entretenimiento: '#8A7B9F', // Lavender/Plum
  Otros: '#8E8D8A', // Warm Gray
  'Artes en vivo, patrimonio y audiovisual': '#8A7B9F', // Plum/Violet
  'Soporte físico': '#BCA374', // Gold/Brass
  'Consumo digital': '#5C768D', // Muted Blue
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
  const searchParams = useSearchParams();
  const { id: groupId } = use(params);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['bono', 'gastos', 'liquidar', 'stats', 'notas', 'config'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Omit<User, 'passwordHash'>[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isShowingCachedData, setIsShowingCachedData] = useState(false);
  const [activeTab, setActiveTab] = useState<'bono' | 'gastos' | 'liquidar' | 'stats' | 'notas' | 'config'>('gastos');

  // Offline sync hook — used to queue mutations and refresh pending count
  // (callback wired up in useEffect below, after fetchGroupDetails is defined)
  const { isOnline, refreshPendingCount } = useOfflineSync();

  // Settings tab form states
  const [settingsName, setSettingsName] = useState('');
  const [settingsDescription, setSettingsDescription] = useState('');
  const [settingsBudget, setSettingsBudget] = useState('');
  const [settingsHasBudget, setSettingsHasBudget] = useState(false);
  const [settingsCurrency, setSettingsCurrency] = useState('EUR');
  const [settingsTargetDate, setSettingsTargetDate] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [requestingDelete, setRequestingDelete] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [leavingGroup, setLeavingGroup] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Cover image states
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverDragOver, setCoverDragOver] = useState(false);
  
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
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [portalMounted, setPortalMounted] = useState(false);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchGroupDetails = useCallback(async () => {
    try {
      const [userRes, detailRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/groups/${groupId}`)
      ]);

      if (!userRes.ok) {
        router.replace('/login');
        return;
      }
      const userData = await userRes.json();
      setCurrentUser(userData);

      let data: { group: Group; members: Omit<User, 'passwordHash'>[]; expenses: Expense[] };

      if (!detailRes.ok || detailRes.status === 503) {
        // Offline or server error: serve from IndexedDB cache
        const cached = await offlineDb.cache.getGroupDetail<typeof data>(groupId);
        if (cached) {
          data = cached;
          setIsShowingCachedData(true);
        } else {
          throw new Error('Error al cargar los detalles del grupo.');
        }
      } else {
        data = await detailRes.json();
        // Save fresh data to IndexedDB for offline use
        await offlineDb.cache.saveGroupDetail(groupId, data);
        setIsShowingCachedData(false);
      }

      setGroup(data.group);
      setMembers(data.members);
      setExpenses(data.expenses);

      if (data.group.isBonoCultural) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveTab('bono');
      }

      // Update config/settings form values
      setSettingsName(data.group.name || '');
      setSettingsDescription(data.group.description || '');
      setSettingsBudget(data.group.budget && data.group.budget > 0 ? data.group.budget.toString() : '');
      setSettingsHasBudget(!!(data.group.budget && data.group.budget > 0));
      setSettingsCurrency(data.group.currency || 'EUR');
      setSettingsTargetDate(data.group.targetDate ? (data.group.targetDate.includes('T') ? data.group.targetDate : data.group.targetDate + 'T00:00') : '');
      // Reset cover preview to persisted value on every load
      setCoverPreview(data.group.coverImageUrl || null);
      setCoverFile(null);
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

  // Re-fetch data when connection is restored (picks up synced changes)
  useEffect(() => {
    const handleOnline = () => {
      fetchGroupDetails();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
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



  const handleToggleTicketUploaded = async (expenseId: string, currentVal: boolean) => {
    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expenseId, ticketUploaded: currentVal }),
      });
      if (!res.ok) {
        throw new Error('Error al actualizar el estado del ticket.');
      }
      await fetchGroupDetails();
      showToast(currentVal ? '¡Ticket marcado como justificado!' : '¡Ticket marcado como pendiente!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar ticket');
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
          currency: settingsCurrency,
          targetDate: settingsTargetDate || null
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

  const handleDeleteGroup = async () => {
    if (!group) return;
    
    const confirmMessage = `¿Estás seguro de que quieres eliminar el grupo "${group.name}"?
Esta acción requiere verificación. Se te enviará un correo con un enlace para confirmar la eliminación permanente del grupo y todos sus gastos asociados.`;
    
    if (!confirm(confirmMessage)) return;

    setRequestingDelete(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/delete-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar la solicitud de eliminación.');
      }

      if (data.devLink) {
        console.log(`[DEVELOPMENT ONLY] Enlace de eliminación: ${data.devLink}`);
        showToast('Enlace de confirmación generado. Revisa la consola.');
        alert(`[Desarrollo] Haz clic en Aceptar para simular la confirmación en el navegador: \n\n${data.devLink}`);
        window.open(data.devLink, '_blank');
      } else {
        showToast('Correo de verificación enviado correctamente.');
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al solicitar la eliminación.');
    } finally {
      setRequestingDelete(false);
    }
  };

  const handleKickMember = async (memberId: string, username: string) => {
    if (!confirm(`¿Estás seguro de que quieres expulsar a "${username}" de este grupo?`)) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al expulsar al miembro.');
      showToast(`"${username}" ha sido expulsado del grupo.`);
      await fetchGroupDetails();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al expulsar al miembro.');
    }
  };

  const handleTransferOwnership = async (newOwnerId: string, username: string) => {
    if (!confirm(`¿Estás seguro de que quieres transferir la propiedad del grupo a "${username}"? Dejarás de ser el creador y administrador del grupo.`)) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newOwnerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al transferir la propiedad.');
      showToast(`¡Propiedad transferida a "${username}"!`);
      await fetchGroupDetails();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al transferir la propiedad.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('¿Estás seguro de que quieres salir de este grupo?')) return;
    setLeavingGroup(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al salir del grupo.');
      showToast('Has salido del grupo.');
      router.replace('/app');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al salir del grupo.');
      setLeavingGroup(false);
    }
  };

  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setSendingInvite(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar la invitación.');
      showToast('¡Invitación enviada por correo!');
      setInviteEmail('');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al enviar la invitación.');
    } finally {
      setSendingInvite(false);
    }
  };

  // ── Cover Image Handlers ──────────────────────────────────────────────────
  const handleCoverFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('Solo se permiten imágenes.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen no puede superar los 5 MB.');
      return;
    }
    setCoverFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadCover = async () => {
    if (!coverFile) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('cover', coverFile);
      const res = await fetch(`/api/groups/${groupId}/cover`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al subir la imagen.');
      }
      const data = await res.json();
      setCoverPreview(data.coverImageUrl);
      setCoverFile(null);
      // Update local group state immediately without full refetch
      setGroup((prev) => prev ? { ...prev, coverImageUrl: data.coverImageUrl } : prev);
      showToast('¡Imagen de portada actualizada!');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al subir la imagen.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleRemoveCover = async () => {
    if (!group?.coverImageUrl) return;
    if (!confirm('¿Eliminar la imagen de portada del grupo?')) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/cover`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Error al eliminar la imagen.');
      setCoverPreview(null);
      setCoverFile(null);
      setGroup((prev) => prev ? { ...prev, coverImageUrl: null } : prev);
      showToast('Imagen de portada eliminada.');
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar la imagen.');
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleAddExpense = async (expenseData: Omit<Expense, 'id' | 'groupId' | 'createdAt'>): Promise<string | undefined> => {
    if (!isOnline) {
      // Create a temporary optimistic expense to show in the UI immediately
      const tempId = `offline-${Date.now()}`;
      const optimisticExpense: Expense = {
        id: tempId,
        groupId,
        createdAt: new Date().toISOString(),
        ...expenseData,
      };

      // Queue for later sync
      await offlineDb.queue.add({
        id: tempId,
        method: 'POST',
        url: '/api/expenses',
        body: { ...expenseData, groupId },
        createdAt: new Date().toISOString(),
        label: `Añadir gasto "${expenseData.title}"`,
        optimisticData: optimisticExpense,
      });

      // Optimistic update: add the temp expense to local state
      setExpenses((prev) => [optimisticExpense, ...prev]);
      await refreshPendingCount();
      showToast('Gasto guardado localmente — se sincronizará cuando vuelva la conexión');
      return;
    }

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

      const createdExpense = await res.json();
      showToast('¡Gasto añadido con éxito!');
      await fetchGroupDetails();
      return createdExpense.id;
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al añadir el gasto');
      throw err;
    }
  };

  const handleUpdateExpense = async (expenseId: string, expenseData: Omit<Expense, 'id' | 'groupId' | 'createdAt'>): Promise<string | undefined> => {
    if (!isOnline) {
      const opId = `offline-edit-${Date.now()}`;
      await offlineDb.queue.add({
        id: opId,
        method: 'PUT',
        url: '/api/expenses',
        body: { id: expenseId, ...expenseData },
        createdAt: new Date().toISOString(),
        label: `Editar gasto "${expenseData.title}"`,
      });
      setExpenses((prev) =>
        prev.map((ex) =>
          ex.id === expenseId ? { ...ex, ...expenseData } : ex
        )
      );
      await refreshPendingCount();
      showToast('Gasto actualizado localmente — se sincronizará cuando vuelva la conexión');
      return expenseId;
    }

    try {
      const res = await fetch('/api/expenses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: expenseId, ...expenseData }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar gasto');
      }

      showToast('¡Gasto actualizado con éxito!');
      await fetchGroupDetails();
      return expenseId;
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar el gasto');
      throw err;
    }
  };

  const handleDeleteExpense = async (e: React.MouseEvent, expenseId: string) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que quieres eliminar este gasto?')) return;

    if (!isOnline) {
      const opId = `offline-del-${Date.now()}`;
      await offlineDb.queue.add({
        id: opId,
        method: 'DELETE',
        url: `/api/expenses?id=${expenseId}`,
        createdAt: new Date().toISOString(),
        label: 'Eliminar gasto',
      });
      // Optimistic: remove from local state
      setExpenses((prev) => prev.filter((ex) => ex.id !== expenseId));
      await refreshPendingCount();
      showToast('Gasto eliminado localmente — se sincronizará cuando vuelva la conexión');
      return;
    }

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

  const [sendingReminders, setSendingReminders] = useState(false);

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const res = await fetch(`/api/reminders?groupId=${groupId}`, { method: 'POST' });
      if (!res.ok) throw new Error('Error al enviar recordatorios');
      const data = await res.json();
      showToast(`📨 ${data.sent} recordatorio${data.sent !== 1 ? 's' : ''} enviado${data.sent !== 1 ? 's' : ''}`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al enviar recordatorios');
    } finally {
      setSendingReminders(false);
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

    if (!isOnline) {
      const opId = `offline-paid-${Date.now()}`;
      await offlineDb.queue.add({
        id: opId,
        method: 'PUT',
        url: '/api/expenses',
        body: { id: expense.id, splits: updatedSplits },
        createdAt: new Date().toISOString(),
        label: `Marcar cuota de "${expense.title}" como ${!currentIsPaid ? 'pagada' : 'pendiente'}`,
      });
      // Optimistic: update local state
      setExpenses((prev) =>
        prev.map((ex) =>
          ex.id === expense.id ? { ...ex, splits: updatedSplits } : ex
        )
      );
      await refreshPendingCount();
      showToast('Estado actualizado localmente — se sincronizará cuando vuelva la conexión');
      return;
    }

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
      case 'Artes en vivo, patrimonio y audiovisual': return <Music {...props} />;
      case 'Soporte físico': return <BookOpen {...props} />;
      case 'Consumo digital': return <Laptop {...props} />;
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

      const isSettled = expense.splits.length > 0 && expense.splits.every(s => s.isPaid || isPayerOnly(s.userId));
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
    return <PremiumLoader text="Cargando detalles del grupo" />;
  }

  const totalSpent = expenses
    .filter(e => !e.isSettlement)
    .reduce((sum, e) => sum + e.amount, 0);

  const isCreator = !!(currentUser && group && (group.creatorId ? group.creatorId === currentUser.id : group.members[0] === currentUser.id));

  return (
    <>
      <div className={`${styles.groupDetail} page-transition-enter`}>
        <div className="interactive-layout-wrapper">
        {/* Cached data notice */}
        {isShowingCachedData && (
          <div style={{
            background: 'rgba(200, 122, 83, 0.08)',
            borderBottom: '1px solid rgba(200, 122, 83, 0.2)',
            padding: '6px 16px',
            fontSize: '0.72rem',
            color: 'var(--accent-primary)',
            fontWeight: 600,
            textAlign: 'center',
          }}>
            📦 Mostrando datos guardados localmente
          </div>
        )}
        {/* Render group header details into the global Header portals */}
        {portalMounted && createPortal(
          <>
            <button className={styles.backBtn} onClick={() => router.push('/app')} title="Volver al inicio">
              <ArrowLeft size={20} />
            </button>
            <div style={{ width: '1px', height: '20px', backgroundColor: 'var(--border-light)', margin: '0 4px' }} />
            <div className={styles.headerInfo}>
              <span className={styles.groupName} style={{ display: 'block', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>{group.name}</span>
              <span className={styles.memberSummary} style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                {members.length} miembros • Cód: {group.inviteCode}
              </span>
            </div>
          </>,
          document.getElementById('header-left-portal')!
        )}

        {portalMounted && createPortal(
          <>
            <button
              onClick={() => window.print()}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                transition: 'var(--transition-smooth)'
              }}
              title="Exportar Factura (PDF)"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={() => setIsQRModalOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                transition: 'var(--transition-smooth)'
              }}
              title="Invitar con Código QR"
            >
              <QrCode size={20} />
            </button>
          </>,
          document.getElementById('header-actions-portal')!
        )}

      {/* Main Content */}
      <main className={styles.mainContent}>

        {/* Cover hero */}
        {group.coverImageUrl && (
          <div style={{
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-subtle)',
            marginBottom: '20px',
            aspectRatio: '3 / 1',
            backgroundColor: 'var(--bg-secondary)',
          }}>
            <img
              src={group.coverImageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        {/* Countdown Widget */}
        {group.targetDate && !group.isBonoCultural ? (
          <section style={{ marginBottom: '20px' }}>
            <CountdownWidget targetDate={group.targetDate} groupName={group.name} />
          </section>
        ) : null}

        {/* Budget Progress Bar */}
        {group.budget && group.budget > 0 && !group.isBonoCultural ? (
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
        <div 
          className={styles.tabs} 
          style={{ gridTemplateColumns: group.isBonoCultural ? 'repeat(5, 1fr)' : 'repeat(6, 1fr)' }}
        >
          {group.isBonoCultural && (
            <button className={`${styles.tabBtn} ${activeTab === 'bono' ? styles.active : ''}`} onClick={() => setActiveTab('bono')}>
              Bono
            </button>
          )}
          <button className={`${styles.tabBtn} ${activeTab === 'gastos' ? styles.active : ''}`} onClick={() => setActiveTab('gastos')}>
            Gastos
          </button>
          {!group.isBonoCultural && (
            <button className={`${styles.tabBtn} ${activeTab === 'liquidar' ? styles.active : ''}`} onClick={() => setActiveTab('liquidar')}>
              Cuentas
            </button>
          )}
          <button className={`${styles.tabBtn} ${activeTab === 'stats' ? styles.active : ''}`} onClick={() => setActiveTab('stats')}>
            Gráficos
          </button>
          {!group.isBonoCultural && (
            <button className={`${styles.tabBtn} ${activeTab === 'notas' ? styles.active : ''}`} onClick={() => setActiveTab('notas')}>
              Notas
            </button>
          )}
          {/* Fotos tab — links to photos.divvy.es */}
          <button
            className={styles.tabBtn}
            onClick={() => {
              const photosBase = process.env.NEXT_PUBLIC_PHOTOS_URL ||
                (typeof window !== 'undefined' && window.location.hostname === 'localhost'
                  ? 'http://localhost:3001'
                  : 'https://photos.divvy.es');
              window.open(`${photosBase}/group/${groupId}`, '_blank');
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}
            title="Álbum de fotos del grupo"
          >
            <Camera size={13} />
            Fotos
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'config' ? styles.active : ''}`} onClick={() => setActiveTab('config')}>
            Ajustes
          </button>
        </div>

        {activeTab === 'bono' && group.isBonoCultural && (
          <BonoCulturalHub 
            group={group} 
            expenses={expenses} 
            onToggleJustified={handleToggleTicketUploaded} 
          />
        )}

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

              {/* Reminders + CSV/JSON Exports */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-light)', paddingTop: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
                <button
                  onClick={handleSendReminders}
                  disabled={sendingReminders}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', opacity: sendingReminders ? 0.6 : 1 }}
                  title="Enviar recordatorios de pagos pendientes"
                >
                  {sendingReminders ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                  {sendingReminders ? 'Enviando...' : 'Recordatorios'}
                </button>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button onClick={handleExportCSV} style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileSpreadsheet size={14} /> Exportar CSV
                  </button>
                  <span style={{ color: 'var(--border-light)' }}>|</span>
                  <button onClick={handleExportJSON} style={{ background: 'transparent', border: 'none', color: 'var(--accent-secondary)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FileCode size={14} /> Exportar JSON
                  </button>
                </div>
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
                  const isExpenseFullySettled = expense.splits.length > 0 && expense.splits.every(s => s.isPaid || isPayerOnly(s.userId));

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
                                {group.isBonoCultural ? (
                                  expense.ticketUploaded ? (
                                    <span className={styles.settlementBadge} style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>Ticket Justificado</span>
                                  ) : (
                                    <span className={styles.settlementBadge} style={{ backgroundColor: 'var(--danger-light)', color: 'var(--danger)' }}>Ticket Pendiente</span>
                                  )
                                ) : (
                                  expense.isSettlement ? (
                                    <span className={styles.settlementBadge}>Liquidación</span>
                                  ) : isExpenseFullySettled ? (
                                    <span className={styles.settlementBadge} style={{ backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>Saldado</span>
                                  ) : (
                                    <span className={styles.settlementBadge} style={{ backgroundColor: '#FDF5E6', color: '#D48C45' }}>Pendiente</span>
                                  )
                                )}

                                {expense.paymentMethod && expense.paymentMethod !== 'cash' && (
                                  <span className={styles.settlementBadge} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                    {expense.paymentMethod.toUpperCase()}
                                  </span>
                                )}

                                {expense.receiptImageUrl && (
                                  <span className={styles.settlementBadge} style={{ backgroundColor: 'rgba(200, 122, 83, 0.08)', color: 'var(--accent-primary)' }}>
                                    📎 Recibo
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
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button
                              className={styles.deleteBtn}
                              onClick={() => { setEditingExpense(expense); setIsAddModalOpen(true); }}
                              title="Editar gasto"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className={styles.deleteBtn}
                              onClick={(e) => handleDeleteExpense(e, expense.id)}
                              title="Eliminar gasto"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
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

        {/* Tab 4: Google Docs Document Board */}
        {activeTab === 'notas' && (
          <section className="animate-fade-in">
            <GroupDocument
              groupId={groupId}
              expenses={expenses}
              members={members}
              currency={group?.currency}
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

            {/* ── Cover Image Section ──────────────────────────────────────── */}
            <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid var(--border-light)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <ImageIcon size={16} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>Imagen de Portada</span>
              </div>

              {/* Preview area / drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setCoverDragOver(true); }}
                onDragLeave={() => setCoverDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setCoverDragOver(false);
                  const dropped = e.dataTransfer.files[0];
                  if (dropped) handleCoverFileChange(dropped);
                }}
                style={{
                  position: 'relative',
                  height: '140px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px dashed ${coverDragOver ? 'var(--accent-primary)' : 'var(--border-light)'}`,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s ease',
                  backgroundColor: coverDragOver ? 'rgba(200,122,83,0.05)' : 'var(--bg-secondary)',
                }}
                onClick={() => document.getElementById('cover-file-input')?.click()}
                title="Haz clic o arrastra una imagen"
              >
                {coverPreview ? (
                  <>
                    <img
                      src={coverPreview}
                      alt="Portada del grupo"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%)',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '10px 12px',
                      gap: '6px',
                    }}>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                        {coverFile ? 'Nueva imagen seleccionada' : 'Imagen de portada actual'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', pointerEvents: 'none' }}>
                    <Upload size={28} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Arrastra o haz clic para subir</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.7 }}>JPG, PNG, WebP · Máx. 5 MB</span>
                  </div>
                )}
              </div>

              <input
                id="cover-file-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCoverFileChange(f);
                  e.target.value = ''; // reset so same file can be re-selected
                }}
              />

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                {coverFile && (
                  <button
                    type="button"
                    onClick={handleUploadCover}
                    disabled={uploadingCover}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '9px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {uploadingCover ? (
                      <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
                    ) : (
                      <><Upload size={14} /> Subir imagen</>
                    )}
                  </button>
                )}
                {(group.coverImageUrl && !coverFile) && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="btn btn-secondary"
                    style={{ flex: 1, padding: '9px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: '#e57373', borderColor: '#e57373' }}
                  >
                    <X size={14} /> Eliminar portada
                  </button>
                )}
                {coverFile && (
                  <button
                    type="button"
                    onClick={() => { setCoverFile(null); setCoverPreview(group.coverImageUrl || null); }}
                    className="btn btn-secondary"
                    style={{ padding: '9px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    title="Cancelar selección"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
            {/* ────────────────────────────────────────────────────────────── */}

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

              {/* Target Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Fecha y Hora del Viaje / Evento (Opcional)
                </label>
                <input
                  type="datetime-local"
                  value={settingsTargetDate}
                  onChange={(e) => setSettingsTargetDate(e.target.value)}
                  style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.85rem', outline: 'none', backgroundColor: 'var(--bg-primary)', fontFamily: 'inherit', cursor: 'pointer' }}
                />
              </div>

              {/* Budget Limit Config */}
              {!group.isBonoCultural ? (
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
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>Presupuesto del Bono</span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Fijado automáticamente en 400.00€ con límites específicos de categorías.</span>
                </div>
              )}

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

            {/* Manage Members Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Gestionar Miembros ({members.length})
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {members.map((member) => {
                  const isMemberCreator = group.creatorId ? group.creatorId === member.id : group.members[0] === member.id;
                  const isSelf = member.id === currentUser?.id;
                  return (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: member.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.85rem', fontWeight: 700 }}>
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {member.username} {isSelf && '(Tú)'}
                          </span>
                          {isMemberCreator && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '2px' }}>
                              Creador
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Actions for Group Creator */}
                      {isCreator && !isMemberCreator && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleTransferOwnership(member.id, member.username)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', backgroundColor: 'transparent' }}
                            title="Hacer creador de este grupo"
                          >
                            Hacer Creador
                          </button>
                          <button
                            type="button"
                            onClick={() => handleKickMember(member.id, member.username)}
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'var(--danger)', color: 'var(--danger)', backgroundColor: 'transparent' }}
                            title="Expulsar del grupo"
                          >
                            Expulsar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Danger Zone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', borderTop: '1px solid #FFC9C9', backgroundColor: 'rgba(255, 0, 0, 0.01)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Zona de Peligro
              </span>
              {isCreator ? (
                <>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Al eliminar este grupo, se borrará definitivamente toda la información, incluyendo los gastos, balances, notas e imágenes asociadas. Esta acción requiere verificación por correo.
                  </p>
                  
                  <button
                    type="button"
                    disabled={requestingDelete}
                    onClick={handleDeleteGroup}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderColor: 'var(--danger)',
                      color: 'var(--danger)',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginTop: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {requestingDelete ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Solicitando...
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} /> Eliminar Grupo
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                    Si abandonas este grupo, dejarás de tener acceso a los gastos compartidos, balances y notas. No podrás volver a unirte a menos que te vuelvan a invitar.
                  </p>
                  
                  <button
                    type="button"
                    disabled={leavingGroup}
                    onClick={handleLeaveGroup}
                    className="btn btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      borderColor: 'var(--danger)',
                      color: 'var(--danger)',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginTop: '8px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {leavingGroup ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Saliendo...
                      </>
                    ) : (
                      <>
                        <X size={14} /> Salir del Grupo
                      </>
                    )}
                  </button>
                </>
              )}
            </div>

            {/* Invite Info Box */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px', borderTop: '1px solid var(--border-light)', paddingTop: '20px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Invitar Miembros
              </span>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
                Comparte el código o envía el enlace de invitación directa:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

                <button
                  type="button"
                  onClick={() => setIsQRModalOpen(true)}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.8rem', fontWeight: 700, borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)', backgroundColor: 'transparent' }}
                >
                  <QrCode size={14} /> Mostrar Código QR de Invitación
                </button>

                {/* Email invitation form for creator */}
                {isCreator && (
                  <form onSubmit={handleSendEmailInvite} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-light)', paddingTop: '12px', marginTop: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>O invitar directamente por correo electrónico:</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="email"
                        placeholder="correo@ejemplo.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                        style={{ flex: 1, padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', fontSize: '0.82rem', outline: 'none', backgroundColor: 'var(--bg-primary)' }}
                      />
                      <button
                        type="submit"
                        disabled={sendingInvite}
                        className="btn btn-primary"
                        style={{ padding: '9px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        {sendingInvite ? <Loader2 size={14} className="animate-spin" /> : null}
                        {sendingInvite ? 'Enviando...' : 'Invitar'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
      </div>
      </div>

      {/* Floating Action Button */}
      {activeTab === 'gastos' && (
        <button
          className={styles.fab}
          onClick={() => { setEditingExpense(null); setIsAddModalOpen(true); }}
          title="Añadir gasto"
        >
          <Plus size={24} />
        </button>
      )}

      {/* Modal Add / Edit Expense */}
      {currentUser && (
        <AddExpenseWizard
          isOpen={isAddModalOpen}
          onClose={() => { setIsAddModalOpen(false); setEditingExpense(null); }}
          members={members}
          currentUserId={currentUser.id}
          currency={group?.currency}
          onAddExpense={handleAddExpense}
          onUpdateExpense={handleUpdateExpense}
          editingExpense={editingExpense}
          isBonoCultural={group?.isBonoCultural}
        />
      )}

      {/* PWA Prompt */}
      <PwaPrompt />

      {/* Toast */}
      {toastMsg && <div className={styles.toast} style={{ position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)', padding: '12px 24px', borderRadius: 'var(--radius-full)', fontSize: '0.85rem', fontWeight: 500, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', zIndex: 100 }}>{toastMsg}</div>}

      {/* Printable Invoice PDF */}
      {group && members.length > 0 && (
        <PrintableInvoice
          group={group}
          expenses={expenses}
          members={members}
        />
      )}

      {group && (
        <QRInviteModal
          isOpen={isQRModalOpen}
          onClose={() => setIsQRModalOpen(false)}
          inviteCode={group.inviteCode}
          groupName={group.name}
        />
      )}
    </>
  );
}
