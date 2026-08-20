/**
 * Cache Service - Smart caching strategy for app data
 * Caches rendered data and only updates when values change
 */

export interface CacheEntry<T> {
  data: T
  timestamp: number
  hash: string
}

export interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  namespace?: string
}

interface CacheStore {
  [key: string]: CacheEntry<any>
}

interface PersistedCacheRecord {
  key: string
  entry: CacheEntry<any>
}

const cache: CacheStore = {}
const subscribers: Map<string, Set<(data: any) => void>> = new Map()
const CACHE_DB_VERSION = 2

function openCacheDatabase(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, CACHE_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (db.objectStoreNames.contains('cache')) {
        db.deleteObjectStore('cache')
      }
      db.createObjectStore('cache', { keyPath: 'key' })
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open cache database'))
  })
}

function waitForRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
  })
}

/**
 * Generate hash for data to detect changes
 */
function generateHash(data: any): string {
  try {
    const str = typeof data === 'string' ? data : JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString(36)
  } catch {
    return String(data)
  }
}

/**
 * Get cache key with namespace
 */
function getCacheKey(key: string, namespace?: string): string {
  return namespace ? `${namespace}:${key}` : key
}

/**
 * Set cache data with change detection
 */
export function setCache<T>(
  key: string,
  data: T,
  options?: CacheOptions
): boolean {
  const cacheKey = getCacheKey(key, options?.namespace)
  const newHash = generateHash(data)

  // Check if data has changed
  const existing = cache[cacheKey]
  const hasChanged = !existing || existing.hash !== newHash

  cache[cacheKey] = {
    data,
    timestamp: Date.now(),
    hash: newHash
  }

  // Notify subscribers only if data changed
  if (hasChanged) {
    const cacheSubscribers = subscribers.get(cacheKey)
    if (cacheSubscribers) {
      cacheSubscribers.forEach((callback) => callback(data))
    }
  }

  return hasChanged
}

/**
 * Get cache data
 */
export function getCache<T>(key: string, options?: CacheOptions): T | null {
  const cacheKey = getCacheKey(key, options?.namespace)
  const entry = cache[cacheKey]

  if (!entry) return null

  // Check if expired
  if (options?.ttl && Date.now() - entry.timestamp > options.ttl) {
    deleteCache(key, options)
    return null
  }

  return entry.data as T
}

/**
 * Get cache info
 */
export function getCacheInfo(key: string, options?: CacheOptions) {
  const cacheKey = getCacheKey(key, options?.namespace)
  const entry = cache[cacheKey]

  if (!entry) return null

  return {
    timestamp: entry.timestamp,
    age: Date.now() - entry.timestamp,
    size: JSON.stringify(entry.data).length
  }
}

/**
 * Subscribe to cache changes
 */
export function subscribeToCache<T>(
  key: string,
  callback: (data: T) => void,
  options?: CacheOptions
): () => void {
  const cacheKey = getCacheKey(key, options?.namespace)

  if (!subscribers.has(cacheKey)) {
    subscribers.set(cacheKey, new Set())
  }

  subscribers.get(cacheKey)!.add(callback)

  // If data exists, call immediately
  const existing = cache[cacheKey]
  if (existing) {
    callback(existing.data)
  }

  // Return unsubscribe function
  return () => {
    const subs = subscribers.get(cacheKey)
    if (subs) {
      subs.delete(callback)
      if (subs.size === 0) {
        subscribers.delete(cacheKey)
      }
    }
  }
}

/**
 * Delete cache entry
 */
export function deleteCache(key: string, options?: CacheOptions): void {
  const cacheKey = getCacheKey(key, options?.namespace)
  delete cache[cacheKey]
  subscribers.delete(cacheKey)
}

/**
 * Clear all cache or by namespace
 */
export function clearCache(namespace?: string): void {
  if (namespace) {
    const prefix = `${namespace}:`
    for (const key in cache) {
      if (key.startsWith(prefix)) {
        delete cache[key]
        subscribers.delete(key)
      }
    }
  } else {
    // Clear all
    for (const key in cache) {
      delete cache[key]
    }
    subscribers.clear()
  }
}

/**
 * Get cache stats
 */
export function getCacheStats() {
  const entries = Object.entries(cache)
  const totalSize = entries.reduce(
    (sum, [, entry]) => sum + JSON.stringify(entry.data).length,
    0
  )

  return {
    entryCount: entries.length,
    totalSize,
    // Group by namespace
    byNamespace: entries.reduce(
      (acc, [key]) => {
        const namespace = key.includes(':') ? key.split(':')[0] : 'default'
        acc[namespace] = (acc[namespace] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )
  }
}

/**
 * Hook-friendly cache getter (for components)
 */
export function useCacheValue<T>(
  key: string,
  options?: CacheOptions
): [T | null, (data: T) => void] {
  const get = () => getCache<T>(key, options)
  const set = (data: T) => setCache(key, data, options)

  return [get(), set]
}

/**
 * Batch cache operations
 */
export function batchSetCache<T>(
  entries: Array<{
    key: string
    data: T
    options?: CacheOptions
  }>
): number {
  let changedCount = 0
  for (const entry of entries) {
    if (setCache(entry.key, entry.data, entry.options)) {
      changedCount++
    }
  }
  return changedCount
}

/**
 * Preload cache from IndexedDB
 */
export async function loadCacheFromIndexedDB(dbName = 'salespro_cache'): Promise<void> {
  if (typeof indexedDB === 'undefined') return

  let db: IDBDatabase | null = null
  try {
    db = await openCacheDatabase(dbName)
    if (!db.objectStoreNames.contains('cache')) return

    const transaction = db.transaction('cache', 'readonly')
    const objectStore = transaction.objectStore('cache')
    const entries = await waitForRequest<PersistedCacheRecord[]>(objectStore.getAll())
    await waitForTransaction(transaction)

    entries.forEach((record) => {
      if (!record?.key || !record.entry) return
      cache[record.key] = record.entry
    })
  } catch (error) {
    console.warn('IndexedDB not available:', error)
  } finally {
    db?.close()
  }
}

/**
 * Persist cache to IndexedDB
 */
export async function persistCacheToIndexedDB(dbName = 'salespro_cache'): Promise<void> {
  if (typeof indexedDB === 'undefined') return

  let db: IDBDatabase | null = null
  try {
    db = await openCacheDatabase(dbName)
    if (!db.objectStoreNames.contains('cache')) return

    const transaction = db.transaction('cache', 'readwrite')
    const objectStore = transaction.objectStore('cache')
    objectStore.clear()

    for (const [key, entry] of Object.entries(cache)) {
      const record: PersistedCacheRecord = { key, entry }
      objectStore.put(record)
    }

    await waitForTransaction(transaction)
  } catch (error) {
    console.warn('Could not persist to IndexedDB:', error)
  } finally {
    db?.close()
  }
}
