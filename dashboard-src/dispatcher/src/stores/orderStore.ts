import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type {
  ActivityLogEntry,
  PrepOrder,
  PrepOrderItem,
  ProductDataset,
  ProductPreparationStatus,
  ScannerResult,
  UnavailabilityReason,
} from '../types';

interface OrderState {
  orders: PrepOrder[];
  selectedOrderId: string | null;
  isLoading: boolean;
  error: string | null;
  statusFilter: string;
  searchQuery: string;
  activityLog: ActivityLogEntry[];
  loadOrders: () => Promise<void>;
  loadOrderDetail: (orderId: string) => Promise<PrepOrder | null>;
  startPreparation: (orderId: string) => Promise<void>;
  validateBarcode: (orderId: string, barcode: string) => Promise<ScannerResult>;
  lookupBarcode: (barcode: string) => Promise<ScannerResult>;
  searchProductDataset: (query: string) => Promise<ProductDataset[]>;
  registerBarcode: (input: { barcode: string; item: PrepOrderItem; datasetId?: string | null; productId?: string | null }) => Promise<ScannerResult>;
  confirmPreparedItem: (orderId: string, itemId: string, approvedQty: number, reason?: UnavailabilityReason | null, note?: string) => Promise<void>;
  selectOrder: (id: string | null) => void;
  setStatusFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
  confirmItem: (orderId: string, itemId: string, confirmedQty: number) => Promise<void>;
  reduceItem: (orderId: string, itemId: string, confirmedQty: number, reason: UnavailabilityReason, note?: string) => Promise<void>;
  markItemUnavailable: (orderId: string, itemId: string, reason: UnavailabilityReason, note?: string) => Promise<void>;
  completePreparation: (orderId: string) => Promise<void>;
  bulkMarkAllOrderItemsReady: (orderId: string) => Promise<number>;
  loadActivityLog: (orderId?: string) => Promise<void>;
  getFilteredOrders: () => PrepOrder[];
  getStats: () => { total: number; pending: number; preparing: number; ready: number; waitingPickup: number };
}

type OrderRow = {
  id: string;
  external_order_id: string | null;
  odoo_order_name: string | null;
  customer_id: string | null;
  customer_name: string | null;
  status: string | null;
  total_amount: number | null;
  currency_code: string | null;
  order_date: string | null;
  delivery_status: string | null;
  invoice_status: string | null;
};

type PreparationRow = {
  id: string;
  order_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  dispatcher_profile_id: string | null;
};

type ProductRow = {
  id: string;
  external_product_id: string | null;
  internal_reference: string | null;
  product_name: string;
  sales_price: number | null;
  quantity_on_hand: number | null;
  unit_of_measure: string | null;
};

type LineItemRow = {
  id: string;
  order_id: string;
  product_name: string | null;
  product_ref: string | null;
  product_code: string | null;
  external_product_id: string | null;
  ordered_quantity: number | null;
  delivered_quantity: number | null;
  unit_price: number | null;
  subtotal_amount: number | null;
  total_amount: number | null;
  display_type: string | null;
  raw_payload: unknown;
};

type ItemPreparationRow = {
  id: string;
  order_line_item_id: string;
  product_id: string | null;
  dataset_id: string | null;
  approved_quantity: number | null;
  status: string | null;
  shortage_reason: UnavailabilityReason | null;
  note: string | null;
  barcode: string | null;
  barcode_validated_at: string | null;
};

function mapOrderStatus(order: Pick<OrderRow, 'status' | 'delivery_status'>, preparation?: PreparationRow | null): PrepOrder['preparation_status'] {
  const preparationStatus = String(preparation?.status ?? '').toLowerCase();
  const delivery = String(order.delivery_status ?? '').toLowerCase();
  const status = String(order.status ?? '').toLowerCase();

  if (status === 'cancelled' || preparationStatus === 'cancelled') return 'cancelled';
  if (preparationStatus === 'ready' || delivery === 'full' || delivery === 'partial' || delivery === 'ready' || delivery === 'ready_dispatch') return 'ready';
  if (preparationStatus === 'waiting_pickup' || delivery === 'waiting_pickup' || delivery === 'assigned') return 'waiting_pickup';
  if (preparationStatus === 'handed_over' || delivery === 'delivered') return 'handed_over';
  if (preparationStatus === 'preparing' || status === 'processing' || delivery === 'processing') return 'preparing';
  return 'pending';
}

