import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActiveVisit, VisitStage, Customer } from '../types'

const DAILY_GEOFENCE_OVERRIDES = 3

function getDateKey(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface VisitState {
  activeVisit: ActiveVisit | null
  preSelectedCustomer: Customer | null
  geofenceOverridesLeft: number
  overrideResetDate: string
  startVisit: (customerId: string, customerName: string, lat?: number, lng?: number) => void
  setStage: (stage: VisitStage) => void
  updateElapsed: (elapsed: number) => void
  endVisit: () => void
  useOverride: () => void
  setPreSelectedCustomer: (customer: Customer | null) => void
}

export const useVisitStore = create<VisitState>()(
  persist(
    (set) => ({
      activeVisit: null,
      preSelectedCustomer: null,
      geofenceOverridesLeft: DAILY_GEOFENCE_OVERRIDES,
      overrideResetDate: getDateKey(),
      startVisit: (customerId, customerName, lat, lng) =>
        set((state) => state.activeVisit
          ? state
          : { activeVisit: {
              customerId, customerName,
              startTime: Date.now(),
              startLat: lat, startLng: lng,
              stage: 'timer', elapsed: 0
            }}
        ),
      setStage: (stage) =>
        set((s) => s.activeVisit ? { activeVisit: { ...s.activeVisit, stage } } : {}),
      updateElapsed: (elapsed) =>
        set((s) => s.activeVisit ? { activeVisit: { ...s.activeVisit, elapsed } } : {}),
      endVisit: () => set({ activeVisit: null }),
      useOverride: () =>
        set((s) => {
          const today = getDateKey()
          const remaining = s.overrideResetDate === today ? s.geofenceOverridesLeft : DAILY_GEOFENCE_OVERRIDES
          return {
            geofenceOverridesLeft: Math.max(0, remaining - 1),
            overrideResetDate: today
          }
        }),
      setPreSelectedCustomer: (customer) => set({ preSelectedCustomer: customer })
    }),
    {
      name: 'HorecaSmartSalesApp-visit',
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<VisitState>)
        }

        const today = getDateKey()
        if (merged.overrideResetDate !== today) {
          return {
            ...merged,
            geofenceOverridesLeft: DAILY_GEOFENCE_OVERRIDES,
            overrideResetDate: today
          }
        }

        return merged
      }
    }
  )
)
