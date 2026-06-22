/**
 * offline-db.ts
 * Browser-only IndexedDB wrapper that provides:
 *  - A data cache (groups + group details) so the app works offline
 *  - A sync queue of mutations (POST/PUT/DELETE) created while offline
 */

const DB_NAME = 'divvy-offline';
const DB_VERSION = 1;

// Store names
const CACHE_STORE = 'cache';
const QUEUE_STORE = 'sync_queue';

export interface QueuedOperation {
  id: string;           // UUID generated client-side
  method: 'POST' | 'PUT' | 'DELETE';
  url: string;
  body?: unknown;
  createdAt: string;
  label: string;        // Human-readable description for the UI
  // Optimistic data to apply locally before sync
  optimisticData?: unknown;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function get<T>(db: IDBDatabase, store: string, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result ? (req.result.value as T) : null);
    req.onerror = () => reject(req.error);
  });
}

function put(db: IDBDatabase, store: string, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put({ key, value });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function deleteRecord(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function clearStore(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const offlineDb = {
  /** Cache: read/write data fetched from the server */
  cache: {
    async saveGroups(groups: unknown[]): Promise<void> {
      const db = await openDB();
      await put(db, CACHE_STORE, 'groups', groups);
      db.close();
    },

    async getGroups<T>(): Promise<T[] | null> {
      const db = await openDB();
      const result = await get<T[]>(db, CACHE_STORE, 'groups');
      db.close();
      return result;
    },

    async saveGroupDetail(groupId: string, data: unknown): Promise<void> {
      const db = await openDB();
      await put(db, CACHE_STORE, `group:${groupId}`, data);
      db.close();
    },

    async getGroupDetail<T>(groupId: string): Promise<T | null> {
      const db = await openDB();
      const result = await get<T>(db, CACHE_STORE, `group:${groupId}`);
      db.close();
      return result;
    },
  },

  /** Sync queue: store mutations to replay when back online */
  queue: {
    async add(op: QueuedOperation): Promise<void> {
      const db = await openDB();
      const tx = db.transaction(QUEUE_STORE, 'readwrite');
      tx.objectStore(QUEUE_STORE).put(op);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },

    async getAll(): Promise<QueuedOperation[]> {
      const db = await openDB();
      const items = await getAll<QueuedOperation>(db, QUEUE_STORE);
      db.close();
      // Return sorted by createdAt ascending so we replay in order
      return items.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    },

    async remove(id: string): Promise<void> {
      const db = await openDB();
      await deleteRecord(db, QUEUE_STORE, id);
      db.close();
    },

    async clear(): Promise<void> {
      const db = await openDB();
      await clearStore(db, QUEUE_STORE);
      db.close();
    },

    async count(): Promise<number> {
      const db = await openDB();
      const items = await getAll<QueuedOperation>(db, QUEUE_STORE);
      db.close();
      return items.length;
    },
  },
};