function mapItemStatus(status: string | null | undefined): ProductPreparationStatus {
  if (status === 'ready' || status === 'partial' || status === 'unavailable') return status;
  return 'pending';
}

function calculateOrderProgress(items: PrepOrderItem[]) {
  const processed = items.filter((item) => item.preparation_status !== 'pending').length;
  return {
    confirmed_count: processed,
    progress_percent: items.length > 0 ? Math.round((processed / items.length) * 100) : 0,
  };
}

function mapOrder(order: OrderRow, preparation?: PreparationRow | null): PrepOrder {
  return {
    id: order.id,
    external_order_id: order.external_order_id ?? null,
    odoo_order_name: order.odoo_order_name ?? order.external_order_id ?? null,
    customer_id: order.customer_id ?? '',
    customer_name: order.customer_name ?? null,
    status: order.status ?? 'pending',
    total_amount: order.total_amount ?? null,
    currency_code: order.currency_code ?? 'EGP',
    order_date: order.order_date ?? null,
    preparation_status: mapOrderStatus(order, preparation),
    preparation_started_at: preparation?.started_at ?? null,
    preparation_completed_at: preparation?.completed_at ?? null,
    preparation_duration_seconds: preparation?.duration_seconds ?? null,
    prepared_by_profile_id: preparation?.dispatcher_profile_id ?? null,
    prepared_by_name: null,
    po_number: null,
    items: [],
    item_count: 0,
    confirmed_count: 0,
    progress_percent: 0,
  };
}

function normalizeBarcode(barcode: string) {
  return barcode.replace(/\s+/g, '').trim();
}

function getBarcodeVariants(barcode: string): string[] {
  const clean = barcode.replace(/\s+/g, '').trim();
  const variants = new Set<string>();

  variants.add(clean);

  if (clean.length === 13) {
    variants.add(clean.slice(0, 12));
  }
  if (clean.length === 12) {
    variants.add(clean);
  }
  if (clean.length === 14) {
    variants.add(clean.slice(0, 13));
    variants.add(clean.slice(1));
  }
  if (clean.length === 11) {
    variants.add(clean);
  }

  return Array.from(variants);
}

function cleaned(value: unknown) {
  return String(value ?? '').trim();
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rawPayloadDisplayType(payload: unknown) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';
  const displayType = (payload as { display_type?: unknown }).display_type;
  return String(displayType ?? '').trim().toLowerCase();
}

function isWarehouseProductLine(item: LineItemRow) {
  const displayType = rawPayloadDisplayType(item.raw_payload);
  if (displayType === 'line_note' || displayType === 'line_section') return false;

  const hasProductIdentifier = Boolean(
    cleaned(item.external_product_id) ||
    cleaned(item.product_ref) ||
    cleaned(item.product_code),
  );
  if (!hasProductIdentifier) return false;

  const hasQuantityOrValue = Math.max(
    toNumber(item.ordered_quantity),
    toNumber(item.delivered_quantity),
    toNumber(item.total_amount),
    toNumber(item.subtotal_amount),
    toNumber(item.unit_price),
  ) > 0;

  return hasQuantityOrValue;
}

async function getCurrentProfileId() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function fetchPreparation(orderId: string): Promise<PreparationRow | null> {
  const { data, error } = await supabase
    .from('dispatcher_order_preparations')
    .select('id, order_id, status, started_at, completed_at, duration_seconds, dispatcher_profile_id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as PreparationRow | null;
}

async function fetchOrder(orderId: string): Promise<PrepOrder | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, external_order_id, odoo_order_name, customer_id, customer_name, status, total_amount, currency_code, order_date, delivery_status, invoice_status')
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const preparation = await fetchPreparation(orderId);
  return mapOrder(data as OrderRow, preparation);
}

