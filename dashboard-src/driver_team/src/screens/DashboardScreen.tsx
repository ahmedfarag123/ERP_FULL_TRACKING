import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Package,
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
  MapPin,
  ChevronLeft,
  RotateCcw,
} from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import ShipmentListItem from '@/components/ShipmentListItem';
import BottomSheet from '@/components/BottomSheet';
import DriverLiveRouteMap from '@/components/DriverLiveRouteMap';
import EndOfRouteModal from '@/components/EndOfRouteModal';
import { createDriverSosAlert } from '@/services/driverAlerts';
import { submitCollectionRequest, submitCollectionHandover } from '@/services/collectionHandover';
import { uploadDeliveryProof, fetchOrderCollectionsForPlan } from '@/services/shipmentData';
import { driverAsset } from '@/lib/appAssets';
import type { SettlementBreakdown } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
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

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-5 pt-6 pb-20 rounded-b-[28px] overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-8 left-1/2 w-20 h-20 bg-white/5 rounded-full" />

        <div className="relative z-10">
          {/* Top row: logo + online toggle */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <img
                src={driverAsset('logo.png')}
                alt=""
                className="h-9 w-9 rounded-xl object-contain bg-white/20 p-1"
              />
              <span className="text-white/90 text-sm font-semibold">هوريكا سمارت</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDriverOnline(!isDriverOnline);
                handleSync();
              }}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                isDriverOnline
                  ? 'bg-white/20 text-white'
                  : 'bg-white/10 text-white/70'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isDriverOnline ? 'bg-white animate-pulse' : 'bg-white/40'}`} />
              {isDriverOnline ? 'متصل' : 'غير متصل'}
            </button>
          </div>

          {/* Greeting */}
          <div>
            <h1 className="text-[26px] font-bold text-white leading-tight">
              {getGreeting()}
              {user?.firstName && (
                <span className="text-white/90"> {user.firstName}</span>
              )}
            </h1>
            <p className="text-sm text-white/70 mt-1.5">
              {new Date().toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 overflow-y-auto no-scrollbar pb-24 -mt-12 relative z-10"
      >
        {/* Stats Cards */}
        <motion.div variants={itemVariants} className="px-4 grid grid-cols-4 gap-2.5">
          {[
            { label: 'الإجمالي', value: displayStats.total, bg: 'bg-white', iconColor: 'text-gray-500', iconBg: 'bg-gray-100' },
            { label: 'معلق', value: displayStats.pending, bg: 'bg-white', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
            { label: 'تم', value: displayStats.delivered, bg: 'bg-white', iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
            ...(displayStats.failed > 0
              ? [{ label: 'فشل', value: displayStats.failed, bg: 'bg-white', iconColor: 'text-red-500', iconBg: 'bg-red-50' }]
              : []),
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className={`${stat.bg} rounded-2xl p-3 shadow-sm flex flex-col items-center text-center border border-gray-100`}
            >
              <div className={`w-8 h-8 rounded-xl ${stat.iconBg} flex items-center justify-center mb-1.5`}>
                <span className={`text-lg font-bold ${stat.iconColor}`}>{stat.value}</span>
              </div>
              <span className="text-[11px] text-gray-500 font-medium">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Progress Bar */}
        <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-800">تقدم اليوم</h3>
            <span className="text-xs text-gray-400 font-medium">
              {displayStats.delivered + displayStats.failed} / {displayStats.total}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${displayStats.total > 0 ? ((displayStats.delivered + displayStats.failed) / displayStats.total) * 100 : 0}%`,
              }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-emerald-600 font-semibold">
              {displayStats.total > 0 ? Math.round(((displayStats.delivered + displayStats.failed) / displayStats.total) * 100) : 0}% نسبة النجاح
            </p>
            <div className="flex items-center gap-3 text-[11px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> تم</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300" /> متبقي</span>
            </div>
          </div>
        </motion.div>

        {/* Active Delivery Card */}
        {activeShipment && activePhase !== 'no_plan' && activePhase !== 'delivered' && activePhase !== 'plan_ready' && (
          <motion.div variants={itemVariants} className="mx-4 mt-4">
            <button
              type="button"
              onClick={() => {
                selectShipment(activeShipment.id);
                navigate(`/deliveries/${activeShipment.id}`);
              }}
              className="w-full bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100 text-right active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
                    <Truck size={16} className="text-white" />
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">النقطة الحالية</span>
                </div>
                <ChevronLeft size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-gray-900 truncate" dir="auto" data-preserve-source-text>
                {activeShipment.customerName ?? `#${activeShipment.id}`}
              </h3>
              {activeShipment.address && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <MapPin size={13} className="text-emerald-500 flex-shrink-0" />
                  <p className="text-xs text-gray-500 truncate" dir="auto" data-preserve-source-text>
                    {activeShipment.address}
                  </p>
                </div>
              )}
            </button>
          </motion.div>
        )}

        {/* Shift Workflow */}
        <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">خطة اليوم</p>
              <h3 className="text-base font-bold text-gray-900 mt-0.5">{currentWorkflowStep.label}</h3>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
              activePhase === 'delivered'
                ? 'bg-emerald-100 text-emerald-700'
                : activePhase === 'no_plan'
                ? 'bg-gray-100 text-gray-500'
                : 'bg-emerald-50 text-emerald-600'
            }`}>
              {activePhase === 'delivered'
                ? 'مكتمل'
                : activePhase === 'no_plan'
                ? 'بدون خطة'
                : `${Math.min(activeStepIndex + 1, workflowSteps.length)}/${workflowSteps.length}`}
            </span>
          </div>

          {/* Workflow Steps */}
          <div className="flex items-start gap-1">
            {workflowSteps.map((step, index) => {
              const StepIcon = step.icon;
              const isDone = activePhase === 'delivered' || index < activeStepIndex;
              const isCurrent = index === activeStepIndex && activePhase !== 'delivered' && activePhase !== 'no_plan';

              return (
                <div key={step.key} className="flex-1 flex flex-col items-center gap-1.5 relative">
                  {/* Connector line */}
                  {index < workflowSteps.length - 1 && (
                    <div className={`absolute top-4 left-[calc(50%+14px)] w-[calc(100%-28px)] h-0.5 ${
                      isDone ? 'bg-emerald-300' : 'bg-gray-200'
                    }`} />
                  )}
                  <div
                    className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                        : isCurrent
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-300 ring-4 ring-emerald-100'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isDone ? <CheckCircle size={15} /> : <StepIcon size={15} />}
                  </div>
                  <span className={`text-[10px] font-semibold text-center leading-tight ${
                    isCurrent ? 'text-emerald-700' : isDone ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
            {/* Completed state extra dot */}
            {activePhase === 'delivered' && (
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <div className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center bg-emerald-500 text-white shadow-md shadow-emerald-200">
                  <CheckCircle size={15} />
                </div>
                <span className="text-[10px] font-semibold text-emerald-700">نهاية</span>
              </div>
            )}
          </div>

          {/* Current Step Description */}
          <p className="text-xs text-gray-500 mt-4 text-center leading-relaxed">
            {currentWorkflowStep.description}
          </p>

          {/* Action Buttons */}
          <div className="mt-4 flex gap-2">
            {activePlanId && activePhase !== 'no_plan' && activePhase !== 'delivered' && (
              <button
                type="button"
                onClick={() => navigate(`/plan/${activePlanId}/reorder`)}
                className="h-12 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-gray-500 active:scale-95 transition-transform flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                ترتيب
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleWorkflowAction()}
              disabled={!canUseWorkflowAction}
              className={`h-12 flex-1 rounded-xl px-4 text-sm font-bold text-white active:scale-[0.97] transition-all flex items-center justify-center gap-2 ${
                !canUseWorkflowAction
                  ? 'bg-gray-300 cursor-not-allowed'
                  : activePhase === 'out_for_delivery'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-200'
                  : activePhase === 'delivered'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg shadow-blue-200'
                  : 'bg-gradient-to-r from-gray-800 to-gray-900 shadow-lg shadow-gray-200'
              } ${isWorkflowSubmitting ? 'opacity-70' : ''}`}
            >
              {activePhase === 'assigned' && <Package size={16} />}
              {activePhase === 'starting_shift' && <FileCheck2 size={16} />}
              {activePhase === 'picked_up' && <Truck size={16} />}
              {activePhase === 'out_for_delivery' && <MapPin size={16} />}
              {activePhase === 'delivered' && <CheckCircle size={16} />}
              {workflowActionLabel}
            </button>
          </div>
        </motion.div>

        {/* Outstanding Collection Warning */}
        {outstandingCollectionAmount > 0 && (
          <motion.div
            variants={itemVariants}
            className="mx-4 mt-4 rounded-2xl border border-red-100 bg-red-50 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <DollarSign size={18} className="text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-700">تحصيل غير مسلم</h3>
                  <p className="text-[11px] text-red-400 mt-0.5">
                    يبقى بالسالب حتى يتم تسليمه
                  </p>
                </div>
              </div>
              <span className="rounded-xl bg-white px-3 py-1.5 text-sm font-bold text-red-600 border border-red-100">
                -{new Intl.NumberFormat('ar-EG', {
                  style: 'currency',
                  currency: collectionCurrency,
                  maximumFractionDigits: 0,
                }).format(outstandingCollectionAmount)}
              </span>
            </div>
          </motion.div>
        )}

        {/* Live Map */}
        {activePhase === 'out_for_delivery' && (
          <motion.div variants={itemVariants} className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">الخريطة المباشرة</h3>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('route');
                  navigate('/route');
                }}
                className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg"
              >
                خط السير
              </button>
            </div>
            <DriverLiveRouteMap shipments={shipments} activeShipmentId={activeShipment?.id ?? null} />
          </motion.div>
        )}

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="px-4 mt-4">
          <h3 className="text-sm font-semibold text-gray-800 mb-3">إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: AlertTriangle, label: 'SOS', action: handleSos, iconBg: 'bg-red-50', iconColor: 'text-red-500', ringColor: 'ring-red-100' },
              { icon: PhoneCall, label: 'اتصال بالعميل', action: handleCallCustomer, iconBg: 'bg-blue-50', iconColor: 'text-blue-600', ringColor: 'ring-blue-100' },
              { icon: FileCheck2, label: 'POD', action: handleOpenPod, iconBg: 'bg-purple-50', iconColor: 'text-purple-600', ringColor: 'ring-purple-100' },
              {
                icon: isDriverOnline ? Wifi : WifiOff,
                label: isDriverOnline ? 'متصل' : 'غير متصل',
                action: () => {
                  setDriverOnline(!isDriverOnline);
                  handleSync();
                },
                iconBg: isDriverOnline ? 'bg-emerald-50' : 'bg-orange-50',
                iconColor: isDriverOnline ? 'text-emerald-500' : 'text-orange-500',
                ringColor: isDriverOnline ? 'ring-emerald-100' : 'ring-orange-100',
              },
            ].map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className={`bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col items-center gap-2.5 active:scale-[0.97] transition-all ring-1 ${action.ringColor}`}
              >
                <div className={`w-11 h-11 rounded-xl ${action.iconBg} flex items-center justify-center`}>
                  <action.icon size={20} className={action.iconColor} />
                </div>
                <span className="text-xs font-semibold text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Priority Deliveries */}
        {priorityShipments.length > 0 && (
          <motion.div variants={itemVariants} className="px-4 mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">التسليمات ذات الأولوية</h3>
              <button
                onClick={() => { setActiveTab('deliveries'); navigate('/deliveries'); }}
                className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg"
              >
                عرض الكل
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
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
        {recentActivity.length > 0 && (
          <motion.div variants={itemVariants} className="px-4 mt-5 mb-6">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">آخر النشاط</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {recentActivity.map((activity, i) => (
                <div
                  key={`${activity.shipmentId}-${i}`}
                  className={`flex items-start gap-3 px-4 py-3 ${
                    i < recentActivity.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div className="mt-1.5 flex-shrink-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        activity.status === 'delivered'
                          ? 'bg-emerald-400'
                          : activity.status === 'failed'
                          ? 'bg-red-400'
                          : activity.status === 'in_transit'
                          ? 'bg-amber-400'
                          : 'bg-blue-400'
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      {activity.action.replace('تم تغيير الحالة إلى', '').replace('Status changed to', '').trim()}
                      {activity.shipmentCustomer && (
                        <>
                          {' - '}
                          <span className="font-semibold" dir="auto" data-preserve-source-text>{activity.shipmentCustomer}</span>
                        </>
                      )}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
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
        )}
      </motion.div>

      {/* Collection Bottom Sheet */}
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
