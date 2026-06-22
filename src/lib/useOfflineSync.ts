'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineDb, type QueuedOperation } from './offline-db';

interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncError: string | null;
}

interface UseOfflineSyncReturn extends OfflineSyncState {
  /** Manually trigger processing of the pending queue */
  triggerSync: () => Promise<void>;
  /** Refresh the pendingCount from IndexedDB */
  refreshPendingCount: () => Promise<void>;
}

export function useOfflineSync(onSyncComplete?: () => void): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Avoid double-sync if multiple online events fire quickly
  const syncLockRef = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await offlineDb.queue.count();
      setPendingCount(count);
    } catch {
      // IndexedDB not available (SSR, etc.)
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (syncLockRef.current) return;
    syncLockRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    try {
      const ops = await offlineDb.queue.getAll();
      if (ops.length === 0) {
        setIsSyncing(false);
        syncLockRef.current = false;
        return;
      }

      let anyFailed = false;

      for (const op of ops) {
        try {
          const res = await fetch(op.url, {
            method: op.method,
            headers: op.body ? { 'Content-Type': 'application/json' } : undefined,
            body: op.body ? JSON.stringify(op.body) : undefined,
          });

          if (res.ok) {
            await offlineDb.queue.remove(op.id);
          } else {
            // Server rejected — remove from queue to avoid retrying indefinitely
            // (e.g. 404 "expense not found"). Keep only 5xx (transient server errors).
            if (res.status < 500) {
              await offlineDb.queue.remove(op.id);
            }
            anyFailed = true;
          }
        } catch {
          // Network still not available for this op, leave in queue
          anyFailed = true;
          break;
        }
      }

      if (anyFailed) {
        setSyncError('Algunos cambios no pudieron sincronizarse y se reintentarán más tarde.');
      } else {
        setSyncError(null);
        setLastSyncedAt(new Date());
        onSyncComplete?.();
      }
    } catch (err) {
      setSyncError('Error al sincronizar cambios pendientes.');
      console.error('[useOfflineSync] processQueue error:', err);
    } finally {
      await refreshPendingCount();
      setIsSyncing(false);
      syncLockRef.current = false;
    }
  }, [refreshPendingCount, onSyncComplete]);

  // Register Background Sync with the service worker (Chrome/Android PWA)
  const registerBackgroundSync = useCallback(async () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // @ts-expect-error: SyncManager is not in all TypeScript lib definitions
        await registration.sync.register('divvy-sync');
      } catch {
        // Background Sync not supported — we'll use the foreground fallback
      }
    }
  }, []);

  // When online: process the queue immediately (foreground sync)
  const handleOnline = useCallback(async () => {
    setIsOnline(true);
    await processQueue();
  }, [processQueue]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
  }, []);

  useEffect(() => {
    // Initialise online state
    setIsOnline(navigator.onLine);

    // Load pending count on mount
    refreshPendingCount();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for messages from the service worker (Background Sync trigger)
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DIVVY_SYNC') {
        processQueue();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [handleOnline, handleOffline, refreshPendingCount, processQueue]);

  const triggerSync = useCallback(async () => {
    if (isOnline) {
      await processQueue();
    } else {
      await registerBackgroundSync();
    }
  }, [isOnline, processQueue, registerBackgroundSync]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncedAt,
    syncError,
    triggerSync,
    refreshPendingCount,
  };
}