async function fetchProductsForLines(lineItems: LineItemRow[]) {
  const externalIds = [...new Set(lineItems.map((item) => item.external_product_id).filter(Boolean))] as string[];
  const refs = [...new Set(lineItems.flatMap((item) => [item.product_ref, item.product_code]).filter(Boolean))] as string[];

  if (externalIds.length === 0 && refs.length === 0) return [] as ProductRow[];

  const clauses = [];
  if (externalIds.length > 0) clauses.push(`external_product_id.in.(${externalIds.map((id) => `"${id}"`).join(',')})`);
  if (refs.length > 0) clauses.push(`internal_reference.in.(${refs.map((ref) => `"${ref}"`).join(',')})`);

  const { data, error } = await supabase
    .from('products')
    .select('id, external_product_id, internal_reference, product_name')
    .or(clauses.join(','));

  if (error) throw new Error(error.message);
  return (data ?? []) as ProductRow[];
}

async function fetchOrderItems(orderId: string, preparation?: PreparationRow | null): Promise<PrepOrderItem[]> {
  const { data: lineItems, error: lineError } = await supabase
    .from('order_line_items')
    .select('id, order_id, product_name, product_ref, product_code, external_product_id, ordered_quantity, delivered_quantity, unit_price, subtotal_amount, total_amount, display_type, raw_payload')
    .eq('order_id', orderId)
    .is('display_type', null)
    .order('sort_order', { ascending: true });

  if (lineError) throw new Error(lineError.message);

  const lines = ((lineItems ?? []) as LineItemRow[]).filter(isWarehouseProductLine);
  const products = await fetchProductsForLines(lines);
  const productsByExternalId = new Map(products.map((product) => [product.external_product_id, product]));
  const productsByRef = new Map(products.map((product) => [product.internal_reference, product]));

  let preparedByLine = new Map<string, ItemPreparationRow>();
  if (preparation) {
    const { data: preparedItems, error: prepError } = await supabase
      .from('dispatcher_order_item_preparations')
      .select('id, order_line_item_id, product_id, dataset_id, approved_quantity, status, shortage_reason, note, barcode, barcode_validated_at')
      .eq('preparation_id', preparation.id);

    if (prepError) throw new Error(prepError.message);
    preparedByLine = new Map(((preparedItems ?? []) as ItemPreparationRow[]).map((item) => [item.order_line_item_id, item]));
  }

  return lines.map((item) => {
    const product =
      productsByExternalId.get(item.external_product_id ?? '') ??
      productsByRef.get(item.product_ref ?? '') ??
      productsByRef.get(item.product_code ?? '');
    const prepared = preparedByLine.get(item.id);
    const orderedQuantity = Number(item.ordered_quantity ?? 0);

    return {
      id: item.id,
      order_id: item.order_id,
      product_id: prepared?.product_id ?? product?.id ?? null,
      dataset_id: prepared?.dataset_id ?? null,
      product_name: item.product_name ?? product?.product_name ?? item.product_ref ?? item.product_code ?? 'منتج غير معروف',
      product_ref: item.product_ref ?? null,
      product_code: item.product_code ?? null,
      external_product_id: item.external_product_id ?? product?.external_product_id ?? null,
      ordered_quantity: orderedQuantity,
      confirmed_quantity: Number(prepared?.approved_quantity ?? item.delivered_quantity ?? 0),
      preparation_status: mapItemStatus(prepared?.status),
      barcode_scanned: Boolean(prepared?.barcode_validated_at),
      unavailability_reason: prepared?.shortage_reason ?? null,
      note: prepared?.note ?? null,
    };
  });
}

