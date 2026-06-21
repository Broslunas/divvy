'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, X, AlertCircle } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function arrayBufferToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | 'unavailable'>('default');
  const [dismissed, setDismissed] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);
  const [activating, setActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        if (notificationsEnabled !== null) setNotificationsEnabled(null);
        return;
      }
      const user = await res.json();
      const enabled = user.notificationsEnabled ?? false;
      if (enabled !== notificationsEnabled) {
        setNotificationsEnabled(enabled);
      }
    } catch {
      if (notificationsEnabled !== null) setNotificationsEnabled(null);
    }
  }, [notificationsEnabled]);

  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) {
        setDismissed(false);
      }
    } catch {
      // Not supported
    }
  }, []);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unavailable');
      return;
    }

    setPermission(Notification.permission);

    refreshAuth();
    checkSubscription();

    intervalRef.current = setInterval(refreshAuth, 30000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshAuth();
        checkSubscription();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const onToggle = () => refreshAuth();
    window.addEventListener('notifications-toggle', onToggle);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('notifications-toggle', onToggle);
    };
  }, [refreshAuth, checkSubscription]);

  async function subscribe() {
    setActivating(true);
    setErrorMsg('');
    try {
      const reg = await navigator.serviceWorker.ready;

      const resp = await fetch('/api/notifications/vapid-public-key');
      if (!resp.ok) {
        throw new Error('Error al obtener clave de notificaciones.');
      }
      const { publicKey } = await resp.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
      });

      const p256dhKey = sub.getKey('p256dh');
      const authKey = sub.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('No se pudieron obtener las claves de suscripción.');
      }

      const saveResp = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(new Uint8Array(p256dhKey)),
            auth: arrayBufferToBase64(new Uint8Array(authKey)),
          },
          userAgent: navigator.userAgent
        })
      });

      if (!saveResp.ok) {
        const data = await saveResp.json();
        throw new Error(data.error || 'Error al guardar la suscripción.');
      }

      setPermission('granted');
      setDismissed(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al activar notificaciones.';
      setErrorMsg(msg);
      console.error('Error subscribing to push:', e);
    } finally {
      setActivating(false);
    }
  }

  async function requestPermission() {
    setErrorMsg('');
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await subscribe();
    } else if (result === 'denied') {
      setErrorMsg('Permiso denegado. Actívalo desde la configuración del navegador.');
    }
  }

  if (notificationsEnabled === null || !notificationsEnabled || permission === 'unavailable' || permission === 'granted' || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: 'calc(100% - 32px)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: 'var(--bg-card)',
          border: errorMsg ? '1px solid #E74C3C' : '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 18px',
          boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        }}
      >
        <Bell size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.3, flex: 1 }}>
          Recibe notificaciones de nuevos gastos y liquidaciones
        </span>
        <button
          onClick={requestPermission}
          disabled={activating}
          style={{
            padding: '6px 14px',
            fontSize: '0.75rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--accent-primary)',
            color: '#FFF',
            fontWeight: 600,
            border: 'none',
            cursor: activating ? 'not-allowed' : 'pointer',
            opacity: activating ? 0.6 : 1,
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          {activating ? 'Activando...' : 'Activar'}
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            color: 'var(--text-muted)',
            flexShrink: 0
          }}
        >
          <X size={16} />
        </button>
      </div>
      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FDF0EF',
            border: '1px solid #F5C6CB',
            borderRadius: 'var(--radius-md)',
            padding: '8px 14px',
            fontSize: '0.78rem',
            color: '#C0392B',
          }}
        >
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
