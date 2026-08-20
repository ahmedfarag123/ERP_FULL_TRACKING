import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Phone,
  MapPin,
  CheckCircle,
  Truck,
  FileText,
  AlertTriangle,
  Camera,
  Lock,
  XCircle,
  RefreshCw,
  Package,
  DollarSign,
  Route,
  Scale,
  Minus,
  Plus,
} from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { uploadDeliveryProof, driverUpdateShipmentItems } from '@/services/shipmentData';
import StatusBadge from '@/components/StatusBadge';
import BottomSheet from '@/components/BottomSheet';
import CollectionSheet from '@/components/CollectionSheet';
import { formatMoney } from '@/lib/format';

function formatState(value: string | null | undefined) {
  if (!value) return 'غير محدد';
  const normalized = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    order_line: 'بند طلب',
    pending_delivery_amount: 'مبلغ التحصيل معلق',
    pending_confirmation: 'في انتظار التأكيد',
    collected_from_customer: 'تم التحصيل من العميل',
    collected_successfully: 'تم تأكيد التحصيل',
    cash: 'نقدي',
    immediate_payment: 'دفع فوري',
    immediate_payment_1: 'دفع فوري 1',
  };
  return labels[normalized] ?? value.replace(/[_-]+/g, ' ');
}

export default function ShipmentDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const isLoading = useDeliveryStore((s) => s.isLoading);
  const shipment = useDeliveryStore((s) => s.getShipmentById(id || ''));
  const updateStatus = useDeliveryStore((s) => s.updateShipmentStatus);
  const addNote = useDeliveryStore((s) => s.addShipmentNote);
  const setProofOfDelivery = useDeliveryStore((s) => s.setProofOfDelivery);
  const reportFailure = useDeliveryStore((s) => s.reportFailure);
  const getRouteGate = useDeliveryStore((s) => s.getRouteGate);
  const user = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [showPODSheet, setShowPODSheet] = useState(() => {
    return new URLSearchParams(window.location.search).get('pod') === '1';
  });
  const [showFailureSheet, setShowFailureSheet] = useState(false);
  const [showNoteSheet, setShowNoteSheet] = useState(false);
  const [showCollectionSheet, setShowCollectionSheet] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // POD form state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [podNotes, setPodNotes] = useState('');
  const [partialQuantities, setPartialQuantities] = useState<Record<string, number>>({});

  // Failure form state
  const [failureReason, setFailureReason] = useState('');
  const [failureNotes, setFailureNotes] = useState('');

  // Note form state
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (!showPODSheet) return;

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
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : String(error));
      }
    };

    void startCamera();

    return () => {
      active = false;
      stopCamera();
    };
  }, [showPODSheet]);

  if (isLoading && !shipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-app-accent rounded-full animate-spin" />
        <p className="text-lg text-app-text-secondary mt-4">جاري تحميل الشحنة...</p>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Package size={48} className="text-gray-300" />
        <p className="text-lg text-app-text-secondary mt-4">الشحنة غير موجودة</p>
        <button
          onClick={() => navigate('/deliveries')}
          className="mt-4 text-app-accent font-medium"
        >
          العودة إلى التسليمات
        </button>
      </div>
    );
  }

  const { nextActionableShipmentId, outOfSequenceShipmentIds } = getRouteGate();
  const isNextActionableShipment = shipment.id === nextActionableShipmentId;
  const isOutOfSequence = outOfSequenceShipmentIds.has(shipment.id);
  const collectionAmount = formatMoney(
    shipment.collection?.pendingDeliveryAmount ?? shipment.collection?.amount ?? null,
    shipment.collection?.currencyCode ?? null
  );
  const skuCount = shipment.skuCount ?? shipment.totalItems ?? shipment.items.length;
  const totalQuantity =
    shipment.totalQuantity ?? shipment.items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  const collectionOutstandingAmount = Math.max(
    shipment.collection?.collectedFromCustomer ?? 0,
    shipment.collection?.pendingDeliveryAmount ?? 0,
    shipment.collection?.amount ?? 0
  );
  const hasOutstandingCollection =
    Boolean(shipment.collection) &&
    shipment.collection?.collectionStatus !== 'collected_successfully' &&
    collectionOutstandingAmount > 0;
  const partialDeliveryItems = shipment.items.map((item, index) => {
    const key = `${index}-${item.productRef ?? item.name ?? 'item'}`;
    const requestedQuantity = item.requestedQuantity ?? item.quantity ?? 0;
    const deliveredQuantity = partialQuantities[key] ?? requestedQuantity;
    return {
      key,
      item,
      requestedQuantity,
      deliveredQuantity,
    };
  });
  const detailRows = [
    shipment.orderReference ? { label: 'مرجع الطلب', value: shipment.orderReference } : null,
    shipment.shipmentReference ? { label: 'مرجع الشحنة', value: shipment.shipmentReference } : null,
    shipment.warehouseOrigin ? { label: 'المخزن', value: shipment.warehouseOrigin } : null,
    shipment.scheduledDate
      ? { label: 'موعد التسليم', value: new Date(shipment.scheduledDate).toLocaleDateString('ar-EG', { month: 'long', day: 'numeric', year: 'numeric' }) }
      : null,
    shipment.routeOrder != null ? { label: 'ترتيب الخط', value: `خط السير #${shipment.routeOrder}`, icon: Route } : null,
    shipment.routeLocked ? { label: 'قفل الخط', value: 'مقفل من التشغيل', icon: Lock } : null,
    shipment.operationType ? { label: 'عملية أودو', value: shipment.operationType } : null,
    shipment.totalWeight != null ? { label: 'الوزن', value: `${shipment.totalWeight} كجم`, icon: Scale } : null,
    { label: 'الأولوية', value: shipment.priority === 'high' ? 'مرتفعة' : 'عادية', highlight: shipment.priority === 'high' },
  ].filter(Boolean) as Array<{ label: string; value: string; highlight?: boolean; icon?: typeof Route }>;

  const handleStartDelivery = async () => {
    if (isSubmittingAction) return;
    if (!isNextActionableShipment) {
      showToast('أكمل نقطة التوقف السابقة قبل تحديث هذا الطلب.', 'error');
      return;
    }
    setIsSubmittingAction(true);
    try {
      await updateStatus(shipment.id, 'in_transit', 'بدأ خط التسليم');
      showToast('تم بدء التسليم');
    } catch {
      // The store shows the backend error and reloads stale optimistic state.
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      setCameraError('تعذر التقاط صورة من الكاميرا.');
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    );

    if (!blob) {
      setCameraError('تعذر إنشاء صورة إثبات التسليم.');
      return;
    }

    if (capturedPhoto) {
      URL.revokeObjectURL(capturedPhoto);
    }
    const file = new File([blob], `pod-${shipment.id}-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    setCapturedFile(file);
    setCapturedPhoto(URL.createObjectURL(file));
  };

  const handleConfirmDelivery = async () => {
    if (isSubmittingAction) return;
    if (!isNextActionableShipment) {
      showToast('أكمل نقطة التوقف السابقة قبل تحديث هذا الطلب.', 'error');
      return;
    }
    if (!capturedFile || !user?.id) return;

    const shouldShowCollection = hasOutstandingCollection && (shipment.orders ?? []).length > 0;
    setIsSubmittingAction(true);

    try {
      const itemsToUpdate = partialDeliveryItems
        .filter(({ item }) => item.id)
        .map(({ item, deliveredQuantity }) => ({
          itemId: item.id!,
          doneQuantity: deliveredQuantity,
        }));

      if (itemsToUpdate.length > 0) {
        await driverUpdateShipmentItems(shipment.id, itemsToUpdate);
      }

      const proofPath = await uploadDeliveryProof(user.id, capturedFile);
      const partial_delivery_items = partialDeliveryItems.map(({ item, requestedQuantity, deliveredQuantity }) => ({
        productRef: item.productRef ?? item.name,
        productName: item.name,
        requestedQuantity,
        deliveredQuantity,
        moveState: item.moveState ?? null,
      }));
      await setProofOfDelivery(shipment.id, proofPath, podNotes, {
        partial_delivery_items,
        partialQuantities,
        isPartialDelivery: partial_delivery_items.some(
          (item) => Number(item.deliveredQuantity) < Number(item.requestedQuantity)
        ),
      });

      setShowPODSheet(false);
      if (capturedPhoto) {
        URL.revokeObjectURL(capturedPhoto);
      }
      setCapturedPhoto(null);
      setCapturedFile(null);
      setPodNotes('');

      if (shouldShowCollection) {
        setShowCollectionSheet(true);
      } else {
        setShowSuccessOverlay(true);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReportFailure = async () => {
    if (isSubmittingAction) return;
    if (!isNextActionableShipment) {
      showToast('أكمل نقطة التوقف السابقة قبل تحديث هذا الطلب.', 'error');
      return;
    }
    setIsSubmittingAction(true);
    try {
      await reportFailure(shipment.id, failureReason, failureNotes);
      setShowFailureSheet(false);
      setFailureReason('');
      setFailureNotes('');
      showToast('تم تسجيل فشل التسليم', 'error');
      navigate('/deliveries');
    } catch {
      // The store shows the backend error and reloads stale optimistic state.
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleAddNote = async () => {
    if (isSubmittingAction) return;
    if (newNote.trim()) {
      setIsSubmittingAction(true);
      try {
        await addNote(shipment.id, newNote);
        setShowNoteSheet(false);
        setNewNote('');
        showToast('تمت إضافة الملاحظة');
      } catch {
        // The store shows the backend error and reloads stale optimistic state.
      } finally {
        setIsSubmittingAction(false);
      }
    }
  };

  const handleCall = () => {
    if (!shipment.customerPhone) return;
    window.open(`tel:${shipment.customerPhone.replace(/\s/g, '')}`);
  };

  const handleNavigate = () => {
    if (shipment.coordinates) {
      const { lat, lng } = shipment.coordinates;
      window.open(`https://www.google.com/maps?q=${lat},${lng}`);
    } else if (shipment.address) {
      const address = encodeURIComponent(shipment.address);
      window.open(`https://www.google.com/maps/search/?api=1&query=${address}`);
    }
  };

  const handleRetryDelivery = async () => {
    if (isSubmittingAction) return;
    if (!isNextActionableShipment) {
      showToast('أكمل نقطة التوقف السابقة قبل تحديث هذا الطلب.', 'error');
      return;
    }
    setIsSubmittingAction(true);
    try {
      await updateStatus(shipment.id, 'pending', 'تمت جدولة إعادة المحاولة');
      showToast('تمت إعادة التسليم للمحاولة مرة أخرى');
    } catch {
      // The store shows the backend error and reloads stale optimistic state.
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Status banner colors
  const statusBannerBg = {
    pending: 'bg-brand-50',
    in_transit: 'bg-warning-50',
    delivered: 'bg-success-50',
    failed: 'bg-error-50',
  }[shipment.status];

  return (
    <div className="flex flex-col h-dvh bg-gray-100">
      {/* Detail Header */}
      <div className="sticky top-0 z-[100] bg-white border-b border-app-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => navigate('/deliveries')}
            className="flex items-center gap-1 text-app-dark active:opacity-70"
          >
            <ArrowLeft size={22} />
            <span className="text-base font-medium">التسليمات</span>
          </button>
          <span className="text-xs text-app-text-secondary">#{shipment.id}</span>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`${statusBannerBg} px-4 py-3 flex items-center justify-between`}>
        <StatusBadge status={shipment.status} size="md" />
        <span className="text-xs text-app-text-secondary">
          {shipment.eventHistory.length > 0
            ? `آخر تحديث ${new Date(shipment.eventHistory[shipment.eventHistory.length - 1].timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`
            : ''}
        </span>
      </div>
      {!isNextActionableShipment && shipment.status !== 'delivered' && shipment.status !== 'failed' && (
        <div className="bg-warning-50 px-4 py-3 text-xs font-medium text-warning-600">
          أكمل نقطة التوقف السابقة قبل تحديث هذا الطلب.
        </div>
      )}
      {isOutOfSequence && (
        <div className="bg-warning-50 px-4 py-3 text-xs font-medium text-warning-600">
          تم إنهاء هذا الطلب بينما توجد نقطة سابقة في الخط لم تنته بعد.
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 overflow-y-auto no-scrollbar pb-28"
      >
        {/* Customer Card */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card"
        >
          <p className="text-xs font-semibold text-app-text-secondary">العميل</p>
          <h3 className="text-lg font-semibold text-app-text mt-2" dir="auto" data-preserve-source-text>
            {shipment.customerName ?? `#${shipment.id}`}
          </h3>

          {shipment.customerPhone && (
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-app-accent" />
                <span className="text-sm text-app-text">{shipment.customerPhone}</span>
              </div>
              <button onClick={handleCall} className="text-sm text-app-accent font-medium px-3 py-1.5 rounded-lg hover:bg-app-light active:bg-app-light transition-colors">
                اتصال
              </button>
            </div>
          )}

          {shipment.address && (
            <div className="flex items-start justify-between mt-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <MapPin size={16} className="text-app-error mt-0.5 flex-shrink-0" />
                <span className="text-sm text-app-text leading-relaxed" dir="auto" data-preserve-source-text>
                  {shipment.address}
                </span>
              </div>
              <button onClick={handleNavigate} className="text-sm text-app-accent font-medium px-3 py-1.5 rounded-lg hover:bg-app-light active:bg-app-light transition-colors flex-shrink-0">
                ملاحة
              </button>
            </div>
          )}
        </motion.div>

        {/* Items Card */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-card"
        >
          <p className="text-xs font-semibold text-app-text-secondary">الأصناف</p>
          <p className="text-sm text-app-text-secondary mt-1">
            {shipment.items.length > 0
              ? `${skuCount} بنود${totalQuantity > 0 ? ` - الكمية ${totalQuantity}` : ''}`
              : 'تفاصيل الأصناف غير متاحة'}
          </p>

          <div className="mt-3 space-y-2">
            {shipment.items.map((item, i) => {
              const prepStatus = item.preparationStatus;
              const prepLabel = prepStatus === 'ready' ? 'جاهز' : prepStatus === 'partial' ? 'جزئي' : prepStatus === 'unavailable' ? 'غير متوفر' : null;
              const prepBg = prepStatus === 'ready' ? 'bg-green-100 text-green-700' : prepStatus === 'partial' ? 'bg-amber-100 text-amber-700' : prepStatus === 'unavailable' ? 'bg-red-100 text-red-700' : null;
              const isHighlighted = prepStatus === 'partial' || prepStatus === 'unavailable';

              return (
                <div key={i} className={`py-2 border-b border-gray-50 last:border-0 ${isHighlighted ? 'bg-amber-50 -mx-2 px-2 rounded-lg' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      {item.name && (
                        <span className="block truncate text-sm text-app-text" dir="auto" data-preserve-source-text>
                          {item.name}
                        </span>
                      )}
                      {item.productRef && (
                        <span className="text-xs text-app-text-secondary" dir="auto" data-preserve-source-text>
                          {item.productRef}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {prepLabel && prepBg && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${prepBg}`}>
                          {prepLabel}
                        </span>
                      )}
                      {item.quantity != null && (
                        <span className="text-sm font-semibold text-app-text-secondary">x{item.quantity}</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-app-text-secondary">
                    {item.requestedQuantity != null && <span>المطلوب {item.requestedQuantity}</span>}
                    {item.doneQuantity != null && <span>تم {item.doneQuantity}</span>}
                    {item.approvedQuantity != null && <span>المعتمد {item.approvedQuantity}</span>}
                    {item.reservedQuantity != null && <span>محجوز {item.reservedQuantity}</span>}
                    {item.forecastQuantity != null && <span>متوقع {item.forecastQuantity}</span>}
                    <span>حالة الحركة: {formatState(item.moveState)}</span>
                  </div>
                  {item.shortageReason && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      <span>{item.shortageReason === 'out_of_stock' ? 'نفاد المخزون' : item.shortageReason === 'damaged' ? 'تالف' : item.shortageReason === 'expired' ? 'منتهي الصلاحية' : item.shortageReason === 'customer_removal' ? 'إزالة بطلب العميل' : item.shortageReason === 'warehouse_issue' ? 'مشكلة في المخزن' : item.shortageReason === 'wrong_product' ? 'منتج غير مطابق' : item.shortageReason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Details Card */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-card"
        >
          <p className="text-xs font-semibold text-app-text-secondary">التفاصيل</p>
          <div className="mt-3 space-y-2.5">
            {detailRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-xs text-app-text-secondary w-28">{row.label}</span>
                <span className={`flex items-center gap-1 text-sm ${row.highlight ? 'text-app-error font-semibold' : 'text-app-text'}`}>
                  {row.icon ? <row.icon size={13} /> : null}
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {shipment.collection ? (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.18 }}
            className={`mx-4 mt-3 rounded-xl p-4 shadow-card ${
              hasOutstandingCollection ? 'border border-error-200 bg-error-50' : 'bg-white'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-app-text-secondary">التحصيل</p>
                <p className="mt-1 text-sm text-app-text">
                  {shipment.collection.collectionStatus ? formatState(shipment.collection.collectionStatus) : 'في انتظار التأكيد'}
                  {hasOutstandingCollection ? ' - لم يسلم للمدير' : ''}
                </p>
              </div>
              {collectionAmount && (
                <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                  hasOutstandingCollection ? 'bg-white text-error-700' : 'bg-warning-50 text-warning-600'
                }`}>
                  <DollarSign size={14} />
                  {hasOutstandingCollection ? `-${collectionAmount}` : collectionAmount}
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {shipment.collection.orderNumber && (
                <div className="rounded-lg bg-brand-25 p-2">
                  <span className="block text-app-text-secondary">الطلب</span>
                  <span className="font-medium text-app-text">{shipment.collection.orderNumber}</span>
                </div>
              )}
              {shipment.collection.paymentTerm && (
                <div className="rounded-lg bg-brand-25 p-2">
                  <span className="block text-app-text-secondary">شروط الدفع</span>
                  <span className="font-medium text-app-text">{shipment.collection.paymentTerm}</span>
                </div>
              )}
              {shipment.collection.collectedSuccessfullyAmount != null && (
                <div className="rounded-lg bg-success-50 p-2">
                  <span className="block text-success-600">مؤكد</span>
                  <span className="font-medium text-success-700">
                    {formatMoney(shipment.collection.collectedSuccessfullyAmount, shipment.collection.currencyCode)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}

        {shipment.notes && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-card"
          >
            <p className="text-xs font-semibold text-app-text-secondary">الملاحظات</p>
            <p className="text-sm text-app-text mt-3 leading-relaxed" dir="auto" data-preserve-source-text>
              {shipment.notes}
            </p>
          </motion.div>
        )}

        {/* Event History */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="mx-4 mt-3 mb-4 bg-white rounded-xl p-4 shadow-card"
        >
          <p className="text-xs font-semibold text-app-text-secondary">سجل الأحداث</p>
          <div className="relative mt-3 ml-1">
            {/* Timeline line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-0.5 bg-gray-200" />

            {shipment.eventHistory.map((event, i) => (
              <div key={i} className="relative flex items-start gap-4 pb-4 last:pb-0">
                <div
                  className={`w-5 h-5 rounded-full flex-shrink-0 z-10 ${
                    event.action.includes('تم التسليم') || event.action.includes('Delivered')
                      ? 'bg-app-success'
                      : event.action.includes('فشل') || event.action.includes('Failed')
                      ? 'bg-app-error'
                      : event.action.includes('قيد التوصيل') || event.action.includes('Transit')
                      ? 'bg-app-warning'
                      : 'bg-app-accent'
                  }`}
                />
                <div className="flex-1 min-w-0 -mt-0.5">
                  <p className="text-sm font-medium text-app-text">{event.action}</p>
                  <p className="text-xs text-app-text-secondary mt-0.5">
                    {new Date(event.timestamp).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })},{' '}
                    {new Date(event.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {event.user && (
                    <p className="text-xs text-gray-400">
                      بواسطة{' '}
                      <span dir="auto" data-preserve-source-text>
                        {event.user}
                      </span>
                    </p>
                  )}
                  {event.note && (
                    <p className="text-xs text-app-text-secondary mt-1 italic" dir="auto" data-preserve-source-text>
                      {event.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Action Bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="fixed bottom-0  -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-app-border shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-4 py-3 z-[100]"
      >
        {!isNextActionableShipment && shipment.status !== 'delivered' && shipment.status !== 'failed' && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-4 text-sm font-semibold text-app-text-secondary">
            <Lock size={17} />
            يجب إنهاء التوقف السابق
          </div>
        )}

        {isNextActionableShipment && shipment.status === 'pending' && (
          <div className="flex gap-3">
            <button
              onClick={() => void handleStartDelivery()}
              disabled={isSubmittingAction}
              className="flex-1 h-[52px] bg-app-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] active:bg-brand-600 transition-all"
            >
              <Truck size={18} />
              {isSubmittingAction ? 'جاري الحفظ...' : 'بدء التسليم'}
            </button>
            <button
              onClick={() => setShowNoteSheet(true)}
              className="h-[52px] px-4 border border-app-dark text-app-dark rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-app-light transition-all"
            >
              <FileText size={18} />
              ملاحظة
            </button>
          </div>
        )}

        {isNextActionableShipment && shipment.status === 'in_transit' && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowPODSheet(true)}
              className="flex-1 h-[52px] bg-success-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] active:bg-success-600 transition-all"
            >
              <CheckCircle size={18} />
              تأكيد التسليم
            </button>
            {shipment.orders && shipment.orders.length > 0 && (
              <button
                onClick={() => setShowCollectionSheet(true)}
                className="h-[52px] px-4 bg-app-accent text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] transition-all"
              >
                <DollarSign size={18} />
                تحصيل
              </button>
            )}
            <button
              onClick={() => setShowFailureSheet(true)}
              className="h-[52px] px-4 border border-error-500 text-error-600 rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-error-50 transition-all"
            >
              <AlertTriangle size={18} />
            </button>
            {shipment.customerPhone && (
              <button
                onClick={handleCall}
                className="h-[52px] px-4 border border-app-dark text-app-dark rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-app-light transition-all"
              >
                <Phone size={18} />
              </button>
            )}
          </div>
        )}

        {shipment.status === 'delivered' && (
          <div className="flex gap-3">
            <button
              disabled
              className="flex-1 h-[52px] bg-success-50 text-success-600 rounded-xl font-semibold flex items-center justify-center gap-2 opacity-70 cursor-default"
            >
              <CheckCircle size={18} />
              تم التسليم
            </button>
            {shipment.proofOfDelivery && (
              <button className="h-[52px] px-4 text-app-accent rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-app-light transition-all">
                <Camera size={18} />
                إثبات
              </button>
            )}
          </div>
        )}

        {shipment.status === 'failed' && (
          <div className="flex gap-3">
            <button
              disabled
              className="flex-1 h-[52px] bg-error-50 text-error-600 rounded-xl font-semibold flex items-center justify-center gap-2 opacity-70 cursor-default"
            >
              <XCircle size={18} />
              فشل التسليم
            </button>
            <button
              onClick={() => void handleRetryDelivery()}
              disabled={isSubmittingAction}
              className="h-[52px] px-4 border border-app-dark text-app-dark rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-app-light transition-all"
            >
              <RefreshCw size={18} />
              إعادة المحاولة
            </button>
          </div>
        )}
      </motion.div>

      {/* Proof of Delivery Bottom Sheet */}
      <AnimatePresence>
        {showPODSheet && (
          <BottomSheet
            isOpen={showPODSheet}
            onClose={() => {
              setShowPODSheet(false);
              if (capturedPhoto) URL.revokeObjectURL(capturedPhoto);
              setCapturedPhoto(null);
              setCapturedFile(null);
              setPodNotes('');
              setPartialQuantities({});
            }}
            title="إثبات التسليم"
            subtitle={`الشحنة #${shipment.id}`}
          >
            {/* Photo Capture Area */}
            <div
              className={`w-full h-[200px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden ${
                capturedPhoto ? 'border-transparent' : 'border-gray-300 bg-brand-25 hover:bg-brand-25/70'
              }`}
            >
              {capturedPhoto ? (
                <div className="relative w-full h-full">
                  <img src={capturedPhoto} alt="صورة إثبات التسليم" className="w-full h-full object-cover rounded-xl" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (capturedPhoto) URL.revokeObjectURL(capturedPhoto);
                      setCapturedPhoto(null);
                      setCapturedFile(null);
                    }}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center"
                  >
                    <XCircle size={16} className="text-white" />
                  </button>
                </div>
              ) : cameraError ? (
                <div className="px-4 text-center">
                  <Camera size={40} className="mx-auto text-gray-400" />
                  <p className="mt-2 text-sm text-app-error">{cameraError}</p>
                </div>
              ) : (
                <div className="relative h-full w-full bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-full w-full object-cover"
                  />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm text-white">
                      جار تشغيل الكاميرا...
                    </div>
                  )}
                  {cameraReady && (
                    <div className="absolute bottom-3 left-3 right-3 bg-black/70 rounded-lg px-3 py-2 text-xs text-white text-center">
                      التقط صورة للبضاعة المسلمة أو إيصال العميل
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="text-sm font-medium text-app-text">ملاحظات التسليم (اختياري)</label>
              <textarea
                value={podNotes}
                onChange={(e) => setPodNotes(e.target.value)}
                placeholder="أي ملاحظات عن التسليم..."
                className="w-full h-20 bg-gray-100 rounded-xl p-3 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent mt-1.5 resize-none"
              />
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-app-text">تسليم جزئي</p>
                  <p className="text-xs text-app-text-secondary">أكد الكمية المسلمة لكل صنف قبل إثبات التسليم.</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-app-text-secondary">
                  {partialDeliveryItems.length} بنود
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {partialDeliveryItems.map(({ key, item, requestedQuantity, deliveredQuantity }) => (
                  <div key={key} className="rounded-lg bg-brand-25 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {item.name ? (
                          <p className="truncate text-sm font-medium text-app-text" dir="auto" data-preserve-source-text>
                            {item.name}
                          </p>
                        ) : (
                          <p className="truncate text-sm font-medium text-app-text">صنف</p>
                        )}
                        <p className="text-xs text-app-text-secondary">المطلوب {requestedQuantity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setPartialQuantities((current) => ({
                              ...current,
                              [key]: Math.max(0, deliveredQuantity - 1),
                            }))
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-app-text"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          min="0"
                          max={requestedQuantity || undefined}
                          value={deliveredQuantity}
                          onChange={(event) =>
                            setPartialQuantities((current) => ({
                              ...current,
                              [key]: Math.max(0, Number(event.target.value || 0)),
                            }))
                          }
                          className="h-8 w-16 rounded-lg border border-gray-200 bg-white text-center text-sm font-semibold text-app-text"
                          aria-label={`الكمية المسلمة ${item.name ?? key}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setPartialQuantities((current) => ({
                              ...current,
                              [key]: deliveredQuantity + 1,
                            }))
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-app-text"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleCapturePhoto}
              disabled={!cameraReady}
              className="w-full h-[48px] border border-app-dark text-app-dark rounded-xl font-semibold mt-4 flex items-center justify-center gap-2 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Camera size={18} />
              التقاط صورة مباشرة
            </button>
            <button
              onClick={() => void handleConfirmDelivery()}
              disabled={!capturedFile || !user?.id || isSubmittingAction}
              className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold mt-4 flex items-center justify-center gap-2 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <CheckCircle size={18} />
              {isSubmittingAction ? 'جاري حفظ التسليم...' : 'تأكيد التسليم'}
            </button>
            <button
              onClick={() => {
                setShowPODSheet(false);
                if (capturedPhoto) URL.revokeObjectURL(capturedPhoto);
                setCapturedPhoto(null);
                setCapturedFile(null);
                setPodNotes('');
                setPartialQuantities({});
              }}
              className="w-full h-12 text-app-accent font-semibold mt-2"
            >
              إلغاء
            </button>
          </BottomSheet>
        )}
      </AnimatePresence>

      {/* Failure Report Bottom Sheet */}
      <AnimatePresence>
        {showFailureSheet && (
          <BottomSheet
            isOpen={showFailureSheet}
            onClose={() => { setShowFailureSheet(false); setFailureReason(''); setFailureNotes(''); }}
            title="تسجيل فشل التسليم"
            subtitle={`الشحنة #${shipment.id}`}
          >
            <div className="mt-2">
              <label className="text-sm font-medium text-app-text">
                لماذا لم يتم التسليم؟ <span className="text-app-error">*</span>
              </label>
              <select
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                className="w-full h-12 bg-gray-100 rounded-xl px-4 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent mt-2"
              >
                <option value="">اختر السبب...</option>
                <option value="customer_not_available">العميل غير متواجد</option>
                <option value="customer_refused">رفض العميل استلام الطلب</option>
                <option value="wrong_address">العنوان غير صحيح</option>
                <option value="inaccessible_location">المكان غير قابل للوصول</option>
                <option value="customer_not_ready">العميل غير جاهز للدفع</option>
                <option value="partial_acceptance">رفض جزئي من الطلب</option>
                <option value="damaged_goods">بضاعة تالفة</option>
                <option value="missing_items">نقص في الأصناف</option>
                <option value="vehicle_breakdown">عطل في المركبة</option>
                <option value="safety_concern">مخاوف أمنية</option>
                <option value="other">سبب آخر</option>
              </select>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="text-sm font-medium text-app-text">ملاحظات إضافية</label>
              <textarea
                value={failureNotes}
                onChange={(e) => setFailureNotes(e.target.value)}
                placeholder="أي تفاصيل إضافية..."
                className="w-full h-20 bg-gray-100 rounded-xl p-3 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent mt-1.5 resize-none"
              />
            </div>

            {/* Submit */}
            <button
              onClick={() => void handleReportFailure()}
              disabled={!failureReason.trim() || isSubmittingAction}
              className="w-full h-[52px] bg-app-error text-white rounded-xl font-semibold mt-4 flex items-center justify-center gap-2 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <AlertTriangle size={18} />
              {isSubmittingAction ? 'جاري الحفظ...' : 'إرسال التقرير'}
            </button>
            <button
              onClick={() => { setShowFailureSheet(false); setFailureReason(''); setFailureNotes(''); }}
              className="w-full h-12 text-app-text-secondary font-semibold mt-2"
            >
              إلغاء
            </button>
          </BottomSheet>
        )}
      </AnimatePresence>

      {/* Add Note Bottom Sheet */}
      <AnimatePresence>
        {showNoteSheet && (
          <BottomSheet
            isOpen={showNoteSheet}
            onClose={() => { setShowNoteSheet(false); setNewNote(''); }}
            title="إضافة ملاحظة"
            subtitle={`الشحنة #${shipment.id}`}
          >
            <div className="mt-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="اكتب ملاحظتك..."
                className="w-full h-32 bg-gray-100 rounded-xl p-4 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent resize-none"
              />
            </div>
            <button
              onClick={() => void handleAddNote()}
              disabled={!newNote.trim() || isSubmittingAction}
              className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold mt-4 flex items-center justify-center gap-2 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <FileText size={18} />
              {isSubmittingAction ? 'جاري الحفظ...' : 'إضافة الملاحظة'}
            </button>
            <button
              onClick={() => { setShowNoteSheet(false); setNewNote(''); }}
              className="w-full h-12 text-app-text-secondary font-semibold mt-2"
            >
              إلغاء
            </button>
          </BottomSheet>
        )}
      </AnimatePresence>

      {/* Collection Sheet */}
      <CollectionSheet
        isOpen={showCollectionSheet}
        onClose={() => {
          setShowCollectionSheet(false);
          setShowSuccessOverlay(true);
        }}
        shipmentId={shipment.id}
        orders={shipment.orders ?? []}
        onComplete={() => {
          showToast('تم تسجيل التحصيل بنجاح');
        }}
      />

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccessOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center px-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <CheckCircle size={80} className="text-app-success" />
            </motion.div>
            <h1 className="text-2xl font-semibold text-app-text mt-6">تم تأكيد التسليم</h1>
            <p className="text-sm text-app-text-secondary text-center mt-2">
              تم تسجيل الشحنة #{shipment.id} كمسلمة.
            </p>

            <div className="w-full bg-gray-100 rounded-xl p-4 mt-6">
              <p className="text-sm font-medium text-app-text" dir="auto" data-preserve-source-text>
                {shipment.customerName ?? `#${shipment.id}`}
              </p>
              {shipment.address && (
                <p className="text-xs text-app-text-secondary mt-1" dir="auto" data-preserve-source-text>
                  {shipment.address}
                </p>
              )}
            </div>

            <button
              onClick={() => { setShowSuccessOverlay(false); navigate('/'); }}
              className="w-full h-[52px] bg-app-dark text-white rounded-xl font-semibold mt-6 active:scale-[0.96] transition-all"
            >
              العودة للرئيسية
            </button>
            <button
              onClick={() => { setShowSuccessOverlay(false); navigate('/route'); }}
              className="w-full h-12 text-app-accent font-semibold mt-2"
            >
              عرض خط السير
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