async function logDispatcherActivity(input: {
  action: string;
  order: PrepOrder | null | undefined;
  item?: PrepOrderItem | null;
  details?: Record<string, unknown>;
}) {
  try {
    const actorProfileId = await getCurrentProfileId();
    await supabase.from('dispatcher_activity_log').insert({
      action: input.action,
      actor_profile_id: actorProfileId,
      entity_type: 'order',
      entity_id: input.order?.id ?? input.item?.order_id ?? '',
      entity_number: input.order?.odoo_order_name ?? input.order?.external_order_id ?? null,
      product_name: input.item?.product_name ?? null,
      details: input.details ?? null,
    });
  } catch {
    // Activity logging should not block warehouse work.
  }
}

async function resolveBarcode(barcode: string) {
  const variants = getBarcodeVariants(barcode);

  for (const variant of variants) {
    const { data: dataset, error } = await supabase
      .from('products_dataset')
      .select('id, base_id, name, image_url, barcode, variants, measurments, "measurment value", search_keywords, product_id')
      .eq('barcode', variant)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (dataset) return { dataset: dataset as ProductDataset };
  }

  return { dataset: null as ProductDataset | null };
}

function itemMatchesResolvedProduct(item: PrepOrderItem, resolved: { dataset: ProductDataset | null }) {
  if (resolved.dataset) {
    const searchable = [
      resolved.dataset.name,
      resolved.dataset.base_id,
      resolved.dataset.variants,
      ...(Array.isArray(resolved.dataset.search_keywords) ? resolved.dataset.search_keywords : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    const itemText = [item.product_name, item.product_ref, item.product_code, item.external_product_id].filter(Boolean).join(' ').toLowerCase();
    return item.dataset_id === resolved.dataset.id || (itemText.length > 0 && searchable.includes(itemText.split(/\s+/)[0] ?? ''));
  }

  return false;
}

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
      orders: [],
      selectedOrderId: null,
      isLoading: false,
      error: null,
      statusFilter: 'all',
      searchQuery: '',
      activityLog: [],

      loadOrders: async () => {
        set({ isLoading: true, error: null });
        try {
          const { data: orders, error } = await supabase
            .from('orders')
            .select('id, external_order_id, odoo_order_name, customer_id, customer_name, status, total_amount, currency_code, order_date, delivery_status, invoice_status')
            .in('status', ['confirmed', 'processing', 'delivered'])
            .or('invoice_status.is.null,invoice_status.eq.no,invoice_status.eq.invoice')
            .order('order_date', { ascending: false })
            .limit(100);

          if (error) throw new Error(error.message);

          const orderRows = (orders ?? []) as OrderRow[];
          const orderIds = orderRows.map((order) => order.id);
          const { data: preparations, error: prepError } = orderIds.length
            ? await supabase
                .from('dispatcher_order_preparations')
                .select('id, order_id, status, started_at, completed_at, duration_seconds, dispatcher_profile_id')
                .in('order_id', orderIds)
            : { data: [], error: null };

          if (prepError) throw new Error(prepError.message);

          const preparationByOrder = new Map(((preparations ?? []) as PreparationRow[]).map((preparation) => [preparation.order_id, preparation]));
          const prepOrders = orderRows.map((order) => mapOrder(order, preparationByOrder.get(order.id)));

          set({ orders: prepOrders, isLoading: false });
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
        }
      },

      loadOrderDetail: async (orderId) => {
        const baseOrder = get().orders.find((order) => order.id === orderId) ?? await fetchOrder(orderId);
        if (!baseOrder) return null;

        const preparation = await fetchPreparation(orderId);
        const items = await fetchOrderItems(orderId, preparation);
        const progress = calculateOrderProgress(items);
        const updatedOrder: PrepOrder = {
          ...baseOrder,
          preparation_status: preparation
            ? mapOrderStatus({ status: baseOrder.status, delivery_status: null }, preparation)
            : baseOrder.preparation_status,
          preparation_started_at: preparation?.started_at ?? baseOrder.preparation_started_at,
          preparation_completed_at: preparation?.completed_at ?? baseOrder.preparation_completed_at,
          preparation_duration_seconds: preparation?.duration_seconds ?? baseOrder.preparation_duration_seconds,
          prepared_by_profile_id: preparation?.dispatcher_profile_id ?? baseOrder.prepared_by_profile_id,
          items,
          item_count: items.length,
          ...progress,
        };

        set((state) => ({
          orders: state.orders.some((order) => order.id === orderId)
            ? state.orders.map((order) => (order.id === orderId ? updatedOrder : order))
            : [updatedOrder, ...state.orders],
        }));

        return updatedOrder;
      },

      startPreparation: async (orderId) => {
        const actorProfileId = await getCurrentProfileId();
        const order = await get().loadOrderDetail(orderId);
        if (!order) throw new Error('Order not found');

        const { data: preparation, error } = await supabase
          .from('dispatcher_order_preparations')
          .upsert(
            {
              order_id: orderId,
              status: 'preparing',
              dispatcher_profile_id: actorProfileId,
              started_at: order.preparation_started_at ?? new Date().toISOString(),
            },
            { onConflict: 'order_id' },
          )
          .select('id, order_id, status, started_at, completed_at, duration_seconds, dispatcher_profile_id')
          .single();

        if (error) throw new Error(error.message);

        const preparationRow = preparation as PreparationRow;
        if (order.items.length > 0) {
          const rows = order.items.map((item) => ({
            preparation_id: preparationRow.id,
            order_id: orderId,
            order_line_item_id: item.id,
            product_id: item.product_id,
            dataset_id: item.dataset_id,
            requested_quantity: item.ordered_quantity,
            approved_quantity: 0,
            status: 'pending',
          }));
          const { error: itemError } = await supabase
            .from('dispatcher_order_item_preparations')
            .upsert(rows, { onConflict: 'preparation_id,order_line_item_id', ignoreDuplicates: true });
          if (itemError) throw new Error(itemError.message);
        }

        const { error: orderError } = await supabase
          .from('orders')
          .update({ status: 'processing', delivery_status: 'processing' })
          .eq('id', orderId);
        if (orderError) throw new Error(orderError.message);

        await logDispatcherActivity({ action: 'start_preparation', order });
        await get().loadOrderDetail(orderId);
      },

      validateBarcode: async (orderId, barcode) => {
        const normalized = normalizeBarcode(barcode);
        const order = await get().loadOrderDetail(orderId);
        if (!order) throw new Error('Order not found');

        const resolved = await resolveBarcode(normalized);
        if (!resolved.dataset) {
          return { barcode: normalized, productId: null, datasetId: null, productName: null, imageUrl: null, price: null, stock: null, variants: null, baseId: null, matched: false, orderItemId: null };
        }

        const item = order.items.find((candidate) => itemMatchesResolvedProduct(candidate, resolved)) ?? null;
        return {
          barcode: normalized,
          productId: resolved.dataset.product_id ?? null,
          datasetId: resolved.dataset.id,
          productName: resolved.dataset.name,
          imageUrl: resolved.dataset.image_url ?? null,
          price: null,
          stock: null,
          variants: resolved.dataset.variants ?? null,
          baseId: resolved.dataset.base_id,
          matched: Boolean(item),
          orderItemId: item?.id ?? null,
        };
      },

      lookupBarcode: async (barcode) => {
        const normalized = normalizeBarcode(barcode);
        const resolved = await resolveBarcode(normalized);
        if (!resolved.dataset) {
          return { barcode: normalized, productId: null, datasetId: null, productName: null, imageUrl: null, price: null, stock: null, variants: null, baseId: null, matched: false, orderItemId: null };
        }
        return {
          barcode: normalized,
          productId: resolved.dataset.product_id ?? null,
          datasetId: resolved.dataset.id,
          productName: resolved.dataset.name,
          imageUrl: resolved.dataset.image_url ?? null,
          price: null,
          stock: null,
          variants: resolved.dataset.variants ?? null,
          baseId: resolved.dataset.base_id,
          matched: false,
          orderItemId: null,
        };
      },

      searchProductDataset: async (query) => {
        const trimmed = query.trim();
        if (!trimmed) return [];

        const { data, error } = await supabase
          .from('products_dataset')
          .select('id, base_id, name, image_url, barcode, variants, measurments, "measurment value", search_keywords, product_id')
          .or(`name.ilike.%${trimmed}%,base_id.ilike.%${trimmed}%,variants.ilike.%${trimmed}%`)
          .limit(20);

        if (error) throw new Error(error.message);
        return (data ?? []) as ProductDataset[];
      },

      registerBarcode: async ({ barcode, item, datasetId, productId }) => {
        const normalized = normalizeBarcode(barcode);
        const targetProductId = productId ?? item.product_id ?? null;
        const targetDatasetId = datasetId ?? item.dataset_id ?? null;

        if (targetDatasetId) {
          const { error } = await supabase
            .from('products_dataset')
            .update({ barcode: normalized, product_id: targetProductId })
            .eq('id', targetDatasetId);
          if (error) throw new Error(error.message);
        }

        await logDispatcherActivity({
          action: 'register_barcode',
          order: get().orders.find((order) => order.id === item.order_id),
          item,
          details: { barcode: normalized, product_id: targetProductId, dataset_id: targetDatasetId },
        });

        return get().validateBarcode(item.order_id, normalized);
      },

      confirmPreparedItem: async (orderId, itemId, approvedQty, reason, note) => {
        const order = await get().loadOrderDetail(orderId);
        const item = order?.items.find((candidate) => candidate.id === itemId) ?? null;
        if (!order || !item) throw new Error('Order item not found');

        const approvedQuantity = Math.max(0, Math.min(Number(approvedQty), item.ordered_quantity));
        const status: ProductPreparationStatus =
          approvedQuantity <= 0 ? 'unavailable' : approvedQuantity < item.ordered_quantity ? 'partial' : 'ready';

        if (status !== 'ready' && !reason) {
          throw new Error('يجب تحديد سبب النقص قبل الحفظ');
        }

        let preparation = await fetchPreparation(orderId);
        if (!preparation) {
          await get().startPreparation(orderId);
          preparation = await fetchPreparation(orderId);
        }
        if (!preparation) throw new Error('Preparation record not found');

        const actorProfileId = await getCurrentProfileId();
        const { error } = await supabase
          .from('dispatcher_order_item_preparations')
          .upsert(
            {
              preparation_id: preparation.id,
              order_id: orderId,
              order_line_item_id: itemId,
              product_id: item.product_id,
              dataset_id: item.dataset_id,
              requested_quantity: item.ordered_quantity,
              approved_quantity: approvedQuantity,
              status,
              shortage_reason: status === 'ready' ? null : reason,
              note: note ?? null,
              barcode_validated_at: new Date().toISOString(),
              confirmed_at: new Date().toISOString(),
              confirmed_by_profile_id: actorProfileId,
            },
            { onConflict: 'preparation_id,order_line_item_id' },
          );

        if (error) throw new Error(error.message);

        await logDispatcherActivity({
          action: status === 'ready' ? 'confirm_item_ready' : 'confirm_item_shortage',
          order,
          item,
          details: { approved_quantity: approvedQuantity, reason: status === 'ready' ? null : reason, note: note ?? null },
        });

        await get().loadOrderDetail(orderId);
      },

      selectOrder: (id) => set({ selectedOrderId: id }),
      setStatusFilter: (filter) => set({ statusFilter: filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      confirmItem: async (orderId, itemId, confirmedQty) => {
        await get().confirmPreparedItem(orderId, itemId, confirmedQty);
      },

      reduceItem: async (orderId, itemId, confirmedQty, reason, note) => {
        await get().confirmPreparedItem(orderId, itemId, confirmedQty, reason, note);
      },

      markItemUnavailable: async (orderId, itemId, reason, note) => {
        await get().confirmPreparedItem(orderId, itemId, 0, reason, note);
      },

      completePreparation: async (orderId) => {
        const order = await get().loadOrderDetail(orderId);
        if (!order) throw new Error('Order not found');
        if (order.items.some((item) => item.preparation_status === 'pending')) {
          throw new Error('يجب تجهيز كل المنتجات قبل إكمال الطلب');
        }

        if (!order.items.some((item) => item.confirmed_quantity > 0 && item.preparation_status !== 'unavailable')) {
          throw new Error('Cannot complete preparation without at least one available item.');
        }

        const preparation = await fetchPreparation(orderId);
        if (!preparation) throw new Error('Preparation record not found');

        const completedAt = new Date();
        const startedAt = new Date(preparation.started_at);
        const durationSeconds = Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000));
        const hasShortage = order.items.some((item) => item.preparation_status === 'partial' || item.preparation_status === 'unavailable');
        const deliveryStatus = 'ready_dispatch';

        const { error: prepError } = await supabase
          .from('dispatcher_order_preparations')
          .update({
            status: 'ready',
            completed_at: completedAt.toISOString(),
            duration_seconds: durationSeconds,
          })
          .eq('id', preparation.id);
        if (prepError) throw new Error(prepError.message);

        const { error: orderError } = await supabase
          .from('orders')
          .update({
            delivery_status: deliveryStatus,
            status: 'processing',
          })
          .eq('id', orderId);
        if (orderError) throw new Error(orderError.message);

        await logDispatcherActivity({
          action: 'complete_preparation',
          order,
          details: {
            delivery_status: deliveryStatus,
            has_shortage: hasShortage,
            duration_seconds: durationSeconds,
            approved_items: order.items.map((item) => ({
              order_line_item_id: item.id,
              approved_quantity: item.confirmed_quantity,
              shortage_reason: item.unavailability_reason,
            })),
          },
        });

        await get().loadOrderDetail(orderId);
      },

      bulkMarkAllOrderItemsReady: async (orderId: string) => {
        const { data, error } = await supabase.rpc('dispatcher_bulk_mark_all_order_items_ready', {
          p_order_id: orderId,
        });
        if (error) throw new Error(error.message);

        const result = data as { updated: number };
        await get().loadOrderDetail(orderId);
        return result.updated ?? 0;
      },

      loadActivityLog: async (orderId) => {
        try {
          let query = supabase.from('dispatcher_activity_log').select('*').order('created_at', { ascending: false }).limit(50);
          if (orderId) query = query.eq('entity_id', orderId);
          const { data } = await query;
          set({ activityLog: (data as ActivityLogEntry[]) ?? [] });
        } catch {
          set({ activityLog: [] });
        }
      },

      getFilteredOrders: () => {
        const { orders, statusFilter, searchQuery } = get();
        let filtered = orders;
        if (statusFilter !== 'all') {
          filtered = filtered.filter((order) => order.preparation_status === statusFilter);
        }
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          filtered = filtered.filter(
            (order) =>
              order.odoo_order_name?.toLowerCase().includes(q) ||
              order.customer_name?.toLowerCase().includes(q) ||
              order.po_number?.toLowerCase().includes(q),
          );
        }
        return filtered;
      },

      getStats: () => {
        const { orders } = get();
        return {
          total: orders.length,
          pending: orders.filter((order) => order.preparation_status === 'pending').length,
          preparing: orders.filter((order) => order.preparation_status === 'preparing').length,
          ready: orders.filter((order) => order.preparation_status === 'ready').length,
          waitingPickup: orders.filter((order) => order.preparation_status === 'waiting_pickup').length,
        };
      },
    }),
    {
      name: 'dispatcher-order-storage',
      partialize: (state) => ({ statusFilter: state.statusFilter, searchQuery: state.searchQuery }),
    },
  ),
);
