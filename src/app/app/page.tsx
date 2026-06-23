'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, UserPlus, ChevronRight, Users, Loader2, Archive, QrCode } from 'lucide-react';
import type { Group, User } from '@/types';
import NotificationCenter from '@/components/NotificationCenter';
import QRScannerModal from '@/components/QRScannerModal';
import PremiumLoader from '@/components/PremiumLoader';
import { offlineDb } from '@/lib/offline-db';
import styles from './page.module.css';

function getMiniCountdown(targetStr: string): string {
  try {
    const hasTime = targetStr.includes('T');
    const target = new Date(hasTime ? targetStr : targetStr + 'T00:00:00');
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'En marcha 🎉';
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `Faltan ${days}d ${hours}h`;
    }
    if (hours > 0) {
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      return `Faltan ${hours}h ${mins}m`;
    }
    const mins = Math.floor(diffMs / (1000 * 60));
    return `Faltan ${mins}m`;
  } catch {
    return '';
  }
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(true);
  
  // Total balances calculated across all groups
  const [totalOwedToMe, setTotalOwedToMe] = useState(0);
  const [totalIOwe, setTotalIOwe] = useState(0);

  // Track whether we're showing cached (offline) data
  const [isShowingCachedData, setIsShowingCachedData] = useState(false);

  // Tabs for quick actions: 'create' | 'join'
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Form fields
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isBonoCreation, setIsBonoCreation] = useState(false);
  const [bonoActivationDate, setBonoActivationDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Edit Profile States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatarColor, setEditAvatarColor] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Group Archiving States
  const [showArchived, setShowArchived] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Verify Authentication & Fetch Groups in Parallel
      const [userRes, groupsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/groups')
      ]);

      if (!userRes.ok) {
        router.replace('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData);

      let groupsData: (Group & { userNetBalance?: number })[];
      let showingCached = false;

      if (!groupsRes.ok || groupsRes.status === 503) {
        // Offline or server error: try IndexedDB cache
        const cached = await offlineDb.cache.getGroups<Group>();
        if (cached) {
          groupsData = cached;
          showingCached = true;
        } else {
          throw new Error('Error al cargar grupos');
        }
      } else {
        groupsData = await groupsRes.json();
        // Persist fresh data to IndexedDB for future offline use
        await offlineDb.cache.saveGroups(groupsData);
        showingCached = false;
      }

      setGroups(groupsData);
      setIsShowingCachedData(showingCached);

      // Main dashboard screen ready
      setLoading(false);

      // 2. Read pre-calculated balances from groups data, eliminating N sub-fetches
      setBalancesLoading(true);
      let owed = 0;
      let owe = 0;

      groupsData.forEach((grp) => {
        const myNet = grp.userNetBalance || 0;
        if (myNet > 0) {
          owed += myNet;
        } else if (myNet < 0) {
          owe += Math.abs(myNet);
        }
      });

      setTotalOwedToMe(owed);
      setTotalIOwe(owe);
    } catch (e) {
      console.error(e);
      showToast('Error de conexión al cargar datos.');
    } finally {
      setLoading(false);
      setBalancesLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
    setBonoActivationDate(new Date().toISOString().split('T')[0]);
  }, [fetchDashboardData]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditUsername(user.username);
      setEditEmail(user.email);
      setEditAvatarColor(user.avatarColor);
      setEditPassword('');
    }
  }, [user, isProfileModalOpen]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editUsername,
          email: editEmail,
          avatarColor: editAvatarColor,
          password: editPassword || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar perfil');
      }

      showToast('¡Perfil actualizado con éxito!');
      setIsProfileModalOpen(false);
      await fetchDashboardData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar perfil');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleToggleArchiveGroup = async (e: React.MouseEvent, group: Group) => {
    e.stopPropagation();
    if (!user) return;

    const isArchived = group.archivedBy?.includes(user.id);
    const updatedArchivedBy = isArchived
      ? (group.archivedBy || []).filter(id => id !== user.id)
      : [...(group.archivedBy || []), user.id];

    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archivedBy: updatedArchivedBy }),
      });

      if (!res.ok) {
        throw new Error('No se pudo archivar el grupo');
      }

      showToast(isArchived ? 'Grupo desarchivado.' : 'Grupo archivado.');
      await fetchDashboardData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al cambiar archivo del grupo');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
      router.refresh();
    } catch {
      showToast('Error al cerrar sesión.');
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalGroupName = isBonoCreation ? (groupName || 'Mi Bono Cultural Joven') : groupName;
    if (!finalGroupName) return;

    setActionLoading(true);
    try {
      let targetDate: string | undefined = undefined;
      if (isBonoCreation && bonoActivationDate) {
        const targetDateObj = new Date(bonoActivationDate + 'T00:00:00');
        targetDateObj.setFullYear(targetDateObj.getFullYear() + 1);
        targetDate = targetDateObj.toISOString().split('T')[0];
      }

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: finalGroupName,
          description: isBonoCreation ? (groupDesc || 'Control de saldo de 400€') : groupDesc,
          isBonoCultural: isBonoCreation,
          targetDate
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear grupo');
      }

      setGroupName('');
      setGroupDesc('');
      setIsBonoCreation(false);
      showToast(isBonoCreation ? '¡Rastreador de Bono Cultural creado!' : '¡Grupo creado con éxito!');
      await fetchDashboardData();
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al crear grupo');
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al unirse al grupo');
      }

      setInviteCode('');
      showToast('¡Te has unido al grupo!');
      await fetchDashboardData();
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al unirse al grupo');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScanSuccess = async (scannedCode: string) => {
    setInviteCode(scannedCode);
    setIsScannerOpen(false);
    
    setActionLoading(true);
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: scannedCode }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al unirse al grupo');
      }

      setInviteCode('');
      showToast('¡Te has unido al grupo con código QR!');
      await fetchDashboardData();
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al unirse al grupo');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <PremiumLoader text="Cargando tu cuenta" />;
  }

  const userInitial = user?.username ? user.username.charAt(0) : '?';

  return (
    <>
      <div className={`${styles.dashboard} page-transition-enter`}>
      {/* Cached data notice */}
      {isShowingCachedData && (
        <div style={{
          background: 'rgba(200, 122, 83, 0.08)',
          borderBottom: '1px solid rgba(200, 122, 83, 0.2)',
          padding: '8px 16px',
          fontSize: '0.75rem',
          color: 'var(--accent-primary)',
          fontWeight: 600,
          textAlign: 'center',
        }}>
          📦 Mostrando datos guardados localmente
        </div>
      )}
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.brandName}>Div<span>vy</span></h1>
        </div>
        <div className={styles.userMenu}>
          <NotificationCenter />
          <button
            onClick={() => setIsProfileModalOpen(true)}
            title="Editar perfil"
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div className={styles.avatar} style={{ backgroundColor: user?.avatarColor || 'var(--accent-primary)' }}>
              {userInitial}
            </div>
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Cerrar sesión">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className={styles.mainContent}>
        {/* Welcome */}
        <section className={styles.welcomeSection}>
          <h2>Hola, {user?.username}</h2>
          <p>Lleva el control de tus gastos compartidos de forma clara.</p>
        </section>

        {/* Balance summary */}
        <section className={styles.balanceBoard}>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>Te deben</span>
            {balancesLoading ? (
              <span className="shimmer" style={{ display: 'block', width: '80px', height: '28px', borderRadius: 'var(--radius-sm)', marginTop: '8px' }} />
            ) : (
              <span className={`${styles.balanceValue} ${totalOwedToMe > 0 ? styles.positive : ''}`}>
                {totalOwedToMe.toFixed(2)}€
              </span>
            )}
          </div>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>Debes</span>
            {balancesLoading ? (
              <span className="shimmer" style={{ display: 'block', width: '80px', height: '28px', borderRadius: 'var(--radius-sm)', marginTop: '8px' }} />
            ) : (
              <span className={`${styles.balanceValue} ${totalIOwe > 0 ? styles.negative : ''}`}>
                {totalIOwe.toFixed(2)}€
              </span>
            )}
          </div>
        </section>

        {/* Groups */}
        <section>
          <div className={styles.sectionTitle}>
            <span>{showArchived ? 'Grupos Archivados' : 'Mis Grupos'}</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setShowArchived(!showArchived)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Archive size={14} /> {showArchived ? 'Ver Activos' : 'Ver Archivados'}
              </button>
              <Users size={18} style={{ color: 'var(--text-secondary)' }} />
            </div>
          </div>

          <div className={styles.groupsGrid}>
            {groups && (groups.filter(group => showArchived ? group.archivedBy?.includes(user?.id || '') : !group.archivedBy?.includes(user?.id || '')).length > 0) ? (
              groups
                .filter(group => showArchived ? group.archivedBy?.includes(user?.id || '') : !group.archivedBy?.includes(user?.id || ''))
                .map((group) => (
                  <div
                    key={group.id}
                    className={styles.groupCard}
                    onClick={() => router.push(`/group/${group.id}`)}
                    style={{ position: 'relative', gap: '14px' }}
                  >
                    {group.coverImageUrl && (
                      <div style={{
                        width: '56px',
                        height: '40px',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        boxShadow: 'var(--shadow-tactile)',
                      }}>
                        <img
                          src={group.coverImageUrl}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                      <div className={styles.groupInfo}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className={styles.groupName}>{group.name}</span>
                        {group.isBonoCultural && (
                          <span 
                            style={{ 
                              fontSize: '0.62rem', 
                              backgroundColor: 'rgba(230,175,46,0.12)', 
                              color: '#D49500', 
                              border: '1px solid rgba(230,175,46,0.25)', 
                              padding: '2px 6px', 
                              borderRadius: '4px', 
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px'
                            }}
                          >
                            🎟️ Bono Cultural
                          </span>
                        )}
                      </div>
                      {group.description && <span className={styles.groupDesc}>{group.description}</span>}
                      <div className={styles.groupMeta}>
                        <span className={styles.memberBadge}>
                          <Users size={12} /> {group.members.length} {group.members.length === 1 ? 'miembro' : 'miembros'}
                        </span>
                        <span>• Cód: {group.inviteCode}</span>
                      </div>
                      {group.targetDate && (
                        <div
                          style={{
                            marginTop: '8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            backgroundColor: 'rgba(200, 122, 83, 0.05)',
                            border: '1px dashed rgba(200, 122, 83, 0.2)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: 'var(--accent-primary)',
                            width: 'fit-content'
                          }}
                        >
                          <span style={{ animation: 'pulseBadge 2s infinite', fontSize: '0.8rem' }}>⏳</span>
                          <span>{getMiniCountdown(group.targetDate)}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={(e) => handleToggleArchiveGroup(e, group)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={group.archivedBy?.includes(user?.id || '') ? "Desarchivar grupo" : "Archivar grupo"}
                      >
                        <Archive size={16} style={{ color: group.archivedBy?.includes(user?.id || '') ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                      </button>
                      <ChevronRight className={styles.chevron} size={20} />
                    </div>
                  </div>
                  </div>
                ))
            ) : (
              <div className={styles.emptyState}>
                <Users size={32} style={{ color: 'var(--text-muted)' }} />
                <p>No tienes ningún grupo todavía.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '-6px' }}>Crea un grupo para tu próximo viaje o cena, o únete a uno existente.</p>
              </div>
            )}
          </div>
        </section>

      </main>
      </div>

      {/* Profile Edit Modal */}
      {isProfileModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsProfileModalOpen(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '400px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Editar Perfil</h2>
            
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nombre de Usuario</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Correo Electrónico</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nueva Contraseña (Dejar en blanco para mantener)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', outline: 'none', fontSize: '0.85rem' }}
                />
              </div>

              <div className={styles.inputGroup}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Color de Avatar</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {['#C87A53', '#4A5D4E', '#5C768D', '#BCA374', '#8A7B9F', '#3A3F47'].map(color => (
                     <button
                       key={color}
                       type="button"
                       onClick={() => setEditAvatarColor(color)}
                       style={{
                         width: '32px',
                         height: '32px',
                         borderRadius: '50%',
                         backgroundColor: color,
                         border: editAvatarColor === color ? '2px solid var(--text-primary)' : '2px solid transparent',
                         cursor: 'pointer',
                         transform: editAvatarColor === color ? 'scale(1.1)' : 'scale(1)',
                         transition: 'transform 0.2s ease',
                       }}
                     />
                  ))}
                </div>
              </div>



              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: 'none', backgroundColor: 'var(--accent-primary)', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}
                  disabled={profileLoading}
                >
                  {profileLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && <div className={styles.toast}>{toastMsg}</div>}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        title="Crear o unirse a un grupo"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent-primary)',
          color: '#FFFFFF',
          border: 'none',
          boxShadow: '0 4px 16px rgba(200, 122, 83, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999, /* High z-index to stay above other page elements */
        }}
      >
        <Plus size={28} />
      </button>

      {/* Create/Join Modal */}
      {isCreateModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            style={{
              width: '90%',
              maxWidth: '450px',
              backgroundColor: 'var(--bg-card)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px',
              boxShadow: 'var(--shadow-lg)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Crear o Unirse a un Grupo</h2>
            
            <div className={styles.actionTabs} style={{ marginTop: '8px', marginBottom: '8px' }}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'create' ? styles.active : ''}`}
                onClick={() => setActiveTab('create')}
              >
                Nuevo Grupo
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'join' ? styles.active : ''}`}
                onClick={() => setActiveTab('join')}
              >
                Unirse con Código
              </button>
            </div>

            {activeTab === 'create' ? (
              <form onSubmit={handleCreateGroup} className={styles.actionForm}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBonoCreation(false);
                      if (groupName === 'Mi Bono Cultural Joven') setGroupName('');
                    }}
                    style={{
                      padding: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: !isBonoCreation ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: !isBonoCreation ? '#FFF' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    Grupo Estándar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsBonoCreation(true);
                      if (!groupName) setGroupName('Mi Bono Cultural Joven');
                    }}
                    style={{
                      padding: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-light)',
                      backgroundColor: isBonoCreation ? 'var(--accent-primary)' : 'var(--bg-secondary)',
                      color: isBonoCreation ? '#FFF' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                  >
                    🎟️ Bono Cultural
                  </button>
                </div>

                <div className={styles.inputGroup}>
                  <label htmlFor="modalGroupName">
                    {isBonoCreation ? 'Nombre de tu Bono' : 'Nombre del Grupo/Viaje'}
                  </label>
                  <input
                    id="modalGroupName"
                    type="text"
                    placeholder={isBonoCreation ? "Ej. Mi Bono Cultural 2026" : "Ej. Viaje a Japón 2026"}
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                  />
                </div>

                {isBonoCreation ? (
                  <div className={styles.inputGroup} style={{ animation: 'fadeIn 0.2s ease' }}>
                    <label htmlFor="modalBonoActivationDate">Fecha de activación de la tarjeta</label>
                    <input
                      id="modalBonoActivationDate"
                      type="date"
                      value={bonoActivationDate}
                      onChange={(e) => setBonoActivationDate(e.target.value)}
                      required
                    />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.2 }}>
                      Se usará para calcular exactamente el plazo límite de 12 meses para consumir el saldo.
                    </span>
                  </div>
                ) : (
                  <div className={styles.inputGroup}>
                    <label htmlFor="modalGroupDesc">Descripción (Opcional)</label>
                    <input
                      id="modalGroupDesc"
                      type="text"
                      placeholder="Ej. Gastos compartidos de las vacaciones"
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.actionSubmitBtn}
                    style={{ flex: 1 }}
                    disabled={actionLoading}
                  >
                    <Plus size={18} />
                    {actionLoading ? 'Creando...' : 'Crear'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleJoinGroup} className={styles.actionForm}>
                <div className={styles.inputGroup}>
                  <label htmlFor="modalInviteCode">Código de Invitación</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      id="modalInviteCode"
                      type="text"
                      placeholder="Ej. A1B2C3D4"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      required
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => setIsScannerOpen(true)}
                      style={{
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        transition: 'var(--transition-smooth)'
                      }}
                      title="Escanear Código QR"
                    >
                      <QrCode size={18} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className={styles.actionSubmitBtn}
                    style={{ flex: 1 }}
                    disabled={actionLoading}
                  >
                    <UserPlus size={18} />
                    {actionLoading ? 'Uniéndose...' : 'Unirse'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </>
  );
}
