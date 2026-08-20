import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

export function formatArabicDate(dateStr: string): string {
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('ar-SA', { 
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date)
}

export function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'الآن'
  if (minutes < 60) return `منذ ${minutes} دقيقة`
  if (hours < 24) return `منذ ${hours} ساعة`
  if (days < 7) return `منذ ${days} يوم`
  return formatArabicDate(dateStr)
}

export function classLabel(cls: string): string {
  const map: Record<string, string> = {
    'A': 'ذهبي', 'B': 'فضي', 'C': 'برونزي', 'D': 'عادي', 'E': 'جديد'
  }
  return map[cls] ?? cls
}

export function classColor(cls: string): string {
  const map: Record<string, string> = {
    'A': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    'B': 'text-slate-300 bg-slate-300/10 border-slate-300/30',
    'C': 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    'D': 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    'E': 'text-green-400 bg-green-400/10 border-green-400/30'
  }
  return map[cls] ?? 'text-gray-400 bg-gray-400/10 border-gray-400/30'
}
