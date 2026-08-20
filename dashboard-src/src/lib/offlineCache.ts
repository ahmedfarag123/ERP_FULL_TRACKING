const DB_NAME = 'horeca-admin-offline-db';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('queryCache')) {
        db.createObjectStore('queryCache', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('pendingWrites')) {
        db.createObjectStore('pendingWrites', { keyPath: 'id' });
      }
    };
  });
}

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  timestamp: number;
  ttlMs: number;
}

export interface PendingWrite {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'upsert' | 'delete';
  payload: unknown;
  timestamp: number;
  retryCount: number;
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queryCache', 'readonly');
      const store = tx.objectStore('queryCache');
      const req = store.get(key);
      req.onsuccess = () => {
        const entry: CacheEntry<T> | undefined = req.result;
        if (!entry) return resolve(null);
        if (Date.now() - entry.timestamp > entry.ttlMs) {
          resolve(null);
        } else {
          resolve(entry.data);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function getCachedRegardless<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('queryCache', 'readonly');
      const store = tx.objectStore('queryCache');
      const req = store.get(key);
      req.onsuccess = () => {
        const entry: CacheEntry<T> | undefined = req.result;
        resolve(entry?.data ?? null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('queryCache', 'readwrite');
      const store = tx.objectStore('queryCache');
      const entry: CacheEntry<T> = { key, data, timestamp: Date.now(), ttlMs };
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Cache write failure is non-critical
  }
}

export async function deleteCached(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('queryCache', 'readwrite');
      const store = tx.objectStore('queryCache');
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-critical
  }
}

export async function clearCache(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('queryCache', 'readwrite');
      const store = tx.objectStore('queryCache');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-critical
  }
}

export async function queuePendingWrite(write: Omit<PendingWrite, 'id' | 'timestamp' | 'retryCount'>): Promise<PendingWrite> {
  const entry: PendingWrite = {
    ...write,
    id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    retryCount: 0,
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('pendingWrites', 'readwrite');
      const store = tx.objectStore('pendingWrites');
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Will retry on next connection
  }

  return entry;
}

export async function getPendingWrites(): Promise<PendingWrite[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('pendingWrites', 'readonly');
      const store = tx.objectStore('pendingWrites');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function removePendingWrite(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('pendingWrites', 'readwrite');
      const store = tx.objectStore('pendingWrites');
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-critical
  }
}

export async function clearPendingWrites(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('pendingWrites', 'readwrite');
      const store = tx.objectStore('pendingWrites');
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Non-critical
  }
}
