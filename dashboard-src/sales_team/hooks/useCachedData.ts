/**
 * useCachedData Hook - Smart caching for rendered components
 * Caches data and only updates when values change
 */

import { useEffect, useRef, useState } from 'react'
import { getCache, setCache, subscribeToCache } from '../lib/cacheService'

interface UseCachedDataOptions {
  ttl?: number // Time to live in milliseconds
  namespace?: string
  immediate?: boolean // Start fetching immediately
}

/**
 * Hook for caching component data with change detection
 */
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseCachedDataOptions
) {
  const [data, setData] = useState<T | null>(() => getCache<T>(key, options))
  const [loading, setLoading] = useState(!getCache<T>(key, options))
  const [error, setError] = useState<Error | null>(null)
  const fetchingRef = useRef(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Subscribe to cache changes
    unsubscribeRef.current = subscribeToCache(key, (cachedData) => {
      setData(cachedData as T | null)
      setLoading(false)
    }, options)

    return () => {
      unsubscribeRef.current?.()
    }
  }, [key, options])

  useEffect(() => {
    // Check if we already have cached data
    const cachedData = getCache<T>(key, options)
    if (cachedData) {
      setData(cachedData)
      setLoading(false)
      return
    }

    // Fetch data if not cached
    if (fetchingRef.current) return
    fetchingRef.current = true

    setLoading(true)
    fetcher()
      .then((result) => {
        // Cache the result - setCache returns true if data changed
        const hasChanged = setCache(key, result, options)
        if (hasChanged) {
          setData(result)
        }
        setError(null)
      })
      .catch((err) => {
        setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        setLoading(false)
        fetchingRef.current = false
      })
  }, [key, fetcher, options])

  const refetch = async () => {
    if (fetchingRef.current) return

    fetchingRef.current = true
    setLoading(true)

    try {
      const result = await fetcher()
      setCache(key, result, options)
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }

  const updateCache = (newData: T) => {
    setCache(key, newData, options)
    setData(newData)
  }

  const clearCache = () => {
    // Clear the cache instead of deleting it
    setCache(key, null, options)
    setData(null)
  }

  return {
    data,
    loading,
    error,
    refetch,
    updateCache,
    clearCache
  }
}

/**
 * Hook for caching array data with deduplication
 */
export function useCachedArrayData<T extends { id: string | number }>(
  key: string,
  fetcher: () => Promise<T[]>,
  options?: UseCachedDataOptions
) {
  const { data, loading, error, refetch, updateCache, clearCache } = useCachedData<T[]>(
    key,
    fetcher,
    options
  )

  const addItem = (item: T) => {
    const current = data || []
    const exists = current.some((i) => i.id === item.id)
    if (!exists) {
      updateCache([...current, item])
    }
  }

  const updateItem = (id: string | number, updates: Partial<T>) => {
    const current = data || []
    const updated = current.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    )
    updateCache(updated)
  }

  const removeItem = (id: string | number) => {
    const current = data || []
    updateCache(current.filter((item) => item.id !== id))
  }

  return {
    items: data || [],
    loading,
    error,
    refetch,
    addItem,
    updateItem,
    removeItem,
    clearCache
  }
}

/**
 * Hook for managing multiple cached resources
 */
export function useCachedResources(
  resources: Record<string, { key: string; fetcher: () => Promise<unknown>; options?: UseCachedDataOptions }>
) {
  type ResourceState = {
    data: unknown | null
    loading: boolean
    error: Error | null
  }

  type ResourceApi = ResourceState & {
    refetch: () => Promise<void>
    updateCache: (newData: unknown) => void
    clearCache: () => void
  }

  const [resourceState, setResourceState] = useState<Record<string, ResourceState>>({})

  useEffect(() => {
    let cancelled = false
    const entries = Object.entries(resources)

    setResourceState(() => {
      const initial: Record<string, ResourceState> = {}
      for (const [name, config] of entries) {
        const cached = getCache<unknown>(config.key, config.options)
        initial[name] = {
          data: cached,
          loading: cached === null,
          error: null
        }
      }
      return initial
    })

    entries.forEach(([name, config]) => {
      const cached = getCache<unknown>(config.key, config.options)
      if (cached !== null) return

      config.fetcher()
        .then((result) => {
          if (cancelled) return
          setCache(config.key, result, config.options)
          setResourceState((prev) => ({
            ...prev,
            [name]: { data: result, loading: false, error: null }
          }))
        })
        .catch((error) => {
          if (cancelled) return
          const normalizedError = error instanceof Error ? error : new Error(String(error))
          setResourceState((prev) => ({
            ...prev,
            [name]: { data: null, loading: false, error: normalizedError }
          }))
        })
    })

    return () => {
      cancelled = true
    }
  }, [resources])

  const resultMap = Object.entries(resources).reduce((acc, [name, config]) => {
    const current = resourceState[name] ?? {
      data: getCache<unknown>(config.key, config.options),
      loading: true,
      error: null
    }

    const refetch = async () => {
      setResourceState((prev) => ({
        ...prev,
        [name]: { data: prev[name]?.data ?? null, loading: true, error: null }
      }))

      try {
        const result = await config.fetcher()
        setCache(config.key, result, config.options)
        setResourceState((prev) => ({
          ...prev,
          [name]: { data: result, loading: false, error: null }
        }))
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error(String(error))
        setResourceState((prev) => ({
          ...prev,
          [name]: { data: prev[name]?.data ?? null, loading: false, error: normalizedError }
        }))
      }
    }

    const updateCache = (newData: unknown) => {
      setCache(config.key, newData, config.options)
      setResourceState((prev) => ({
        ...prev,
        [name]: { data: newData, loading: false, error: null }
      }))
    }

    const clearCache = () => {
      setCache(config.key, null, config.options)
      setResourceState((prev) => ({
        ...prev,
        [name]: { data: null, loading: false, error: null }
      }))
    }

    acc[name] = {
      ...current,
      refetch,
      updateCache,
      clearCache
    }
    return acc
  }, {} as Record<string, ResourceApi>)

  const isLoading = Object.values(resultMap).some((resource) => resource.loading)
  const hasError = Object.values(resultMap).some((resource) => resource.error)
  const errors = Object.entries(resultMap).reduce(
    (acc, [name, resource]) => {
      if (resource.error) acc[name] = resource.error
      return acc
    },
    {} as Record<string, Error>
  )

  const refetchAll = async () => {
    await Promise.all(Object.values(resultMap).map((resource) => resource.refetch()))
  }

  return {
    ...resultMap,
    isLoading,
    hasError,
    errors,
    refetchAll
  }
}
