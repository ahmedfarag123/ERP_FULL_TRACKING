import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  Camera,
  Upload,
} from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import AppHeader from '@/components/AppHeader';
import {
  submitCollectionCheck,
  fetchPlanCollectionChecks,
} from '@/services/collectionHandover';
import { uploadDeliveryProof } from '@/services/shipmentData';
import { supabase } from '@/lib/supabase';
import CollectionSheet from '@/components/CollectionSheet';
import type {
  PlanCollectionCheck,
  CollectionCheckStatus,
  CollectionPaymentMethod,
  Shipment,
  ShipmentOrder,
} from '@/types';

interface SalesRep {
  id: string;
  full_name: string | null;
}

const PAYMENT_METHODS: { value: CollectionPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'credit', label: 'أقساط' },
  { value: 'cheque', label: 'شيك' },
];

const NOT_COLLECTED_REASONS = [
  'العميل غير متواجد',
  'رفض الاستلام',
  'المبلغ غير متطابق',
  'مشكلة في الطلب',
  'أخرى',
];

export default function CollectionScreen() {
  const shipments = useDeliveryStore((s) => s.shipments);
  const loadShipments = useDeliveryStore((s) => s.loadShipments);
  const getPlans = useDeliveryStore((s) => s.getPlans);
  const showToast = useUIStore((s) => s.showToast);
  const user = useAuthStore((s) => s.user);

  const [checks, setChecks] = useState<PlanCollectionCheck[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);

  // Modal state
  const [modalShipment, setModalShipment] = useState<Shipment | null>(null);

  // Unified collection sheet
  const [sheetShipmentId, setSheetShipmentId] = useState<string | null>(null);
  const [sheetOrders, setSheetOrders] = useState<ShipmentOrder[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [modalType, setModalType] = useState<'collected' | 'not_collected' | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<CollectionPaymentMethod | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [driverNotes, setDriverNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Image capture state
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Sales rep state
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [selectedSalesRepId, setSelectedSalesRepId] = useState<string>('');

  useEffect(() => {
    loadShipments();
  }, [loadShipments]);

  const loadChecks = async () => {
    try {
      const data = await fetchPlanCollectionChecks();
      setChecks(data);
    } catch {
      // non-critical
    }
  };

  useEffect(() => { void loadChecks(); }, []);

  // Camera
  useEffect(() => {
    if (modalType !== 'collected') return;
    if (selectedPaymentMethod !== 'cash' && selectedPaymentMethod !== 'bank_transfer') return;

    let active = true;

    const stopCamera = () => {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
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
      } catch (error) {
        setCameraError('تعذر تشغيل الكاميرا. افتح التطبيق من الرابط الرسمي https://horecasmartos.duckdns.org/driver على HTTPS، أو اسمح للكاميرا من إعدادات الموقع، أو ارفع صورة من الملفات.');
      }
    };

    void startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [modalType, selectedPaymentMethod]);

  // Sales reps
  useEffect(() => {
    if (modalType !== 'collected') return;
    const fetchReps = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['sales_agent', 'telesales'])
        .eq('status', 'active')
        .order('full_name');
      setSalesReps((data ?? []) as SalesRep[]);
    };
    void fetchReps();
  }, [modalType]);

  const plans = useMemo(() => getPlans(), [getPlans]);

  const checksByShipment = useMemo(() => {
    const map = new Map<string, PlanCollectionCheck>();
    for (const check of checks) {
      map.set(check.shipmentId, check);
    }
    return map;
  }, [checks]);

  const planStats = useMemo(() => {
    const stats = new Map<string, { total: number; checked: number; collected: number }>();
    for (const plan of plans) {
      stats.set(plan.id, { total: plan.totalShipments, checked: 0, collected: 0 });
    }
    for (const check of checks) {
      const s = stats.get(check.planId);
      if (s) {
        s.checked++;
        if (check.checkStatus === 'collected') s.collected++;
      }
    }
    return stats;
  }, [plans, checks]);

  const overallStats = useMemo(() => {
    let totalShipments = 0;
    let checked = 0;
    let collected = 0;
    for (const s of planStats.values()) {
      totalShipments += s.total;
      checked += s.checked;
      collected += s.collected;
    }
    return { totalShipments, checked, collected, pending: totalShipments - checked };
  }, [planStats]);

  const openCollectedModal = (shipment: Shipment) => {
    setSheetShipmentId(shipment.id);
    setSheetOrders(shipment.orders ?? []);
    setShowSheet(true);
  };

  const openNotCollectedModal = (shipment: Shipment) => {
    setSheetShipmentId(shipment.id);
    setSheetOrders(shipment.orders ?? []);
    setShowSheet(true);
  };

  const resetProofImage = () => {
    if (proofPhoto) URL.revokeObjectURL(proofPhoto);
    setProofPhoto(null);
    setProofFile(null);
    setCameraError(null);
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setCameraReady(false);
  };

  const closeModal = () => {
    setModalShipment(null);
    setModalType(null);
    setSelectedPaymentMethod(null);
    setSelectedSalesRepId('');
    setSelectedReason('');
    setCustomReason('');
    setDriverNotes('');
    resetProofImage();
  };

  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) { setCameraError('تعذر التقاط صورة من الكاميرا.'); return; }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) { setCameraError('تعذر إنشاء الصورة.'); return; }

    if (proofPhoto) URL.revokeObjectURL(proofPhoto);
    const file = new File([blob], `collection-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setProofFile(file);
    setProofPhoto(URL.createObjectURL(file));

    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setCameraReady(false);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (proofPhoto) URL.revokeObjectURL(proofPhoto);
    setProofFile(file);
    setProofPhoto(URL.createObjectURL(file));

    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setCameraReady(false);
  };

  const handleSubmitCheck = async () => {
    if (!modalShipment || !modalType) return;

    if (modalType === 'collected' && !selectedPaymentMethod) {
      showToast('اختر طريقة الدفع', 'error');
      return;
    }

    if (modalType === 'collected' && selectedPaymentMethod === 'cash') {
      if (!proofFile) {
        showToast('صورة الإثبات مطلوبة للتحصيل النقدي', 'error');
        return;
      }
    }

    if (modalType === 'collected' && selectedPaymentMethod === 'bank_transfer') {
      if (!selectedSalesRepId) {
        showToast('اختر مندوب المبيعات للتحويل البنكي', 'error');
        return;
      }
    }

    if (modalType === 'not_collected') {
      if (!selectedReason) {
        showToast('اختر سبب عدم التحصيل', 'error');
        return;
      }
      if (selectedReason === 'أخرى' && !customReason.trim()) {
        showToast('اكتب السبب', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      let proofPhotoUrl: string | null = null;
      if (proofFile && (selectedPaymentMethod === 'cash' || selectedPaymentMethod === 'bank_transfer')) {
        proofPhotoUrl = await uploadDeliveryProof(user?.id ?? '', proofFile);
      }

      await submitCollectionCheck({
        shipmentId: modalShipment.id,
        checkStatus: modalType as CollectionCheckStatus,
        paymentMethod: modalType === 'collected' ? selectedPaymentMethod : null,
        reason: modalType === 'not_collected' ? (selectedReason === 'أخرى' ? customReason.trim() : selectedReason) : null,
        driverNotes: driverNotes.trim() || null,
        proofPhotoUrl,
        salesRepId: selectedSalesRepId || null,
      });
      showToast(modalType === 'collected' ? 'تم تسجيل التحصيل' : 'تم تسجيل عدم التحصيل');
      closeModal();
      await loadChecks();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'حدث خطأ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title="التحصيل" />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {/* Summary Cards */}
        <div className="mx-4 mt-4 grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 shadow-card text-center">
            <CheckCircle size={20} className="text-app-success mx-auto mb-1" />
            <p className="text-lg font-bold text-app-text">{overallStats.collected}</p>
            <p className="text-[10px] text-app-text-secondary">محصل</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-card text-center">
            <Clock size={20} className="text-app-warning mx-auto mb-1" />
            <p className="text-lg font-bold text-app-text">{overallStats.pending}</p>
            <p className="text-[10px] text-app-text-secondary">معلق</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-card text-center">
            <Package size={20} className="text-app-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-app-text">{overallStats.totalShipments}</p>
            <p className="text-[10px] text-app-text-secondary">إجمالي</p>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="mx-4 mt-4 space-y-3">
          {plans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package size={48} className="text-gray-300 mb-3" />
              <p className="text-sm font-semibold text-app-text-secondary">لا توجد خطط مسندة</p>
            </div>
          ) : (
            plans.map((plan) => {
              const ps = planStats.get(plan.id) ?? { total: 0, checked: 0, collected: 0 };
              const isExpanded = expandedPlanId === plan.id;
              const planShipments = shipments.filter((s) => s.planId === plan.id);
              const allChecked = ps.checked === ps.total && ps.total > 0;

              return (
                <motion.div
                  key={plan.id}
                  className="bg-white rounded-xl shadow-card overflow-hidden"
                  layout
                >
                  {/* Plan Header */}
                  <button
                    onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}
                    className="w-full px-4 py-3 flex items-center gap-3"
                  >
                    <div className="flex-1 text-right">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-app-text">
                          {plan.plannedDate ? (() => {
                            const d = new Date(plan.plannedDate + "T00:00:00");
                            const days = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
                            const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
                            return `خط سير ${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
                          })() : (plan.planReference || `خطة ${plan.id.slice(0, 8)}`)}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            allChecked
                              ? 'bg-success-50 text-success-600'
                              : 'bg-warning-50 text-warning-600'
                          }`}
                        >
                          {allChecked ? 'مكتمل' : `${ps.checked}/${ps.total}`}
                        </span>
                      </div>
                      {plan.plannedDate && (
                        <p className="text-[11px] text-app-text-secondary mt-0.5">
                          {new Date(plan.plannedDate).toLocaleDateString('ar-EG')}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                           <div className="w-2 h-2 rounded-full bg-success-500" />
                          <span className="text-[10px] text-app-text-secondary">{ps.collected} تحصيل</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <div className="w-2 h-2 rounded-full bg-warning-500" />
                          <span className="text-[10px] text-app-text-secondary">{ps.total - ps.checked} معلق</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Shipments */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-100"
                      >
                        {planShipments.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-sm text-app-text-secondary">لا توجد شحنات في هذه الخطة</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-gray-50">
                            {planShipments.map((shipment) => {
                              const check = checksByShipment.get(shipment.id);
                              const isChecked = !!check;
                              const isCollected = check?.checkStatus === 'collected';

                              return (
                                <div
                                  key={shipment.id}
                                  className="px-4 py-3"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-25 flex items-center justify-center flex-shrink-0">
                                      <Package size={14} className="text-gray-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-app-text truncate">
                                        {shipment.customerName ?? `#${shipment.id}`}
                                      </p>
                                      {isChecked && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                          {isCollected ? (
                                             <span className="text-[10px] font-medium text-success-600 bg-success-50 px-1.5 py-0.5 rounded">
                                               تحصيل - {PAYMENT_METHODS.find((m) => m.value === check?.paymentMethod)?.label}
                                             </span>
                                           ) : (
                                             <span className="text-[10px] font-medium text-error-600 bg-error-50 px-1.5 py-0.5 rounded">
                                              غير محصل - {check?.reason}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {!isChecked && (
                                    <div className="flex gap-2 mt-2 pl-11">
                                      <button
                                        onClick={() => openCollectedModal(shipment)}
                                         className="flex-1 h-9 bg-success-500 hover:bg-success-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:scale-[0.97] transition-all"
                                      >
                                        <CheckCircle size={14} />
                                        تم التحصيل
                                      </button>
                                      <button
                                        onClick={() => openNotCollectedModal(shipment)}
                                         className="flex-1 h-9 bg-error-500 hover:bg-error-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 active:scale-[0.97] transition-all"
                                      >
                                        <XCircle size={14} />
                                        غير محصل
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Collected Modal - Payment Method Selection */}
      <AnimatePresence>
        {modalType === 'collected' && modalShipment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 pb-8 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-app-text text-center mb-1">تسجيل التحصيل</h3>
              <p className="text-sm text-app-text-secondary text-center mb-4">
                {modalShipment.customerName ?? `شحنة ${modalShipment.id}`}
              </p>

              <p className="text-xs font-semibold text-app-text-secondary mb-2">اختر طريقة الدفع</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.value}
                    onClick={() => { setSelectedPaymentMethod(pm.value); resetProofImage(); setSelectedSalesRepId(''); }}
                    className={`h-11 rounded-lg border text-sm font-semibold transition-all ${
                      selectedPaymentMethod === pm.value
                        ? 'border-app-dark bg-app-dark text-white'
                        : 'border-gray-200 bg-white text-app-text hover:bg-brand-25 active:bg-brand-25'
                    }`}
                  >
                    {pm.label}
                  </button>
                ))}
              </div>

              {/* Cash: image required */}
              {selectedPaymentMethod === 'cash' && (
                <div className="mb-4">
                  <label className="text-sm font-medium text-app-text">
                    صورة الإثبات <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-app-text-secondary mb-2">قم بتصوير إيصال الدفع النقدي أو فاتورة التحصيل</p>
                  {!proofPhoto ? (
                    <div className="space-y-2">
                      <video
                        ref={videoRef}
                        className="w-full rounded-xl bg-black aspect-video object-cover"
                        playsInline
                        muted
                      />
                      {cameraError && <p className="text-xs text-red-500 text-center">{cameraError}</p>}
                      <div className="flex gap-2">
                        <button
                          onClick={handleCapturePhoto}
                          disabled={!cameraReady}
                          className="flex-1 h-11 bg-app-dark text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50"
                        >
                          <Camera size={16} />
                          تصوير
                        </button>
                        <label className="flex-1 h-11 bg-gray-100 text-app-text rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]">
                          <Upload size={16} />
                          رفع صورة
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={proofPhoto} alt="إثبات التحصيل" className="w-full rounded-xl aspect-video object-cover" />
                      <button
                        onClick={() => { if (proofPhoto) URL.revokeObjectURL(proofPhoto); setProofPhoto(null); setProofFile(null); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <XCircle size={14} className="text-white" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bank transfer: sales rep required + image optional */}
              {selectedPaymentMethod === 'bank_transfer' && (
                <>
                  <div className="mb-4">
                    <label className="text-xs font-medium text-app-text-secondary">
                      مندوب المبيعات <span className="text-red-500">*</span>
                    </label>
                    <div className="relative mt-1">
                      <select
                        value={selectedSalesRepId}
                        onChange={(e) => setSelectedSalesRepId(e.target.value)}
                        className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 pr-8 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent appearance-none"
                      >
                        <option value="">اختر مندوب المبيعات...</option>
                        {salesReps.map((rep) => (
                          <option key={rep.id} value={rep.id}>
                            {rep.full_name ?? rep.id}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-sm font-medium text-app-text">
                      صورة الإثبات <span className="text-gray-400">(اختياري)</span>
                    </label>
                    <p className="text-xs text-app-text-secondary mb-2">صورة إيصال التحويل البنكي</p>
                    {!proofPhoto ? (
                      <div className="space-y-2">
                        <video
                          ref={videoRef}
                          className="w-full rounded-xl bg-black aspect-video object-cover"
                          playsInline
                          muted
                        />
                        {cameraError && <p className="text-xs text-red-500 text-center">{cameraError}</p>}
                        <div className="flex gap-2">
                          <button
                            onClick={handleCapturePhoto}
                            disabled={!cameraReady}
                            className="flex-1 h-11 bg-app-dark text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50"
                          >
                            <Camera size={16} />
                            تصوير
                          </button>
                          <label className="flex-1 h-11 bg-gray-100 text-app-text rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]">
                            <Upload size={16} />
                            رفع صورة
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <img src={proofPhoto} alt="إثبات التحويل" className="w-full rounded-xl aspect-video object-cover" />
                        <button
                          onClick={() => { if (proofPhoto) URL.revokeObjectURL(proofPhoto); setProofPhoto(null); setProofFile(null); }}
                          className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                        >
                          <XCircle size={14} className="text-white" />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="mb-4">
                <label className="text-xs font-medium text-app-text-secondary">ملاحظة (اختياري)</label>
                <input
                  type="text"
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="أضف ملاحظة..."
                  className="w-full h-10 bg-brand-25 border border-gray-200 rounded-lg px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
              </div>

              <button
                onClick={() => void handleSubmitCheck()}
                disabled={
                  submitting ||
                  !selectedPaymentMethod ||
                  (selectedPaymentMethod === 'cash' && !proofFile) ||
                  (selectedPaymentMethod === 'bank_transfer' && !selectedSalesRepId)
                }
                className="w-full h-12 bg-success-500 text-white rounded-xl font-bold active:scale-[0.97] disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'تأكيد التحصيل'
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Not Collected Modal - Reason Selection */}
      <AnimatePresence>
        {modalType === 'not_collected' && modalShipment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center"
            onClick={closeModal}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-app-text text-center mb-1">تسجيل عدم التحصيل</h3>
              <p className="text-sm text-app-text-secondary text-center mb-4">
                {modalShipment.customerName ?? `شحنة ${modalShipment.id}`}
              </p>

              <p className="text-xs font-semibold text-app-text-secondary mb-2">اختر السبب *</p>
              <div className="space-y-2 mb-4">
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
                <div className="mb-4">
                  <label className="text-xs font-medium text-app-text-secondary">اكتب السبب *</label>
                  <input
                    type="text"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="سبب عدم التحصيل..."
                    className="w-full h-10 bg-brand-25 border border-gray-200 rounded-lg px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs font-medium text-app-text-secondary">ملاحظة (اختياري)</label>
                <input
                  type="text"
                  value={driverNotes}
                  onChange={(e) => setDriverNotes(e.target.value)}
                  placeholder="أضف ملاحظة..."
                  className="w-full h-10 bg-brand-25 border border-gray-200 rounded-lg px-3 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-app-accent"
                />
              </div>

              <button
                onClick={() => void handleSubmitCheck()}
                disabled={submitting || !selectedReason || (selectedReason === 'أخرى' && !customReason.trim())}
                className="w-full h-12 bg-error-500 text-white rounded-xl font-bold active:scale-[0.97] disabled:opacity-50 transition-all"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'تأكيد عدم التحصيل'
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Collection Sheet */}
      {sheetShipmentId && (
        <CollectionSheet
          isOpen={showSheet}
          onClose={() => {
            setShowSheet(false);
            setSheetShipmentId(null);
            setSheetOrders([]);
          }}
          shipmentId={sheetShipmentId}
          orders={sheetOrders}
          onComplete={() => {
            void loadChecks();
            loadShipments();
          }}
        />
      )}
    </div>
  );
}