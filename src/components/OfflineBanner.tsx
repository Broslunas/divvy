'use client';

import { useEffect, useState } from 'react';
import { useOfflineSync } from '@/lib/useOfflineSync';
import { WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * OfflineBanner
 * Renders a sticky top banner when the user is offline or syncing.
 * Also shows a transient "Synced!" toast when sync completes.
 */
export default function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncError, triggerSync } = useOfflineSync();
  const [showSyncedToast, setShowSyncedToast] = useState(false);
  const [prevIsSyncing, setPrevIsSyncing] = useState(false);

  // Detect when syncing finishes to show the "synced" toast
  useEffect(() => {
    if (prevIsSyncing && !isSyncing && isOnline && !syncError) {
      setShowSyncedToast(true);
      const timer = setTimeout(() => setShowSyncedToast(false), 3000);
      return () => clearTimeout(timer);
    }
    setPrevIsSyncing(isSyncing);
  }, [isSyncing, prevIsSyncing, isOnline, syncError]);

  const isVisible = !isOnline || isSyncing || !!syncError;

  return (
    <>
      {/* ── Main banner ── */}
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 2000,
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: isVisible ? 'auto' : 'none',
        }}
      >
        {/* Offline */}
        {!isOnline && !isSyncing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#3A3F47',
            color: '#FAF9F6',
            fontSize: '0.8rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}>
            <WifiOff size={14} style={{ flexShrink: 0 }} />
            <span>
              Sin conexión
              {pendingCount > 0
                ? ` — ${pendingCount} cambio${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''} de sincronizar`
                : ' — modo de solo lectura activo'}
            </span>
          </div>
        )}

        {/* Syncing */}
        {isSyncing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#C87A53',
            color: '#FFF',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}>
            <RefreshCw
              size={14}
              style={{
                flexShrink: 0,
                animation: 'divvy-spin 1s linear infinite',
              }}
            />
            <span>Sincronizando {pendingCount > 0 ? `${pendingCount} cambio${pendingCount !== 1 ? 's' : ''}` : 'cambios'}…</span>
          </div>
        )}

        {/* Sync error */}
        {syncError && isOnline && !isSyncing && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#8B3535',
            color: '#FFF',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>{syncError}</span>
            </div>
            <button
              onClick={triggerSync}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#FFF',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>

      {/* ── Synced toast ── */}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '80px',
          left: '50%',
          transform: `translateX(-50%) translateY(${showSyncedToast ? '0' : '20px'})`,
          opacity: showSyncedToast ? 1 : 0,
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          pointerEvents: 'none',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#4A5D4E',
          color: '#FFF',
          padding: '10px 18px',
          borderRadius: '9999px',
          fontSize: '0.8rem',
          fontWeight: 600,
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          whiteSpace: 'nowrap',
        }}
      >
        <CheckCircle2 size={14} />
        Cambios sincronizados
      </div>

      {/* Spinning keyframe injected once */}
      <style>{`
        @keyframes divvy-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
