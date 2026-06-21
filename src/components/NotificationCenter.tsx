'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Trash2, CheckCheck, Settings, X, Receipt, HandCoins, BellRing, Loader2 } from 'lucide-react';
import type { Notification } from '@/types/notification';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function formatTime(dateString: string) {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  } catch {
    return '';
  }
}

export default function NotificationCenter() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [loadingPush, setLoadingPush] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetchNotifications();
    checkPushSubscription();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  const checkPushSubscription = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      setPermissionState(window.Notification.permission);
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        setIsPushEnabled(!!subscription);
      }
    } catch (err) {
      console.error('Error checking push subscription status:', err);
    }
  };

  const togglePushNotifications = async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Las notificaciones Push no están soportadas en este navegador o dispositivo.');
      return;
    }

    if (window.Notification.permission === 'denied') {
      alert('Las notificaciones están bloqueadas en tu navegador para este sitio. Por favor, habilítalas haciendo clic en el icono de candado a la izquierda de la dirección URL en la barra del navegador.');
      return;
    }

    setLoadingPush(true);
    try {
      console.log('Registering/getting Service Worker...');
      const registration = await navigator.serviceWorker.register('/sw.js');

      if (!registration) {
        throw new Error('El registro del Service Worker en el navegador falló o retornó vacío.');
      }

      const existingSubscription = await registration.pushManager.getSubscription();

      if (existingSubscription) {
        // Unsubscribe
        await existingSubscription.unsubscribe();
        
        // Notify API
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: existingSubscription.endpoint }),
        });

        setIsPushEnabled(false);
      } else {
        // Request Permission if needed
        const permission = await window.Notification.requestPermission();
        setPermissionState(permission);

        if (permission !== 'granted') {
          alert('Permiso de notificaciones denegado. Por favor, habilítalas en la configuración de tu navegador.');
          setLoadingPush(false);
          return;
        }

        // Fetch Public VAPID key
        const vapidRes = await fetch('/api/notifications/vapid-public-key');
        if (!vapidRes.ok) throw new Error('No se pudo obtener la clave VAPID pública.');
        const { publicKey } = await vapidRes.json();

        if (!publicKey) {
          throw new Error('La clave VAPID pública está vacía.');
        }

        // Subscribe
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // Save in DB
        await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription }),
        });

        setIsPushEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling push notifications:', err);
      alert(`Error al configurar las notificaciones: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoadingPush(false);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
    );
    setIsOpen(false);

    try {
      // Mark as read in API
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notif.id }),
      });
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }

    // Navigate to link
    router.push(notif.link);
  };

  const handleMarkAllRead = async () => {
    // Optimistic UI
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      fetchNotifications(); // rollback
    }
  };

  const handleClearAll = async () => {
    setNotifications([]);

    try {
      await fetch('/api/notifications', {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Error clearing notifications:', err);
      fetchNotifications(); // rollback
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: 'var(--radius-full)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: isOpen ? 'var(--accent-primary)' : 'var(--text-secondary)',
          transition: 'var(--transition-smooth)',
          position: 'relative',
        }}
        title="Notificaciones"
        className="nav-bell-btn"
      >
        <Bell size={22} style={{ transform: isOpen ? 'scale(1.1)' : 'scale(1)' }} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: 'var(--danger)',
              color: '#FFFFFF',
              fontSize: '0.65rem',
              fontWeight: 800,
              borderRadius: 'var(--radius-full)',
              minWidth: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: '2px solid var(--bg-primary)',
              animation: 'pulseBadge 2s infinite',
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '45px',
            right: '0',
            width: '360px',
            maxHeight: '480px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'dropdownFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'between',
              width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Notificaciones
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: '#FFFFFF',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {unreadCount} nuevas
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    title="Marcar todo como leído"
                  >
                    <CheckCheck size={14} />
                  </button>
                  <button
                    onClick={handleClearAll}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                      borderRadius: 'var(--radius-sm)',
                    }}
                    title="Limpiar historial"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Push Toggle Control */}
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: 'var(--bg-secondary)',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Settings size={14} style={{ color: 'var(--text-secondary)' }} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Push en este dispositivo
              </span>
            </div>
            <button
              onClick={togglePushNotifications}
              disabled={loadingPush}
              style={{
                border: 'none',
                backgroundColor: isPushEnabled ? 'var(--success-light)' : 'rgba(200, 122, 83, 0.08)',
                color: isPushEnabled ? 'var(--success)' : 'var(--accent-primary)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.7rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'var(--transition-smooth)',
              }}
            >
              {loadingPush ? (
                <Loader2 size={12} className="animate-spin" />
              ) : isPushEnabled ? (
                <>Activo</>
              ) : (
                <>Activar</>
              )}
            </button>
          </div>

          {/* List Area */}
          <div style={{ overflowY: 'auto', flex: 1, minHeight: '120px', maxHeight: '350px' }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    backgroundColor: 'rgba(200, 122, 83, 0.05)',
                    padding: '12px',
                    borderRadius: 'var(--radius-full)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <BellRing size={24} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Todo al día
                  </span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    No tienes notificaciones por el momento.
                  </span>
                </div>
              </div>
            ) : (
              notifications.map((notif) => {
                const isExpense = notif.type === 'expense';
                const isSettlement = notif.type === 'settlement';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-light)',
                      display: 'flex',
                      alignItems: 'start',
                      gap: '12px',
                      cursor: 'pointer',
                      backgroundColor: notif.isRead ? 'transparent' : 'rgba(200, 122, 83, 0.02)',
                      transition: 'var(--transition-smooth)',
                    }}
                    className="notification-item"
                  >
                    {/* Icon Type Wrapper */}
                    <div
                      style={{
                        backgroundColor: isSettlement
                          ? 'var(--success-light)'
                          : isExpense
                          ? 'rgba(200, 122, 83, 0.06)'
                          : 'var(--bg-secondary)',
                        color: isSettlement
                          ? 'var(--success)'
                          : isExpense
                          ? 'var(--accent-primary)'
                          : 'var(--text-secondary)',
                        padding: '8px',
                        borderRadius: 'var(--radius-full)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '2px',
                      }}
                    >
                      {isSettlement ? <HandCoins size={16} /> : <Receipt size={16} />}
                    </div>

                    {/* Text Area */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: notif.isRead ? 600 : 800,
                          color: 'var(--text-primary)',
                        }}
                      >
                        {notif.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          lineHeight: '1.3',
                        }}
                      >
                        {notif.message}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>

                    {/* Unread indicator */}
                    {!notif.isRead && (
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          backgroundColor: 'var(--accent-primary)',
                          borderRadius: 'var(--radius-full)',
                          marginTop: '6px',
                        }}
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Styled badge animation & item hover class */}
      <style jsx global>{`
        @keyframes pulseBadge {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        @keyframes dropdownFadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .nav-bell-btn:hover {
          background-color: var(--bg-secondary) !important;
        }
        .notification-item:hover {
          background-color: var(--bg-secondary) !important;
        }
      `}</style>
    </div>
  );
}
