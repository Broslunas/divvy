'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Plus, UserPlus, ChevronRight, Users, Loader2, Archive, Bell } from 'lucide-react';
import { calculateBalances } from '@/lib/settlement';
import type { Group, User } from '@/types';
import styles from './page.module.css';
import NotificationCenter from '@/components/NotificationCenter';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Total balances calculated across all groups
  const [totalOwedToMe, setTotalOwedToMe] = useState(0);
  const [totalIOwe, setTotalIOwe] = useState(0);

  // Tabs for quick actions: 'create' | 'join'
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Form fields
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Edit Profile States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAvatarColor, setEditAvatarColor] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editNotifications, setEditNotifications] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Group Archiving States
  const [showArchived, setShowArchived] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Verify Authentication
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.replace('/login');
        return;
      }
      const userData = await userRes.json();
      setUser(userData);

      // 2. Fetch Groups
      const groupsRes = await fetch('/api/groups');
      if (!groupsRes.ok) {
        throw new Error('Error al cargar grupos');
      }
      const groupsData = await groupsRes.json();
      setGroups(groupsData);

      // 3. Fetch detailed balances for all groups
      let owed = 0;
      let owe = 0;

      await Promise.all(
        groupsData.map(async (grp: Group) => {
          const detailRes = await fetch(`/api/groups/${grp.id}`);
          if (detailRes.ok) {
            const { members, expenses } = await detailRes.json();
            const memberIds = members.map((m: { id: string }) => m.id);
            const { balances } = calculateBalances(memberIds, expenses);
            
            const myNet = balances[userData.id] || 0;
            if (myNet > 0) {
              owed += myNet;
            } else if (myNet < 0) {
              owe += Math.abs(myNet);
            }
          }
        })
      );

      setTotalOwedToMe(owed);
      setTotalIOwe(owe);
    } catch (e) {
      console.error(e);
      showToast('Error de conexión al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditUsername(user.username);
      setEditEmail(user.email);
      setEditAvatarColor(user.avatarColor);
      setEditPassword('');
      setEditNotifications(user.notificationsEnabled ?? false);
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
          notificationsEnabled: editNotifications,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar perfil');
      }

      showToast('¡Perfil actualizado con éxito!');
      setIsProfileModalOpen(false);
      window.dispatchEvent(new Event('notifications-toggle'));
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
    if (!groupName) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, description: groupDesc }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al crear grupo');
      }

      setGroupName('');
      setGroupDesc('');
      showToast('¡Grupo creado con éxito!');
      await fetchDashboardData();
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
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al unirse al grupo');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.dashboard} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Loader2 className="animate-spin" size={32} style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  const userInitial = user?.username ? user.username.charAt(0) : '?';

  return (
    <div className={`${styles.dashboard} animate-fade-in`}>
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
            <span className={`${styles.balanceValue} ${totalOwedToMe > 0 ? styles.positive : ''}`}>
              {totalOwedToMe.toFixed(2)}€
            </span>
          </div>
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>Debes</span>
            <span className={`${styles.balanceValue} ${totalIOwe > 0 ? styles.negative : ''}`}>
              {totalIOwe.toFixed(2)}€
            </span>
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
                    style={{ position: 'relative' }}
                  >
                    <div className={styles.groupInfo}>
                      <span className={styles.groupName}>{group.name}</span>
                      {group.description && <span className={styles.groupDesc}>{group.description}</span>}
                      <div className={styles.groupMeta}>
                        <span className={styles.memberBadge}>
                          <Users size={12} /> {group.members.length} {group.members.length === 1 ? 'miembro' : 'miembros'}
                        </span>
                        <span>• Cód: {group.inviteCode}</span>
                      </div>
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

        {/* Actions panel */}
        <section className={styles.quickActions}>
          <div className={styles.actionTabs}>
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
              <div className={styles.inputGroup}>
                <label htmlFor="groupName">Nombre del Grupo/Viaje</label>
                <input
                  id="groupName"
                  type="text"
                  placeholder="Ej. Viaje a Japón 2026"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="groupDesc">Descripción (Opcional)</label>
                <input
                  id="groupDesc"
                  type="text"
                  placeholder="Ej. Gastos compartidos de las vacaciones"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                />
              </div>
              <button type="submit" className={styles.actionSubmitBtn} disabled={actionLoading}>
                <Plus size={18} />
                {actionLoading ? 'Creando...' : 'Crear Grupo'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinGroup} className={styles.actionForm}>
              <div className={styles.inputGroup}>
                <label htmlFor="inviteCode">Código de Invitación</label>
                <input
                  id="inviteCode"
                  type="text"
                  placeholder="Ej. A1B2C3D4"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <button type="submit" className={styles.actionSubmitBtn} disabled={actionLoading}>
                <UserPlus size={18} />
                {actionLoading ? 'Uniéndose...' : 'Unirse al Grupo'}
              </button>
            </form>
          )}
        </section>
      </main>

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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={16} style={{ color: editNotifications ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notificaciones</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditNotifications(!editNotifications)}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: editNotifications ? 'var(--accent-primary)' : 'var(--border-light)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    left: editNotifications ? '22px' : '2px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#FFF',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }} />
                </button>
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
    </div>
  );
}
