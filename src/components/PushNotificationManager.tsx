'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

export default function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission | 'unavailable'>('default');
  const [dismissed, setDismissed] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unavailable');
      return;
    }
    setPermission(Notification.permission);
    checkSubscription();
  }, []);

  async function checkSubscription() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch {
      // Not supported
    }
  }

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;

      const resp = await fetch('/api/notifications/vapid-public-key');
      const { publicKey } = await resp.json();

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource
      });

      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('p256dh')!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey('auth')!))),
          },
          userAgent: navigator.userAgent
        })
      });

      setIsSubscribed(true);
      setPermission('granted');
      setDismissed(true);
    } catch (e) {
      console.error('Error subscribing to push:', e);
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
      }
      setIsSubscribed(false);
    } catch (e) {
      console.error('Error unsubscribing:', e);
    }
  }

  async function requestPermission() {
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      await subscribe();
    }
  }

  if (permission === 'unavailable' || permission === 'granted' || dismissed) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '90px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 18px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
        maxWidth: 'calc(100% - 32px)'
      }}
    >
      <Bell size={20} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.3 }}>
        Recibe notificaciones de nuevos gastos y liquidaciones
      </span>
      <button
        onClick={requestPermission}
        style={{
          padding: '6px 14px',
          fontSize: '0.75rem',
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--accent-primary)',
          color: '#FFF',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0
        }}
      >
        Activar
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
  );
}
