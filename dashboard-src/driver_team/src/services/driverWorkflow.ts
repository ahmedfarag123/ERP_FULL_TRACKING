import type { ShipmentStatus } from '@/types';

type TimelineWorkflowEvent = {
  next_phase: string | null | undefined;
  note?: string | null | undefined;
};

type StatusActionFormatter = (status: ShipmentStatus) => string;

const WORKFLOW_STATUS_BY_TOKEN: Record<string, ShipmentStatus> = {
  pending: 'pending',
  pending_assign: 'pending',
  assigned: 'pending',
  accepted: 'pending',
  ready: 'pending',
  ready_for_pickup: 'pending',
  arrived_pickup: 'pending',
  check_in: 'pending',
  pickup: 'pending',
  picked_up: 'pending',
  rescheduled: 'pending',

  in_transit: 'in_transit',
  out_for_delivery: 'in_transit',
  arrived: 'in_transit',
  arrived_delivery: 'in_transit',

  delivered: 'delivered',
  done: 'delivered',
  finished: 'delivered',
  settled: 'delivered',

  attempted: 'failed',
  failed: 'failed',
  exception: 'failed',
  cancelled: 'failed',
  canceled: 'failed',
  cancel: 'failed',
};

const OPERATIONAL_TIMELINE_ACTION_BY_TOKEN: Record<string, string> = {
  collection_submitted: 'Collection submitted',
  collection_request_submitted: 'Collection request submitted',
  collection_request_approved: 'Collection request approved',
  collection_request_rejected: 'Collection request rejected',
  collection_handover_submitted: 'Collection handover submitted',
  collection_handover_approved: 'Collection handover approved',
  collection_handover_rejected: 'Collection handover rejected',
  items_updated: 'Load quantities updated',
  sos_created: 'SOS sent',
};

const DEFAULT_STATUS_ACTION_LABELS: Record<ShipmentStatus, string> = {
  pending: 'Shipment pending',
  in_transit: 'Shipment in transit',
  delivered: 'Shipment delivered',
  failed: 'Shipment failed',
};

export function normalizeDriverWorkflowToken(value: string | null | undefined) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function maybeShipmentStatusFromWorkflowToken(value: string | null | undefined): ShipmentStatus | null {
  const token = normalizeDriverWorkflowToken(value);
  return WORKFLOW_STATUS_BY_TOKEN[token] ?? null;
}

export function shipmentStatusFromWorkflowToken(
  value: string | null | undefined,
  fieldName = 'shipment workflow token',
): ShipmentStatus {
  const status = maybeShipmentStatusFromWorkflowToken(value);
  if (status) return status;
  throw new Error(`Unsupported ${fieldName}: ${String(value ?? '')}`);
}

export function timelineActionFromWorkflowEvent(
  event: TimelineWorkflowEvent,
  formatStatusAction?: StatusActionFormatter,
) {
  const status = maybeShipmentStatusFromWorkflowToken(event.next_phase);
  if (status) {
    return formatStatusAction ? formatStatusAction(status) : DEFAULT_STATUS_ACTION_LABELS[status];
  }

  const token = normalizeDriverWorkflowToken(event.next_phase);
  const operationalAction = OPERATIONAL_TIMELINE_ACTION_BY_TOKEN[token];
  if (operationalAction) return operationalAction;

  const note = String(event.note ?? '').trim();
  if (note) return note;

  return token ? `Shipment update: ${token.replace(/_/g, ' ')}` : 'Shipment update';
}
