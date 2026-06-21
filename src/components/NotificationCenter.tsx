'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, X, Check, CreditCard, RefreshCw, UserPlus, CheckCircle, Trash2, Loader2 } from 'lucide-react';
import type { Notification } from '@/types';

function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return 'ahora mismo';
    if (diffMin < 60) return `hace ${diffMin} min`;
    if (diffHr < 24) return `hace ${diffHr} h`;
    if (diffDay === 1) return 'ayer';
    if (diffDay < 7) return `hace ${diffDay} días`;

    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function NotificationCenter() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [animatingBell, setAnimatingBell] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const prevUnreadCountRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);

        // Check if there are new unread notifications compared to last time
        const unreadCount = data.filter((n: Notification) => !n.isRead).length;
        if (unreadCount > prevUnreadCountRef.current) {
          // Trigger bell ring animation
          setAnimatingBell(true);
          setTimeout(() => setAnimatingBell(false), 1000);
        }
        prevUnreadCountRef.current = unreadCount;
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Poll for new notifications every 20 seconds
    const interval = setInterval(fetchNotifications, 20000);

    // Refresh on user settings toggles
    const handleToggle = () => fetchNotifications();
    window.addEventListener('notifications-toggle', handleToggle);

    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-toggle', handleToggle);
    };
  }, [fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
        prevUnreadCountRef.current = Math.max(0, prevUnreadCountRef.current - 1);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        prevUnreadCountRef.current = 0;
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        const wasUnread = !notifications.find(n => n.id === id)?.isRead;
        setNotifications(prev => prev.filter(n => n.id !== id));
        if (wasUnread) {
          prevUnreadCountRef.current = Math.max(0, prevUnreadCountRef.current - 1);
        }
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar todas las notificaciones?')) return;
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      });
      if (res.ok) {
        setNotifications([]);
        prevUnreadCountRef.current = 0;
      }
    } catch (err) {
      console.error('Error deleting all notifications:', err);
    }
  };

  const handleNotificationClick = async (notif: Notification) => {
    setIsOpen(false);
    if (!notif.isRead) {
      await handleMarkAsRead(notif.id);
    }
    const path = `/group/${notif.groupId}${notif.expenseId ? `/${notif.expenseId}` : ''}`;
    router.push(path);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'expense_created':
        return (
          <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(200, 122, 83, 0.12)', color: 'var(--accent-primary)' }}>
            <CreditCard size={16} />
          </div>
        );
      case 'expense_updated':
        return (
          <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(74, 93, 78, 0.12)', color: 'var(--accent-secondary)' }}>
            <RefreshCw size={16} />
          </div>
        );
      case 'group_joined':
        return (
          <div style={{ ...iconContainerStyle, backgroundColor: 'rgba(74, 144, 226, 0.12)', color: '#4A90E2' }}>
            <UserPlus size={16} />
          </div>
        );
      case 'payment_confirmed':
        return (
          <div style={{ ...iconContainerStyle, backgroundColor: 'var(--success-light)', color: 'var(--success)' }}>
            <CheckCircle size={16} />
          </div>
        );
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* CSS Styles for Animations */}
      <style jsx global>{`
        @keyframes ring {
          0% { transform: rotate(0); }
          10% { transform: rotate(15deg); }
          20% { transform: rotate(-10deg); }
          30% { transform: rotate(10deg); }
          40% { transform: rotate(-6deg); }
          50% { transform: rotate(4deg); }
          60% { transform: rotate(-2deg); }
          70% { transform: rotate(1deg); }
          100% { transform: rotate(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        @keyframes float-in-up {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bell-animated {
          animation: ring 0.8s ease;
        }
        .unread-pulse {
          animation: pulse-ring 2s infinite ease-in-out;
        }
      `}</style>

      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'background-color 0.2s',
          backgroundColor: isOpen ? 'var(--bg-secondary)' : 'transparent',
          outline: 'none',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isOpen ? 'var(--bg-secondary)' : 'transparent'; }}
        title="Notificaciones"
      >
        <Bell
          size={20}
          style={{
            color: unreadCount > 0 ? 'var(--accent-primary)' : 'var(--text-primary)',
            transition: 'color 0.2s',
          }}
          className={animatingBell ? 'bell-animated' : ''}
        />
        {unreadCount > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              backgroundColor: '#E74C3C',
              color: '#FFFFFF',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              fontSize: '0.62rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px var(--bg-card)',
              zIndex: 2,
            }}
            className="unread-pulse"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Dropdown Notification List */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '46px',
            right: '0',
            width: '360px',
            maxWidth: 'calc(100vw - 20px)',
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 16px 36px rgba(28, 28, 30, 0.12)',
            zIndex: 1000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'float-in-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            transformOrigin: 'top right',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-light)',
              backgroundColor: 'rgba(250, 249, 246, 0.5)',
            }}
          >
            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Notificaciones
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  style={headerActionButtonStyle}
                  title="Marcar todo como leído"
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <Check size={14} style={{ marginRight: '2px' }} />
                  Marcar leídas
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  style={headerActionButtonStyle}
                  title="Borrar todo"
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#E74C3C'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <Trash2 size={12} style={{ marginRight: '2px' }} />
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* List Area */}
          <div
            style={{
              maxHeight: '360px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px', gap: '8px', color: 'var(--text-muted)' }}>
                <Loader2 className="animate-spin" size={18} />
                <span style={{ fontSize: '0.8rem' }}>Cargando...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '8px' }}>
                <Bell size={32} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  No tienes notificaciones
                </span>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Te avisaremos aquí cuando ocurran actividades en tus grupos.
                </span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-light)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                    backgroundColor: notif.isRead ? 'transparent' : 'rgba(200, 122, 83, 0.03)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    const delBtn = e.currentTarget.querySelector('.notif-delete-btn') as HTMLElement;
                    if (delBtn) delBtn.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notif.isRead ? 'transparent' : 'rgba(200, 122, 83, 0.03)';
                    const delBtn = e.currentTarget.querySelector('.notif-delete-btn') as HTMLElement;
                    if (delBtn) delBtn.style.opacity = '0';
                  }}
                >
                  {/* Left Icon */}
                  <div style={{ marginRight: '12px', marginTop: '2px', flexShrink: 0 }}>
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Text Details */}
                  <div style={{ flex: 1, paddingRight: '20px' }}>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: notif.isRead ? 600 : 800,
                        color: 'var(--text-primary)',
                        lineHeight: 1.2,
                        marginBottom: '4px',
                      }}
                    >
                      {notif.title}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.3, marginBottom: '6px' }}>
                      {notif.body}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                      {formatRelativeTime(notif.createdAt)}
                    </div>
                  </div>

                  {/* Unread Status Dot */}
                  {!notif.isRead && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '40px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-primary)',
                      }}
                    />
                  )}

                  {/* Individual Delete Button */}
                  <button
                    className="notif-delete-btn"
                    onClick={(e) => handleDelete(notif.id, e)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: 'var(--text-muted)',
                      opacity: 0, // Hidden by default, shown on hover
                      transition: 'opacity 0.2s, color 0.2s',
                      outline: 'none',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#E74C3C'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                    title="Eliminar notificación"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const iconContainerStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const headerActionButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '2px 4px',
  borderRadius: '4px',
  transition: 'color 0.2s',
  outline: 'none',
};
