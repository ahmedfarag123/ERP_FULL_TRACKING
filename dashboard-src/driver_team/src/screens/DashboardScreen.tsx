import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileCheck2,
  PhoneCall,
  Wifi,
  WifiOff,
  Camera,
  DollarSign,
  Truck,
} from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import ShipmentListItem from '@/components/ShipmentListItem';
import AppHeader from '@/components/AppHeader';
import DriverLiveRouteMap from '@/components/DriverLiveRouteMap';
import BottomSheet from '@/components/BottomSheet';
import EndOfRouteModal from '@/components/EndOfRouteModal';
import { createDriverSosAlert } from '@/services/driverAlerts';
import { submitCollectionRequest, submitCollectionHandover } from '@/services/collectionHandover';
import { uploadDeliveryProof, fetchOrderCollectionsForPlan } from '@/services/shipmentData';
import type { SettlementBreakdown } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function DashboardScreen() {
  const navigate = useNavigate();
  const shipments = useDeliveryStore((s) => s.shipments);
  const loadShipments = useDeliveryStore((s) => s.loadShipments);
  const selectShipment = useDeliveryStore((s) => s.selectShipment);
  const getRouteGate = useDeliveryStore((s) => s.getRouteGate);
  const startShift = useDeliveryStore((s) => s.startShift);
  const startOutForDelivery = useDeliveryStore((s) => s.startOutForDelivery);
  const endRoute = useDeliveryStore((s) => s.endRoute);
  const user = useAuthStore((s) => s.user);
  const setActiveTab = useUIStore((s) => s.setActiveTab);
  const showToast = useUIStore((s) => s.showToast);
  const isDriverOnline = useUIStore((s) => s.isDriverOnline);
  const setDriverOnline = useUIStore((s) => s.setDriverOnline);

  const [showCollectionSheet, setShowCollectionSheet] = useState(false);
  const [collectionReason, setCollectionReason] = useState('');
  const [collectionPhoto, setCollectionPhoto] = useState<string | null>(null);
  const [collectionFile, setCollectionFile] = useState<File | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isSubmittingCollection, setIsSubmittingCollection] = useState(false);
  const [isWorkflowSubmitting, setIsWorkflowSubmitting] = useState(false);
  const [showEndOfRouteModal, setShowEndOfRouteModal] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const [settlementBreakdown, setSettlementBreakdown] = useState<SettlementBreakdown>({
    cashDebt: 0,
    transferAmount: 0,
    chequeAmount: 0,
    creditAmount: 0,
    currencyCode: 'EGP',
  });

  const getStats = useDeliveryStore((s) => s.getStats);
  const storeActivePlanId = useDeliveryStore((s) => s.activePlanId);
  const allPlans = useDeliveryStore((s) => s.allPlans);
  const stats = useMemo(() => getStats(), [getStats]);

  useEffect(() => {
    loadShipments();
    setActiveTab('dashboard');
  }, [loadShipments, setActiveTab]);

  const priorityShipments = shipments.filter(
    (s) => s.status === 'failed' || s.priority === 'high'
  ).slice(0, 3);
  const { nextActionableShipmentId } = getRouteGate();
  const activeShipment =
    shipments.find((shipment) => shipment.id === nextActionableShipmentId) ??
    shipments.find((shipment) => shipment.status === 'in_transit') ??
    shipments.find((shipment) => shipment.status === 'pending') ??
    null;
  const isTerminalShipment = (shipment: { status: string }) =>
    shipment.status === 'delivered' || shipment.status === 'failed';
  const hasActionableShipments = shipments.some((shipment) => !isTerminalShipment(shipment));
  const outstandingCollections = shipments
    .map((shipment) => shipment.collection)
    .filter((collection) =>
      collection &&
      collection.collectionStatus !== 'collected_successfully' &&
      (collection.driverDebtAmount ?? 0) > 0
    );
  const outstandingCollectionAmount = outstandingCollections.reduce(
    (total, collection) => total + (collection?.driverDebtAmount ?? 0),
    0
  );
  const collectionCurrency = outstandingCollections[0]?.currencyCode ?? 'EGP';
  const activePlanId =
    storeActivePlanId ??
    activeShipment?.planId ??
    shipments.find((shipment) => !isTerminalShipment(shipment) && shipment.planId)?.planId ??
    (outstandingCollectionAmount > 0 ? shipments.find((shipment) => shipment.planId)?.planId : null) ??
    shipments.find((shipment) => shipment.planId)?.planId ??
    null;

  useEffect(() => {
    if (activePlanId && user?.id) {
      void fetchOrderCollectionsForPlan(activePlanId, user.id).then(setSettlementBreakdown);
    }
  }, [activePlanId, user?.id]);

  const activePlanShipments = activePlanId
    ? shipments.filter((shipment) => shipment.planId === activePlanId)
    : shipments;
  const activePhase = (() => {
    if (!storeActivePlanId && !hasActionableShipments && allPlans.length === 0) return 'no_plan';
    if (activePlanShipments.length === 0 && !storeActivePlanId && allPlans.length === 0) return 'no_plan';
    if (activePlanShipments.length === 0 && allPlans.length > 0) return 'plan_ready';
    if (activePlanShipments.length === 0 && storeActivePlanId) return 'plan_ready';
    if (activePlanShipments.every(isTerminalShipment)) {
      return 'delivered';
    }
    if (activePlanShipments.some((shipment) => shipment.status === 'in_transit')) return 'out_for_delivery';
    const pendingInPlan = activePlanShipments.filter((shipment) => shipment.status === 'pending');
    if (pendingInPlan.length > 0 && pendingInPlan.every((shipment) => shipment.deliveryPhase === 'picked_up')) {
      return 'picked_up';
    }
    if (
      pendingInPlan.length > 0 &&
      pendingInPlan.every((shipment) => ['arrived_pickup', 'picked_up'].includes(String(shipment.deliveryPhase)))
    ) {
      return 'starting_shift';
    }
    return 'assigned';
  })();
  const canUseWorkflowAction =
    !isWorkflowSubmitting &&
    activePhase !== 'no_plan' &&
    activePhase !== 'plan_ready' &&
    (activePhase === 'assigned' || activePhase === 'delivered' || Boolean(activePlanId || activeShipment));
  const workflowSteps = [
    {
      key: 'assigned',
      label: 'الوصول للمخزن',
      description: 'سجّل وصولك لنقطة الاستلام.',
      icon: Package,
    },
    {
      key: 'starting_shift',
      label: 'استلام البضاعة',
      description: 'راجع وتأكد من استلام كل الشحنات.',
      icon: FileCheck2,
    },
    {
      key: 'picked_up',
      label: 'بدء خط التسليم',
      description: 'ابدأ رحلة التسليم للعملاء.',
      icon: Truck,
    },
    {
      key: 'out_for_delivery',
      label: 'التسليم للعميل',
      description: activeShipment?.customerName
        ? `التوصيل لـ: ${activeShipment.customerName}`
        : 'تابع نقطة التسليم الحالية.',
      icon: CheckCircle,
    },
  ] as const;
  const rawWorkflowIndex = workflowSteps.findIndex((step) => step.key === activePhase);
  const activeStepIndex = activePhase === 'delivered'
    ? workflowSteps.length
    : Math.max(0, rawWorkflowIndex);
  const currentWorkflowStep =
    activePhase === 'delivered'
      ? {
          label: 'نهاية خط السير',
          description: 'أكمل جميع التسليمات. سجّل التحصيل لإنهاء الوردية.',
        }
      : activePhase === 'no_plan'
      ? {
          label: 'لا توجد خطة',
          description: 'ستظهر خطوات السير عند إسناد خط تسليم لك.',
        }
      : activePhase === 'plan_ready'
      ? {
          label: 'الخطة جاهزة',
          description: 'تم تجهيز الخطة. في انتظار الشحنات.',
        }
      : workflowSteps[activeStepIndex];
  const workflowActionLabel =
    activePhase === 'assigned' || activePhase === 'no_plan'
      ? 'وصلت المخزن'
      : activePhase === 'starting_shift'
      ? 'استلمت البضاعة'
      : activePhase === 'picked_up'
      ? 'بدء خط التسليم'
      : activePhase === 'out_for_delivery'
      ? 'التسليم للعميل'
      : activePhase === 'delivered'
      ? 'نهاية خط السير'
      : activePhase === 'plan_ready'
      ? 'الخطة جاهزة'
      : 'وصلت المخزن';

  const recentActivity = shipments
    .flatMap((s) =>
      s.eventHistory.slice(-1).map((e) => ({
        ...e,
        shipmentId: s.id,
        shipmentCustomer: s.customerName,
        status: s.status,
      }))
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 4);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'صباح الخير';
    if (hour < 17) return 'مساء الخير';
    return 'مساء الخير';
  };

  const handleSync = () => {
    showToast('تمت مزامنة البيانات');
  };

  const handleSos = async () => {
    try {
      await createDriverSosAlert({
        shipmentId: activeShipment?.id ?? null,
        message: activeShipment ? `SOS for active shipment ${activeShipment.id}` : 'SOS from driver dashboard',
      });
      showToast('تم إرسال SOS للإدارة', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handleCallCustomer = () => {
    if (!activeShipment?.customerPhone) {
      showToast('لا يوجد رقم هاتف للعميل النشط', 'error');
      return;
    }
    window.open(`tel:${activeShipment.customerPhone.replace(/\s/g, '')}`);
  };

  const handleOpenPod = () => {
    if (!activeShipment) {
      showToast('لا توجد شحنة نشطة لفتح POD', 'error');
      return;
    }
    selectShipment(activeShipment.id);
    navigate(`/deliveries/${activeShipment.id}?pod=1`);
  };

  const handleWorkflowAction = async () => {
    if (isWorkflowSubmitting) return;
    setIsWorkflowSubmitting(true);

    try {
      if (activePhase === 'assigned') {
        if (!activePlanId) {
          showToast('لا توجد خطة عمل مسندة لك بعد. في انتظار إسناد خط تسليم.', 'info');
          return;
        }
        await startShift();
        showToast('تم حفظ خطوة الوصول للمخزن');
        return;
      }
      if (activePhase === 'starting_shift') {
        navigate('/deliveries/load-confirmation');
        return;
      }
      if (activePhase === 'picked_up') {
        await startOutForDelivery();
        setActiveTab('route');
        navigate('/route');
        showToast('تم بدء خط التسليم');
        return;
      }
      if (activePhase === 'out_for_delivery') {
        setActiveTab('route');
        navigate('/route');
        return;
      }
      if (activePhase === 'delivered') {
        setActiveTab('collection');
        navigate('/collection');
        return;
      }
      showToast('لا توجد خطة عمل نشطة', 'info');
    } catch {
      // The store already shows the actionable error and reloads stale optimistic state.
    } finally {
      setIsWorkflowSubmitting(false);
    }
  };

  useEffect(() => {
    if (!showCollectionSheet) return;

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
  }, [showCollectionSheet]);

  const handleCaptureCollectionPhoto = async () => {
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
      setCameraError('تعذر إنشاء صورة الإيصال.');
      return;
    }

    if (collectionPhoto) {
      URL.revokeObjectURL(collectionPhoto);
    }
    const file = new File([blob], `collection-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    setCollectionFile(file);
    setCollectionPhoto(URL.createObjectURL(file));
  };

  const handleCollectionPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (collectionPhoto) {
      URL.revokeObjectURL(collectionPhoto);
    }
    setCollectionFile(file);
    setCollectionPhoto(URL.createObjectURL(file));
  };

  const handleEndShift = async (handedToManager: boolean, reason?: string) => {
    try {
      if (outstandingCollectionAmount > 0) {
        await submitCollectionHandover({
          planId: activePlanId,
          handedToManager,
          reason: reason ?? null,
          totalAmount: outstandingCollectionAmount,
          currencyCode: collectionCurrency,
        });
      }

      await endRoute();
      setShowCollectionSheet(false);
      showToast('تم تسجيل نهاية الوردية');
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handleCompleteRouteAfterCollectionChoice = async () => {
    try {
      await endRoute();
      setShowEndOfRouteModal(false);
      showToast('تم تسجيل نهاية خط السير');
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error');
    }
  };

  const handleSubmitCollectionRequest = async () => {
    if (!collectionFile || outstandingCollectionAmount <= 0) return;

    setIsSubmittingCollection(true);
    try {
      const proofPath = await uploadDeliveryProof(user?.id ?? '', collectionFile);
      await submitCollectionRequest({
        planId: activePlanId,
        collectedAmount: outstandingCollectionAmount,
        currencyCode: collectionCurrency,
        proofPhotoUrl: proofPath,
        driverNotes: collectionReason.trim() || null,
      });

      setShowCollectionSheet(false);
      setCollectionPhoto(null);
      setCollectionFile(null);
      setCollectionReason('');
      showToast('تم إرسال طلب التحصيل للمدير للمراجعة');
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error');
    } finally {
      setIsSubmittingCollection(false);
    }
  };

  const planStats = useMemo(() => {
    const total = activePlanShipments.length;
    const delivered = activePlanShipments.filter((s) => s.status === 'delivered').length;
    const pending = activePlanShipments.filter((s) => s.status === 'pending').length;
    const failed = activePlanShipments.filter((s) => s.status === 'failed').length;
    return { total, delivered, pending, failed };
  }, [activePlanShipments]);
  const displayStats = activePlanId ? planStats : stats;
  const statCards = [
    { label: 'الإجمالي', value: displayStats.total, icon: Package, color: 'text-gray-500' },
    { label: 'معلق', value: displayStats.pending, icon: Clock, color: 'text-app-accent' },
    { label: 'تم', value: displayStats.delivered, icon: CheckCircle, color: 'text-app-success' },
    ...(displayStats.failed > 0 ? [{ label: 'فشل', value: displayStats.failed, icon: XCircle, color: 'text-app-error' }] : []),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto no-scrollbar pb-20"
      >
        {/* Greeting Section */}
        <motion.div variants={itemVariants} className="bg-app-dark px-4 pt-4 pb-8 rounded-b-[20px]">
          <h2 className="text-[22px] font-semibold text-white leading-tight">
            {getGreeting()},
          </h2>
          {user?.firstName && (
            <h2 className="text-[22px] font-semibold text-white leading-tight">
              {user.firstName}!
            </h2>
          )}
          <p className="text-sm text-white/70 mt-1">
            {new Date().toLocaleDateString('ar-EG', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-4 gap-2 px-4 -mt-5"
        >
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.08, duration: 0.3 }}
              className="bg-white rounded-xl p-3 shadow-card flex flex-col items-center text-center"
            >
              <stat.icon size={18} className={stat.color} />
              <span className="text-2xl font-bold text-app-text mt-1">{stat.value}</span>
              <span className="text-xs text-app-text-secondary">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Progress Section */}
        <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-app-text">تقدم اليوم</h3>
            <span className="text-sm text-app-text-secondary">
              {displayStats.delivered + displayStats.failed} من {displayStats.total}
            </span>
          </div>
          <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${displayStats.total > 0 ? ((displayStats.delivered + displayStats.failed) / displayStats.total) * 100 : 0}%`,
              }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="h-full bg-app-success rounded-full"
            />
          </div>
          <p className="text-sm text-app-success font-medium mt-2">
            {displayStats.total > 0 ? Math.round(((displayStats.delivered + displayStats.failed) / displayStats.total) * 100) : 0}% نسبة النجاح
          </p>
        </motion.div>

        {/* Shift Workflow */}
        <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-app-text-secondary">خطة اليوم</p>
              <h3 className="mt-1 text-lg font-semibold text-app-text">{currentWorkflowStep.label}</h3>
              <p className="mt-1 text-sm leading-relaxed text-app-text-secondary">
                {currentWorkflowStep.description}
              </p>
            </div>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
              {activePhase === 'delivered'
                ? 'مكتمل'
                : activePhase === 'no_plan'
                ? 'بدون خطة'
                : activePhase === 'plan_ready'
                ? 'جاهزة'
                : `${Math.min(activeStepIndex + 1, workflowSteps.length)} / ${workflowSteps.length}`}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {workflowSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isDone = activePhase === 'delivered' || index < activeStepIndex;
              const isCurrent = index === activeStepIndex && activePhase !== 'delivered' && activePhase !== 'no_plan';

              return (
                <div key={step.key} className="flex min-w-0 flex-col items-center gap-1 text-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
                      isDone
                        ? 'border-success-200 bg-success-50 text-success-600'
                        : isCurrent
                        ? 'border-app-accent bg-app-light text-app-accent shadow-sm'
                        : 'border-gray-200 bg-brand-25 text-gray-400'
                    }`}
                  >
                    {isDone ? <CheckCircle size={18} /> : <StepIcon size={18} />}
                  </div>
                  <span className={`min-h-8 text-[10px] font-semibold leading-4 ${isCurrent ? 'text-app-text' : 'text-app-text-secondary'}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {activeShipment && activePhase !== 'no_plan' && activePhase !== 'delivered' && (
            <div className="mt-4 rounded-xl bg-brand-25 p-3">
              <p className="text-xs font-semibold text-app-text-secondary">النقطة الحالية</p>
              <p className="mt-1 truncate text-sm font-semibold text-app-text" dir="auto" data-preserve-source-text>
                {activeShipment.customerName ?? `#${activeShipment.id}`}
              </p>
              {activeShipment.address && (
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-app-text-secondary" dir="auto" data-preserve-source-text>
                  {activeShipment.address}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {activePlanId && activePhase !== 'no_plan' && activePhase !== 'delivered' && (
              <button
                type="button"
                onClick={() => navigate(`/plan/${activePlanId}/reorder`)}
                className="h-12 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-app-text-secondary active:scale-95 transition-transform"
              >
                ترتيب الخط
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleWorkflowAction()}
              disabled={!canUseWorkflowAction}
              className={`h-12 flex-1 rounded-xl px-4 text-sm font-semibold text-white active:scale-[0.97] transition-transform ${
                !canUseWorkflowAction
                  ? 'bg-gray-400'
                  : activePhase === 'out_for_delivery'
                  ? 'bg-app-accent'
                  : activePhase === 'delivered'
                  ? 'bg-app-success'
                  : 'bg-app-dark'
              } ${isWorkflowSubmitting ? 'opacity-70' : ''}`}
            >
              {workflowActionLabel}
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-app-text">حالة الوردية</h3>
              <p className="mt-1 text-sm text-app-text-secondary">
                {activePhase === 'assigned'
                  ? 'تسجيل الوصول عند نقطة الاستلام'
                  : activePhase === 'starting_shift'
                  ? 'تأكيد استلام كل الشحنات'
                  : activePhase === 'picked_up'
                  ? 'جاهز لبدء خط التسليم'
                  : activePhase === 'out_for_delivery'
                  ? 'خارج للتسليم'
                  : activePhase === 'delivered'
                  ? 'تم إنهاء التسليم'
                  : 'لا توجد خطة عمل نشطة'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activePlanId && activePhase !== 'no_plan' && activePhase !== 'delivered' && (
                <button
                  type="button"
                  onClick={() => navigate(`/plan/${activePlanId}/reorder`)}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-app-text-secondary hover:bg-brand-25 active:scale-95 transition-all"
                >
                  ترتيب
                </button>
              )}
              <button
              type="button"
              onClick={() => void handleWorkflowAction()}
              disabled={!canUseWorkflowAction}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white active:scale-[0.97] transition-transform ${
                activePhase === 'delivered' || !canUseWorkflowAction
                  ? 'bg-gray-400'
                  : activePhase === 'out_for_delivery'
                  ? 'bg-app-accent'
                  : 'bg-app-dark'
              } ${isWorkflowSubmitting ? 'opacity-70' : ''}`}
            >
              {activePhase === 'assigned'
                ? 'بداية الوردية'
                : activePhase === 'starting_shift'
                ? 'تم الاستلام'
                : activePhase === 'picked_up'
                ? 'خارج للتسليم'
                : activePhase === 'out_for_delivery'
                ? 'فتح الخريطة'
                : 'تم'}
            </button>
            </div>
          </div>
        </motion.div>

        {outstandingCollectionAmount > 0 && (
          <motion.div
            variants={itemVariants}
            className="mx-4 mt-4 rounded-xl border border-error-200 bg-error-50 p-4 shadow-card"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-error-700">تحصيل غير مسلم</h3>
                <p className="mt-1 text-xs text-error-600">
                  يبقى بالسالب حتى يتم تسليمه وتأكيده من المدير
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-error-700">
                -{new Intl.NumberFormat('ar-EG', {
                  style: 'currency',
                  currency: collectionCurrency,
                  maximumFractionDigits: 0,
                }).format(outstandingCollectionAmount)}
              </span>
            </div>
          </motion.div>
        )}

        {activePhase === 'out_for_delivery' && (
          <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-app-text">الخريطة المباشرة</h3>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('route');
                  navigate('/route');
                }}
                className="text-sm font-medium text-app-accent"
              >
                خط السير
              </button>
            </div>
            <DriverLiveRouteMap shipments={shipments} activeShipmentId={activeShipment?.id ?? null} />
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="px-4 mt-4">
          <h3 className="text-lg font-semibold text-app-text mb-3">إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: AlertTriangle, label: 'SOS', action: handleSos, iconClassName: 'text-app-error' },
              { icon: PhoneCall, label: 'الاتصال بالعميل', action: handleCallCustomer, iconClassName: 'text-app-dark' },
              { icon: FileCheck2, label: 'POD', action: handleOpenPod, iconClassName: 'text-app-dark' },
              {
                icon: isDriverOnline ? Wifi : WifiOff,
                label: isDriverOnline ? 'متصل' : 'غير متصل',
                action: () => {
                  setDriverOnline(!isDriverOnline);
                  handleSync();
                },
                iconClassName: isDriverOnline ? 'text-success-600' : 'text-app-error',
                buttonClassName: isDriverOnline ? 'ring-1 ring-success-200' : 'ring-1 ring-error-200',
              },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className={`bg-white rounded-xl p-4 shadow-card flex flex-col items-center gap-2 active:scale-[0.97] transition-transform ${action.buttonClassName ?? ''}`}
              >
                <action.icon size={26} className={action.iconClassName} />
                <span className="text-sm font-semibold text-app-text">{action.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Priority Deliveries */}
        {priorityShipments.length > 0 && (
          <motion.div variants={itemVariants} className="px-4 mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-app-text">التسليمات ذات الأولوية</h3>
              <button
                onClick={() => { setActiveTab('deliveries'); navigate('/deliveries'); }}
                className="text-sm text-app-accent font-medium"
              >
                عرض الكل
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {priorityShipments.map((shipment) => (
                <ShipmentListItem
                  key={shipment.id}
                  shipment={shipment}
                  onClick={() => {
                    selectShipment(shipment.id);
                    navigate(`/deliveries/${shipment.id}`);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div variants={itemVariants} className="px-4 mt-5 mb-6">
          <h3 className="text-lg font-semibold text-app-text mb-3">آخر النشاط</h3>
          <div className="bg-white rounded-xl shadow-card overflow-hidden">
            {recentActivity.map((activity, i) => (
              <div
                key={`${activity.shipmentId}-${i}`}
                className={`flex items-start gap-3 px-4 py-3 ${
                  i < recentActivity.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.status === 'delivered'
                      ? 'bg-app-success'
                      : activity.status === 'failed'
                      ? 'bg-app-error'
                      : activity.status === 'in_transit'
                      ? 'bg-app-warning'
                      : 'bg-app-accent'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-app-text truncate">
                    {activity.action.replace('تم تغيير الحالة إلى', '').replace('Status changed to', '').trim()}
                    {activity.shipmentCustomer && (
                      <>
                        {' - '}
                        <span className="font-medium" dir="auto" data-preserve-source-text>{activity.shipmentCustomer}</span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(activity.timestamp).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>

      <BottomSheet
        isOpen={showCollectionSheet}
        onClose={() => {
          setShowCollectionSheet(false);
          if (collectionPhoto) URL.revokeObjectURL(collectionPhoto);
          setCollectionPhoto(null);
          setCollectionFile(null);
          setCollectionReason('');
        }}
        title="طلب تحصيل"
        subtitle="أرسل طلب تحصيل مع صورة الإيصال"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-warning-50 p-3">
            <div className="flex items-center gap-2">
              <DollarSign size={18} className="text-warning-600" />
              <span className="text-sm font-semibold text-warning-700">
                المبلغ المستحق: {new Intl.NumberFormat('ar-EG', {
                  style: 'currency',
                  currency: collectionCurrency,
                  maximumFractionDigits: 0,
                }).format(outstandingCollectionAmount)}
              </span>
            </div>
          </div>

          {/* Photo Capture */}
          <div>
            <label className="text-sm font-medium text-app-text">صورة الإيصال</label>
            <div
              className={`mt-2 w-full h-[180px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors overflow-hidden ${
                collectionPhoto ? 'border-transparent' : 'border-gray-300 bg-brand-25 hover:bg-brand-25/70'
              }`}
            >
              {collectionPhoto ? (
                <div className="relative w-full h-full">
                  <img src={collectionPhoto} alt="صورة الإيصال" className="w-full h-full object-cover rounded-xl" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (collectionPhoto) URL.revokeObjectURL(collectionPhoto);
                      setCollectionPhoto(null);
                      setCollectionFile(null);
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
                </div>
              )}
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={handleCaptureCollectionPhoto}
                disabled={!cameraReady || !!collectionPhoto}
                className="flex-1 h-11 border border-app-dark text-app-dark rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
              >
                <Camera size={16} />
                التقاط صورة
              </button>
              <label className="flex-1 h-11 border border-gray-300 rounded-xl font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.96] transition-all text-sm text-app-text-secondary">
                رفع من الملفات
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCollectionPhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-app-text">ملاحظات (اختياري)</label>
            <textarea
              value={collectionReason}
              onChange={(e) => setCollectionReason(e.target.value)}
              placeholder="أي ملاحظات عن التحصيل..."
              className="w-full h-20 bg-gray-100 rounded-xl p-3 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent mt-1.5 resize-none"
            />
          </div>

          <button
            onClick={handleSubmitCollectionRequest}
            disabled={!collectionFile || isSubmittingCollection || outstandingCollectionAmount <= 0}
            className="w-full h-[52px] bg-app-success text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmittingCollection ? 'جاري الإرسال...' : 'إرسال طلب التحصيل'}
          </button>

          <button
            onClick={() => void handleEndShift(false, collectionReason.trim() || 'لم يتم تسليم التحصيل')}
            className="w-full h-12 text-app-error font-semibold"
          >
            لم يتم التسليم
          </button>
        </div>
      </BottomSheet>

      <EndOfRouteModal
        isOpen={showEndOfRouteModal}
        onClose={() => setShowEndOfRouteModal(false)}
        planId={activePlanId}
        settlement={settlementBreakdown}
        totalCollected={outstandingCollectionAmount}
        totalDebt={outstandingCollectionAmount}
        currencyCode={collectionCurrency}
        onEndShift={() => void handleCompleteRouteAfterCollectionChoice()}
      />
    </div>
  );
}
