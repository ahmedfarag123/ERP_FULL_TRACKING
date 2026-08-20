/**
 * Location Service - Handles geolocation with permissions and error handling
 */

export interface LocationCoordinates {
  lat: number
  lng: number
  accuracy?: number
  timestamp: number
}

export interface LocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNKNOWN'
  message: string
}

let watchId: number | null = null
let lastLocation: LocationCoordinates | null = null

/**
 * Request permission for location access
 */
export async function requestLocationPermission(): Promise<boolean> {
  if (!('geolocation' in navigator)) {
    console.error('Geolocation not supported')
    return false
  }

  try {
    // Check current permission state
    if ('permissions' in navigator) {
      const result = await (navigator.permissions as any).query({
        name: 'geolocation'
      })

      if (result.state === 'denied') {
        return false
      }

      if (result.state === 'granted') {
        return true
      }

      // 'prompt' state - will request on next use
      return true
    }

    return true
  } catch (error) {
    console.error('Permission check failed:', error)
    return true // Assume we can try
  }
}

/**
 * Get current position once
 */
export function getCurrentLocation(): Promise<LocationCoordinates | LocationError> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({
        code: 'POSITION_UNAVAILABLE',
        message: 'Geolocation not supported'
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        lastLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        }
        resolve(lastLocation)
      },
      (error) => {
        const errorMap: Record<number, LocationError['code']> = {
          1: 'PERMISSION_DENIED',
          2: 'POSITION_UNAVAILABLE',
          3: 'TIMEOUT'
        }

        resolve({
          code: errorMap[error.code] || 'UNKNOWN',
          message: error.message
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

/**
 * Watch location changes
 */
export function watchLocation(
  callback: (location: LocationCoordinates) => void,
  errorCallback?: (error: LocationError) => void
): () => void {
  if (!('geolocation' in navigator)) {
    errorCallback?.({
      code: 'POSITION_UNAVAILABLE',
      message: 'Geolocation not supported'
    })
    return () => {}
  }

  watchId = navigator.geolocation.watchPosition(
    (position) => {
      lastLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      }
      callback(lastLocation)
    },
    (error) => {
      const errorMap: Record<number, LocationError['code']> = {
        1: 'PERMISSION_DENIED',
        2: 'POSITION_UNAVAILABLE',
        3: 'TIMEOUT'
      }

      errorCallback?.({
        code: errorMap[error.code] || 'UNKNOWN',
        message: error.message
      })
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  )

  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
      watchId = null
    }
  }
}

/**
 * Stop watching location
 */
export function stopWatchingLocation(): void {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}

/**
 * Get last known location
 */
export function getLastLocation(): LocationCoordinates | null {
  return lastLocation
}

/**
 * Calculate distance between two coordinates (in meters)
 */
export function calculateDistance(
  coord1: LocationCoordinates,
  coord2: LocationCoordinates
): number {
  const R = 6_371_000 // Earth's radius in meters
  const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180)
  const dLng = (coord2.lng - coord1.lng) * (Math.PI / 180)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * (Math.PI / 180)) *
      Math.cos(coord2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Check if within radius (in meters)
 */
export function isWithinRadius(
  current: LocationCoordinates,
  target: LocationCoordinates,
  radiusMeters: number
): boolean {
  return calculateDistance(current, target) <= radiusMeters
}
