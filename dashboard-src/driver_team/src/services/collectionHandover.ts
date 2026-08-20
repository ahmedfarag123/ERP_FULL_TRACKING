import { supabase } from '@/lib/supabase';
import type { PlanCollectionCheck, CollectionCheckStatus, CollectionPaymentMethod } from '@/types';

export async function submitCollectionRequest(input: {
  planId?: string | null;
  collectedAmount: number;
  currencyCode?: string | null;
  proofPhotoUrl?: string | null;
  driverNotes?: string | null;
}) {
  const { data, error } = await supabase.rpc('driver_submit_collection_request', {
    p_plan_id: input.planId ?? null,
    p_collected_amount: input.collectedAmount,
    p_currency_code: input.currencyCode ?? 'EGP',
    p_proof_photo_url: input.proofPhotoUrl ?? null,
    p_driver_notes: input.driverNotes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function submitCollectionHandover(input: {
  planId?: string | null;
  handedToManager: boolean;
  reason?: string | null;
  totalAmount: number;
  currencyCode?: string | null;
}) {
  const { data, error } = await supabase.rpc('driver_submit_collection_handover', {
    p_plan_id: input.planId ?? null,
    p_handed_to_manager: input.handedToManager,
    p_reason: input.reason ?? null,
    p_total_amount: input.totalAmount,
    p_currency_code: input.currencyCode ?? 'EGP',
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function submitCollectionCheck(input: {
  shipmentId: string;
  checkStatus: CollectionCheckStatus;
  paymentMethod?: CollectionPaymentMethod | null;
  reason?: string | null;
  driverNotes?: string | null;
  proofPhotoUrl?: string | null;
  salesRepId?: string | null;
}): Promise<PlanCollectionCheck> {
  const { data, error } = await supabase.rpc('driver_submit_collection_check', {
    p_shipment_id: input.shipmentId,
    p_check_status: input.checkStatus,
    p_payment_method: input.paymentMethod ?? null,
    p_reason: input.reason ?? null,
    p_driver_notes: input.driverNotes ?? null,
    p_proof_photo_url: input.proofPhotoUrl ?? null,
    p_sales_rep_id: input.salesRepId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as PlanCollectionCheck;
}

export async function fetchPlanCollectionChecks(planId?: string | null): Promise<PlanCollectionCheck[]> {
  const { data, error } = await supabase.rpc('driver_get_plan_collection_checks', {
    p_plan_id: planId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    shipmentId: String(row.shipment_id),
    planId: String(row.plan_id),
    checkStatus: String(row.check_status) as CollectionCheckStatus,
    paymentMethod: row.payment_method ? String(row.payment_method) : null,
    reason: row.reason ? String(row.reason) : null,
    driverNotes: row.driver_notes ? String(row.driver_notes) : null,
    proofPhotoUrl: row.proof_photo_url ? String(row.proof_photo_url) : null,
    salesRepId: row.sales_rep_id ? String(row.sales_rep_id) : null,
    reviewStatus: String(row.review_status) as PlanCollectionCheck['reviewStatus'],
    adminNotes: row.admin_notes ? String(row.admin_notes) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    createdAt: String(row.created_at),
  }));
}
