import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  DollarSign,
  CreditCard,
  FileCheck,
  ArrowRightLeft,
  Plus,
  Trash2,
  Camera,
  Upload,
} from 'lucide-react';
import type { ShipmentOrder, CollectionPaymentMethod, PaymentLeg } from '@/types';
import { formatMoney } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { uploadDeliveryProof } from '@/services/shipmentData';

interface SalesRep {
  id: string;
  full_name: string | null;
  role: string | null;
}

const NOT_COLLECTED_REASONS = [
  'العميل غير متواجد',
  'رفض الاستلام',
  'المبلغ غير متطابق',
  'مشكلة في الطلب',
  'أخرى',
];

interface CollectionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  shipmentId: string;
  orders: ShipmentOrder[];
  onComplete: () => void;
}

const PAYMENT_METHODS: { value: CollectionPaymentMethod; label: string; icon: typeof DollarSign; color: string }[] = [
  { value: 'cash', label: 'نقدي', icon: DollarSign, color: 'text-green-600 bg-green-50 border-green-200' },
  { value: 'credit', label: 'آجل', icon: CreditCard, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  { value: 'cheque', label: 'شيك', icon: FileCheck, color: 'text-purple-600 bg-purple-50 border-purple-200' },
  { value: 'bank_transfer', label: 'تحويل بنكي', icon: ArrowRightLeft, color: 'text-blue-600 bg-blue-50 border-blue-200' },
];

/** Payment methods that cannot be settled without an accountable sales rep. */
const REP_REQUIRED_METHODS: CollectionPaymentMethod[] = ['bank_transfer'];

const METHOD_LABELS: Record<string, string> = {
  cash: 'نقدي',
  credit: 'آجل',
  cheque: 'شيك',
  bank_transfer: 'تحويل بنكي',
};

/**
 * Turns anything thrown into a readable message.
 * Supabase/PostgREST failures arrive as a plain `PostgrestError` object, NOT an
 * `Error` instance, so `err instanceof Error` was always false and every real
 * database failure was replaced by a generic sentence. Never swallow them again.
 */
function describeError(err: unknown, fallback: string): string {
  if (typeof err === 'string' && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const parts: string[] = [];
    if (typeof e.message === 'string' && e.message.trim()) parts.push(e.message.trim());
    if (typeof e.details === 'string' && e.details.trim()) parts.push(e.details.trim());
    if (typeof e.hint === 'string' && e.hint.trim()) parts.push(e.hint.trim());
    if (parts.length) return parts.join(' — ');
    if (typeof e.code === 'string' && e.code.trim()) return `خطأ من قاعدة البيانات (${e.code})`;
  }
  return fallback;
}



export default function CollectionSheet({ isOpen, onClose, shipmentId, orders, onComplete }: CollectionSheetProps) {
  const [orderLegs, setOrderLegs] = useState<Record<string, PaymentLeg[]>>({});
  const [driverNotes, setDriverNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);

  // Not-collected state
  const [notCollectedMode, setNotCollectedMode] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [notCollectedNotes, setNotCollectedNotes] = useState('');
  const [notCollectedPhoto, setNotCollectedPhoto] = useState<File | null>(null);
  const [notCollectedPhotoPreview, setNotCollectedPhotoPreview] = useState<string | null>(null);

  // Photo state for collected mode (cash/bank_transfer)
  const [collectedPhoto, setCollectedPhoto] = useState<File | null>(null);
  const [collectedPhotoPreview, setCollectedPhotoPreview] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const user = useAuthStore((s) => s.user);

  // Fetch telesales reps via SECURITY DEFINER RPC (bypasses RLS)
  useEffect(() => {
    if (!isOpen) return;
    const fetchReps = async () => {
      const { data } = await supabase.rpc('get_telesales_reps');
      setSalesReps((data ?? []) as SalesRep[]);
    };
    void fetchReps();
  }, [isOpen]);

  // Derived: does any order have a cash/bank_transfer leg?
  const needsCollectionPhoto = useMemo(
    () =>
      orders.some((o) =>
        (orderLegs[o.orderId] ?? []).some(
          (l) => l.method === 'cash' || l.method === 'bank_transfer'
        )
      ),
    [orders, orderLegs]
  );

  // Camera for collected photo
  useEffect(() => {
    if (!isOpen || notCollectedMode) return;
    if (!needsCollectionPhoto) return;
    if (collectedPhotoPreview) return;

    let active = true;
    const stopCamera = () => {
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      setCameraReady(false);
    };
    const startCamera = async () => {
      setCameraError(null);
      setCameraReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch {
        setCameraError('تعذر تشغيل الكاميرا. يمكنك رفع صورة من الملفات.');
      }
    };
    void startCamera();
    return () => { active = false; stopCamera(); };
  }, [isOpen, notCollectedMode, needsCollectionPhoto, collectedPhotoPreview]);

  const getLegs = (orderId: string): PaymentLeg[] => orderLegs[orderId] ?? [];
  const legsTotal = (orderId: string) => getLegs(orderId).reduce((s, l) => s + (l.amount || 0), 0);

  const addLeg = (orderId: string, method: CollectionPaymentMethod) => {
    setOrderLegs((prev) => {
      const existing = prev[orderId] ?? [];
      return { ...prev, [orderId]: [...existing, { method, amount: 0 }] };
    });
  };

  const updateLeg = (orderId: string, index: number, patch: Partial<PaymentLeg>) => {
    setOrderLegs((prev) => {
      const existing = [...(prev[orderId] ?? [])];
      existing[index] = { ...existing[index], ...patch };
      return { ...prev, [orderId]: existing };
    });
  };

  const removeLeg = (orderId: string, index: number) => {
    setOrderLegs((prev) => {
      const existing = [...(prev[orderId] ?? [])];
      existing.splice(index, 1);
      return { ...prev, [orderId]: existing };
    });
  };

  const getOrderAmount = (order: ShipmentOrder) => order.deliveredInvoiceAmount ?? order.orderTotal;

  const handleCaptureCollectedPhoto = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setCameraError('تعذر التقاط صورة.'); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.92));
    if (!blob) { setCameraError('تعذر إنشاء الصورة.'); return; }
    const file = new File([blob], `collection-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setCollectedPhoto(file);
    setCollectedPhotoPreview(URL.createObjectURL(file));
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setCameraReady(false);
  };

  const handleCollectedPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCollectedPhoto(file);
    setCollectedPhotoPreview(URL.createObjectURL(file));
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setCameraReady(false);
  };

  const handleNotCollectedPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotCollectedPhoto(file);
    setNotCollectedPhotoPreview(URL.createObjectURL(file));
  };

  const resetAll = () => {
    setOrderLegs({});
    setDriverNotes({});
    setNotCollectedMode(false);
    setSelectedReason('');
    setCustomReason('');
    setNotCollectedNotes('');
    setNotCollectedPhoto(null);
    setNotCollectedPhotoPreview(null);
    setCollectedPhoto(null);
    setCollectedPhotoPreview(null);
    setCameraReady(false);
    setCameraError(null);
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
  };

  const handleSubmit = async () => {
    if (!user?.id || orders.length === 0) return;

    // --- NOT COLLECTED ---
    if (notCollectedMode) {
      if (!selectedReason) {
        setError('اختر سبب عدم التحصيل');
        return;
      }
      if (selectedReason === 'أخرى' && !customReason.trim()) {
        setError('اكتب السبب');
        return;
      }

      setSubmitting(true);
      setError(null);
      try {
        let proofPhotoUrl: string | null = null;
        if (notCollectedPhoto) {
          proofPhotoUrl = await uploadDeliveryProof(user.id, notCollectedPhoto);
        }

        const { error: rpcError } = await supabase.rpc('driver_submit_collection_check', {
          p_shipment_id: shipmentId,
          p_check_status: 'not_collected',
          p_reason: selectedReason === 'أخرى' ? customReason.trim() : selectedReason,
          p_driver_notes: notCollectedNotes.trim() || null,
          p_proof_photo_url: proofPhotoUrl,
        });

        if (rpcError) throw rpcError;
        setSubmitted(true);
        setTimeout(() => {
          onComplete();
          onClose();
          resetAll();
          setSubmitted(false);
        }, 1500);
      } catch (err) {
        setError(describeError(err, 'تعذر تسجيل عدم التحصيل'));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // --- COLLECTED ---
    const hasAnyLegs = orders.some((o) => getLegs(o.orderId).length > 0);
    if (!hasAnyLegs) {
      setError('يجب إضافة طريقة تحصيل واحدة على الأقل');
      return;
    }

    // Validate each order has legs covering the full amount
    for (const order of orders) {
      const legs = getLegs(order.orderId);
      if (legs.length === 0) continue;
      const orderAmount = getOrderAmount(order);
      const total = legsTotal(order.orderId);
      if (total < orderAmount - 0.01) {
        setError(`مبلغ التحصيل غير مكتمل — متبقي ${formatMoney(orderAmount - total, 'EGP')} للطلب ${order.orderNumber ?? ''}`);
        return;
      }
      if (total > orderAmount + 0.01) {
        setError(`مبلغ التحصيل يتجاوز المطلوب — الزائد ${formatMoney(total - orderAmount, 'EGP')}`);
        return;
      }
      // A bank transfer is settled outside the driver's hands, so it must be
      // attributed to a sales rep. The database rejects the row without one
      // (logistics_order_collections_bank_transfer_rep_check) — catch it here
      // with an actionable message instead of a constraint violation.
      const missingRepLeg = legs.find(
        (leg) => REP_REQUIRED_METHODS.includes(leg.method) && !leg.salesRepId,
      );
      if (missingRepLeg) {
        setError(
          `يجب اختيار مندوب لطريقة «${METHOD_LABELS[missingRepLeg.method] ?? missingRepLeg.method}» — الطلب ${order.orderNumber ?? ''}`,
        );
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const orderCollections = orders.map((order) => {
        const legs = getLegs(order.orderId);
        const primaryLeg = legs.length === 1 ? legs[0] : null;
        // The accountable rep is whoever the bank-transfer leg points at; for
        // split payments fall back to the first leg that carries one. Reading
        // it from the legs is what actually reaches the database.
        const repLeg =
          legs.find((leg) => leg.method === 'bank_transfer' && leg.salesRepId) ??
          legs.find((leg) => leg.salesRepId) ??
          null;
        const salesRepId = primaryLeg?.salesRepId ?? repLeg?.salesRepId;
        const salesRep = salesReps.find((rep) => rep.id === salesRepId);

        return {
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          orderTotal: getOrderAmount(order),
          paymentMethod: primaryLeg?.method ?? (legs[0]?.method ?? 'credit'),
          salesRepId: salesRepId || undefined,
          salesRepName: salesRep?.full_name ?? undefined,
          chequeReference: primaryLeg?.chequeReference ?? undefined,
          driverNotes: driverNotes[order.orderId] ?? undefined,
          payments: legs.length > 0 ? legs : undefined,
        };
      });

      let proofPhotoUrl: string | null = null;
      if (collectedPhoto) {
        proofPhotoUrl = await uploadDeliveryProof(user.id, collectedPhoto);
      }


      const { error: rpcError } = await supabase.rpc('driver_submit_order_collections', {
        p_shipment_id: shipmentId,
        p_order_collections: orderCollections,
        p_check_status: 'collected',
        p_proof_photo_url: proofPhotoUrl,
        p_check_sales_rep_id: orderCollections.find((o) => o.salesRepId)?.salesRepId ?? null,
      });

      if (rpcError) throw rpcError;

      setSubmitted(true);
      setTimeout(() => {
        onComplete();
        onClose();
        resetAll();
        setSubmitted(false);
      }, 1500);
    } catch (err) {
      setError(describeError(err, 'حدث خطأ أثناء إرسال التحصيل'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6"
            onClick={onClose}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-8 text-center max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <CheckCircle size={64} className="text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-app-text mt-4">
                {notCollectedMode ? 'تم تسجيل عدم التحصيل' : 'تم تسجيل التحصيل'}
              </h3>
              <p className="text-sm text-app-text-secondary mt-2">
                {notCollectedMode ? 'تم إرسال السبب بنجاح' : 'تم إرسال بيانات التحصيل بنجاح'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-app-text">
                  {notCollectedMode ? 'تسجيل عدم التحصيل' : 'تحصيل المبلغ'}
                </h3>
                <p className="text-xs text-app-text-secondary">{orders.length} طلب</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-500">×</span>
              </button>
            </div>

            {/* Toggle: Collected / Not Collected */}
            <div className="px-4 pt-3 flex gap-2">
              <button
                onClick={() => { setNotCollectedMode(false); setError(null); }}
                className={`flex-1 h-10 rounded-lg text-xs font-semibold transition-all border ${
                  !notCollectedMode
                    ? 'border-success-400 bg-success-50 text-success-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                تم التحصيل
              </button>
              <button
                onClick={() => { setNotCollectedMode(true); setError(null); }}
                className={`flex-1 h-10 rounded-lg text-xs font-semibold transition-all border ${
                  notCollectedMode
                    ? 'border-error-400 bg-error-50 text-error-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}
              >
                عدم التحصيل
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* === NOT COLLECTED MODE === */}
              {notCollectedMode && (
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-app-text-secondary">اختر السبب *</p>
                  <div className="space-y-2">
                    {NOT_COLLECTED_REASONS.map((reason) => (
                      <button
                        key={reason}
                        onClick={() => setSelectedReason(reason)}
                        className={`w-full h-11 rounded-lg border text-sm font-semibold text-right px-3 transition-all ${
                          selectedReason === reason
                            ? 'border-error-400 bg-error-50 text-error-700'
                            : 'border-gray-200 bg-white text-app-text hover:bg-brand-25'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  {selectedReason === 'أخرى' && (
                    <input
                      type="text"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="اكتب السبب *"
                      className="w-full h-10 bg-brand-25 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-app-accent"
                    />
                  )}

                  {/* Photo upload (optional) */}
                  <div>
                    <label className="text-xs font-medium text-app-text-secondary mb-1 block">
                      صورة إثبات (اختياري)
                    </label>
                    {notCollectedPhotoPreview ? (
                      <div className="relative">
                        <img src={notCollectedPhotoPreview} alt="إثبات" className="w-full rounded-xl aspect-video object-cover" />
                        <button
                          onClick={() => { setNotCollectedPhoto(null); setNotCollectedPhotoPreview(null); }}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                        >
                          <XCircle size={14} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center justify-center gap-2 h-11 bg-gray-100 rounded-xl cursor-pointer active:scale-[0.97]">
                        <Upload size={16} />
                        <span className="text-sm font-medium text-gray-600">رفع صورة</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleNotCollectedPhotoUpload} />
                      </label>
                    )}
                  </div>

                  <input
                    type="text"
                    value={notCollectedNotes}
                    onChange={(e) => setNotCollectedNotes(e.target.value)}
                    placeholder="ملاحظات (اختياري)..."
                    className="w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-xs text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
              )}

              {/* === COLLECTED MODE === */}
              {!notCollectedMode && orders.map((order) => {
                const legs = getLegs(order.orderId);
                const total = legsTotal(order.orderId);
                const orderAmount = getOrderAmount(order);
                const remaining = orderAmount - total;

                return (
                  <div key={order.orderId} className="bg-brand-25 rounded-xl p-4">
                    {/* Order Info */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-app-text">
                          {order.orderNumber ?? `طلب #${order.orderId.slice(0, 8)}`}
                        </p>
                        {order.paymentTerm && (
                          <p className="text-xs text-app-text-secondary">{order.paymentTerm}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-app-text">
                          {formatMoney(orderAmount, 'EGP')}
                        </p>
                        {order.deliveredInvoiceAmount != null && order.deliveredInvoiceAmount < order.orderTotal && (
                          <p className="text-[10px] text-app-text-secondary line-through">
                            {formatMoney(order.orderTotal, 'EGP')} الأصلية
                          </p>
                        )}
                        {legs.length > 0 && remaining > 0.01 && (
                          <p className="text-xs text-orange-600">
                            متبقي {formatMoney(remaining, 'EGP')}
                          </p>
                        )}
                        {legs.length > 0 && Math.abs(remaining) < 0.01 && (
                          <p className="text-xs text-green-600">تم التغطية كاملة</p>
                        )}
                      </div>
                    </div>

                    {/* Existing Legs */}
                    {legs.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {legs.map((leg, idx) => {
                          const pm = PAYMENT_METHODS.find((p) => p.value === leg.method);
                          return (
                            <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                                pm?.color ?? 'border-gray-200 bg-white text-gray-600'
                              }`}>
                                {pm?.label ?? leg.method}
                              </span>
                              <input
                                type="number"
                                min="0"
                                max={Math.max(0, remaining + (leg.amount || 0))}
                                step="0.01"
                                value={leg.amount || ''}
                                onChange={(e) => {
                                  const val = Math.min(Number(e.target.value) || 0, remaining + (leg.amount || 0));
                                  updateLeg(order.orderId, idx, { amount: val });
                                }}
                                className="flex-1 h-8 bg-gray-50 border border-gray-200 rounded px-2 text-xs text-center font-semibold text-app-text"
                                placeholder="المبلغ"
                              />
                              {leg.method === 'bank_transfer' && (
                                <select
                                  value={leg.salesRepId ?? ''}
                                  onChange={(e) => updateLeg(order.orderId, idx, { salesRepId: e.target.value })}
                                  className="h-8 bg-white border border-gray-200 rounded px-1 text-[10px] text-app-text max-w-[90px]"
                                >
                                  <option value="">مندوب</option>
                                  {salesReps.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.full_name ?? r.id}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {leg.method === 'cheque' && (
                                <input
                                  type="text"
                                  value={leg.chequeReference ?? ''}
                                  onChange={(e) => updateLeg(order.orderId, idx, { chequeReference: e.target.value })}
                                  className="h-8 bg-white border border-gray-200 rounded px-1 text-[10px] text-app-text max-w-[80px]"
                                  placeholder="رقم الشيك"
                                />
                              )}
                              <button
                                type="button"
                                onClick={() => removeLeg(order.orderId, idx)}
                                className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-600"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Payment Leg Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_METHODS.map((pm) => {
                        const Icon = pm.icon;
                        const canAdd = remaining > 0.01;
                        return (
                          <button
                            key={pm.value}
                            onClick={() => addLeg(order.orderId, pm.value)}
                            disabled={!canAdd}
                            className="flex items-center gap-1 py-1.5 px-2.5 rounded-lg border border-dashed border-gray-300 bg-white text-[11px] font-medium text-gray-600 active:bg-brand-25 transition-all disabled:opacity-30"
                          >
                            <Plus size={12} />
                            <Icon size={12} />
                            <span>{pm.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Driver Notes */}
                    <div className="mt-2">
                      <input
                        type="text"
                        value={driverNotes[order.orderId] ?? ''}
                        onChange={(e) =>
                          setDriverNotes((prev) => ({ ...prev, [order.orderId]: e.target.value }))
                        }
                        placeholder="ملاحظات (اختياري)..."
                        className="w-full h-9 bg-white border border-gray-200 rounded-lg px-3 text-xs text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent"
                      />
                    </div>
                  </div>
                );
              })}

              {/* Collected: Photo upload (for cash/bank_transfer) */}
              {!notCollectedMode && orders.some((o) => {
                const legs = getLegs(o.orderId);
                return legs.some((l) => l.method === 'cash' || l.method === 'bank_transfer');
              }) && (
                <div>
                  <label className="text-xs font-medium text-app-text-secondary mb-1 block">
                    صورة الإثبات (اختياري)
                  </label>
                  {collectedPhotoPreview ? (
                    <div className="relative">
                      <img src={collectedPhotoPreview} alt="إثبات" className="w-full rounded-xl aspect-video object-cover" />
                      <button
                        onClick={() => { setCollectedPhoto(null); setCollectedPhotoPreview(null); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <XCircle size={14} className="text-white" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <video
                        ref={videoRef}
                        className="w-full rounded-xl bg-black aspect-video object-cover"
                        playsInline muted
                      />
                      {cameraError && <p className="text-xs text-red-500 text-center">{cameraError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={handleCaptureCollectedPhoto}
                          disabled={!cameraReady}
                          className="flex-1 h-11 bg-app-dark text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50"
                        >
                          <Camera size={16} />
                          تصوير
                        </button>
                        <label className="flex-1 h-11 bg-gray-100 text-app-text rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]">
                          <Upload size={16} />
                          رفع صورة
                          <input type="file" accept="image/*" className="hidden" onChange={handleCollectedPhotoUpload} />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100">
              {error && (
                <p className="text-sm text-red-500 mb-2 text-center">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={
                  submitting ||
                  (!notCollectedMode && orders.every((o) => getLegs(o.orderId).length === 0)) ||
                  (notCollectedMode && !selectedReason)
                }
                className={`w-full h-[52px] rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white ${
                  notCollectedMode ? 'bg-error-500' : 'bg-app-dark'
                }`}
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    {notCollectedMode ? <XCircle size={18} /> : <DollarSign size={18} />}
                    {notCollectedMode ? 'تسجيل عدم التحصيل' : 'تسجيل التحصيل'}
                  </>
                )}
              </button>
              <button
                onClick={onClose}
                className="w-full h-12 text-app-accent font-semibold mt-2"
              >
                إلغاء
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
