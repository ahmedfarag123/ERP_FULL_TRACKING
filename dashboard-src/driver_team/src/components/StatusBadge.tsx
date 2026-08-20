import type { ShipmentStatus } from '@/types';

interface StatusBadgeProps {
  status: ShipmentStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ShipmentStatus, { label: string; bg: string; text: string }> = {
  pending: { label: 'معلق', bg: 'bg-brand-50', text: 'text-brand-500' },
  in_transit: { label: 'قيد التوصيل', bg: 'bg-warning-50', text: 'text-warning-600' },
  delivered: { label: 'تم التسليم', bg: 'bg-success-50', text: 'text-success-600' },
  failed: { label: 'فشل التسليم', bg: 'bg-error-50', text: 'text-error-600' },
};

export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status];
  const padding = size === 'md' ? 'px-3.5 py-1.5' : 'px-2.5 py-1';
  const fontSize = size === 'md' ? 'text-sm' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center ${padding} rounded-full ${config.bg} ${config.text} ${fontSize} font-semibold`}
    >
      {config.label}
    </span>
  );
}
