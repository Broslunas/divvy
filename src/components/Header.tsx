'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Coins, LogOut, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import type { User } from '@/types';
import NotificationCenter from '@/components/NotificationCenter';
import styles from './Header.module.css';

function HeaderContent() {
  const pathname = usePathname();
  const router = useRouter();

  const leftPortalRef = useRef<HTMLDivElement>(null);
  const [hasLeftContent, setHasLeftContent] = useState<boolean>(false);

  useEffect(() => {
    const portal = leftPortalRef.current;
    if (!portal) return;

    const checkContent = () => {
      setHasLeftContent(portal.children.length > 0);
    };

    checkContent();

    const observer = new MutationObserver(checkContent);
    observer.observe(portal, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [pathname]);

  // Authentication & User States
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Edit Profile States
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [editUsername, setEditUsername] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editAvatarColor, setEditAvatarColor] = useState<string>('');
  const [editPassword, setEditPassword] = useState<string>('');
  const [profileSaving, setProfileSaving] = useState<boolean>(false);

  // General States
  const [toastMsg, setToastMsg] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Check Authentication status
  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        setIsAuthenticated(true);
        // Sync profile form states
        setEditUsername(userData.username);
        setEditEmail(userData.email);
        setEditAvatarColor(userData.avatarColor);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
    
    // Listen for external user updates (e.g. if updated from elsewhere, although now centralized)
    const handleUserUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<User>;
      setUser(customEvent.detail);
      setEditUsername(customEvent.detail.username);
      setEditEmail(customEvent.detail.email);
      setEditAvatarColor(customEvent.detail.avatarColor);
      setIsAuthenticated(true);
    };

    window.addEventListener('divvy-user-updated', handleUserUpdate);
    return () => window.removeEventListener('divvy-user-updated', handleUserUpdate);
  }, [pathname]);

  // Handle Profile Update submit
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUsername.trim() || !editEmail.trim()) {
      showToast('Por favor, completa los campos requeridos.');
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editUsername.trim(),
          email: editEmail.trim(),
          avatarColor: editAvatarColor,
          password: editPassword || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al actualizar perfil');
      }

      const updatedUser = await res.json();
      setUser(updatedUser);
      setIsProfileOpen(false);
      setEditPassword('');
      showToast('¡Perfil actualizado con éxito!');
      
      // Dispatch global event to sync pages (e.g., Dashboard welcoming message)
      window.dispatchEvent(new CustomEvent('divvy-user-updated', { detail: updatedUser }));
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error al actualizar perfil');
    } finally {
      setProfileSaving(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (!confirm('¿Estás seguro de que quieres cerrar sesión?')) return;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setIsAuthenticated(false);
      router.replace('/login');
      router.refresh();
    } catch {
      showToast('Error al cerrar sesión.');
    }
  };

  // Define route-specific mode
  const isAuthPath = pathname === '/login' || pathname === '/register';
  const userInitial = user?.username ? user.username.charAt(0) : '?';

  return (
    <>
      <header className={styles.headerContainer}>
        <div className={styles.headerInner}>
          
          {/* Left Slot: Logo or Custom Page Breadcrumb/Back injected via portal */}
          <div className={styles.brandArea}>
            <div ref={leftPortalRef} id="header-left-portal" className={styles.leftPortal}></div>
            {!hasLeftContent && (
              <div className={styles.defaultLogo}>
                <Link href={isAuthenticated ? "/app" : "/"} className={styles.brandLogo}>
                  <Coins size={28} className={styles.logoIcon} />
                  <div className={styles.logoTextContainer}>
                    <h1 className={styles.logoText}>Div<span>vy</span></h1>
                    <span className={styles.logoSubtitle}>gastos claros</span>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Right Section: Adaptive Navigation and User Controls */}
          <div className={styles.rightSection}>
            
            {/* Custom actions slot injected via portal */}
            <div id="header-actions-portal" className={styles.customActions}></div>

            {/* Authenticated Controls */}
            {isAuthenticated && !authLoading && (
              <>
                <NotificationCenter />
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className={styles.avatarWrapper}
                  title="Editar perfil"
                >
                  <div
                    className={styles.avatar}
                    style={{ backgroundColor: user?.avatarColor || 'var(--accent-primary)' }}
                  >
                    {userInitial}
                  </div>
                </button>
                <button
                  className={styles.logoutBtn}
                  onClick={handleLogout}
                  title="Cerrar sesión"
                >
                  <LogOut size={18} />
                </button>
              </>
            )}

            {/* Non-Authenticated Controls for Public Pages */}
            {!isAuthenticated && !authLoading && !isAuthPath && (
              <Link href="/app" className={styles.appBtn}>
                Acceder a la App
                <ArrowRight size={15} />
              </Link>
            )}

            {/* Back to Home Link for Login/Register Pages */}
            {!isAuthenticated && !authLoading && isAuthPath && (
              <Link href="/" className={styles.backLink}>
                <ArrowLeft size={15} />
                Inicio
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Global Profile Editing Modal */}
      {isProfileOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsProfileOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Editar Perfil</h2>
            
            <form onSubmit={handleUpdateProfile} className={styles.modalForm}>
              <div className={styles.inputGroup}>
                <label>Nombre de Usuario</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Correo Electrónico</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={styles.inputField}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Nueva Contraseña (dejar en blanco para mantener)</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className={styles.inputField}
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Color de Avatar</label>
                <div className={styles.colorPicker}>
                  {['#C87A53', '#4A5D4E', '#5C768D', '#BCA374', '#8A7B9F', '#3A3F47'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditAvatarColor(color)}
                      className={`${styles.colorOption} ${editAvatarColor === color ? styles.colorOptionActive : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className={styles.modalButtons}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(false)}
                  className={styles.cancelBtn}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={styles.saveBtn}
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Toast */}
      {toastMsg && <div className={styles.toast}>{toastMsg}</div>}
    </>
  );
}

export default function Header() {
  return (
    <Suspense fallback={<div className={styles.headerContainer} style={{ height: '64px' }} />}>
      <HeaderContent />
    </Suspense>
  );
}
