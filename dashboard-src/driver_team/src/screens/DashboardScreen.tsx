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
  Eye,
  Lock,
  Layers,
} from 'lucide-react';
import { useDeliveryStore } from '@/stores/deliveryStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import ShipmentListItem from '@/components/ShipmentListItem';
import BottomSheet from '@/components/BottomSheet';
import StatusBadge from '@/components/StatusBadge';
import DriverDashboardMap from '@/components/DriverDashboardMap';
import EndOfRouteModal from '@/components/EndOfRouteModal';
import { createDriverSosAlert } from '@/services/driverAlerts';
import { submitCollectionRequest, submitCollectionHandover } from '@/services/collectionHandover';
import { uploadDeliveryProof, fetchOrderCollectionsForPlan, driverWarehouseCheckIn } from '@/services/shipmentData';
import { getCurrentDriverLocation } from '@/services/locationTracking';
import { driverAsset } from '@/lib/appAssets';
import type { SettlementBreakdown } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const WAREHOUSE_GEOFENCE_RADIUS_METERS = 500;

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  const attendedToday = useDeliveryStore((s) => s.attendedToday);
  const pendingPlans = useDeliveryStore((s) => s.pendingPlans);
  const viewerPlans = useDeliveryStore((s) => s.viewerPlans);
  const viewerShipments = useDeliveryStore((s) => s.viewerShipments);
  const stats = useMemo(() => getStats(), [getStats]);

  const currentRound = useMemo(() => {
    const rounds = allPlans
      .map((plan) => Number(plan.round_no))
      .filter((value) => Number.isFinite(value) && value >= 1);
    return rounds.length > 0 ? Math.min(...rounds) : null;
  }, [allPlans]);
  const lockedPlans = useMemo(
    () =>
      pendingPlans
        .slice()
        .sort(
          (left, right) =>
            (Number(left.round_no) || 1) - (Number(right.round_no) || 1)
        ),
    [pendingPlans]
  );

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
      collection.collectionStatus !== 'collected_from_customer' &&
      (collection.driverDebtAmount ?? 0) > 0
    );
  const outstandingCollectionAmount = outstandingCollections.reduce(
    (total, collection) => total + (collection?.driverDebtAmount ?? 0),
    0
  );
  const collectionCurrency = outstandingCollections[0]?.currencyCode ?? 'EGP';
  const activePlanId =
    shipments.find((shipment) => !isTerminalShipment(shipment) && shipment.planId)?.planId ??
    activeShipment?.planId ??
    storeActivePlanId ??
    null;

  useEffect(() => {
    if (activePlanId && user?.id) {
      void fetchOrderCollectionsForPlan(activePlanId).then(setSettlementBreakdown);
    }
  }, [activePlanId, user?.id]);

  const activePlanShipments = activePlanId
    ? shipments.filter((shipment) => shipment.planId === activePlanId)
    : shipments;
  const activePhase = (() => {
    if (!storeActivePlanId && !hasActionableShipments && allPlans.length === 0) return 'no_plan';
    if (activePlanShipments.length === 0 && !storeActivePlanId && allPlans.length === 0) return 'no_plan';
    if (attendedToday && !hasActionableShipments && !storeActivePlanId && allPlans.length === 0) return 'attended';
    if (activePlanShipments.length === 0 && allPlans.length > 0) return 'plan_ready';
    if (activePlanShipments.length === 0 && storeActivePlanId) return 'plan_ready';
    if (activePlanShipments.every(isTerminalShipment) && activePlanShipments.length > 0) {
      // Only show the end-of-route flow while the finished plan is still our
      // active plan (in_progress). Once completed (or if no active plan),
      // move on so the driver can check in / start the new day.
      return activePlanId ? 'delivered' : 'no_plan';
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
    // After warehouse check-in, pending shipments move straight to the
    // receiving (second) step instead of going back to the check-in step.
    if (attendedToday && pendingInPlan.length > 0) {
      return 'starting_shift';
    }
    return 'assigned';
  })();
  const canUseWorkflowAction = !isWorkflowSubmitting;
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
    : activePhase === 'attended'
    ? 1
    : Math.max(0, rawWorkflowIndex);
  const currentWorkflowStep =
    activePhase === 'delivered'
      ? {
          label: 'نهاية خط السير',
          description: 'أكمل جميع التسليمات. سجّل التحصيل لإنهاء الوردية.',
        }
      : activePhase === 'no_plan'
      ? {
          label: 'الوصول للمخزن',
          description: 'سجّل وصولك للمخزن حتى يتم تجهيز خط السير.',
        }
      : activePhase === 'plan_ready'
      ? {
          label: 'الوصول للمخزن',
          description: 'سجّل وصولك للمخزن أثناء تجهيز الخطة.',
        }
      : activePhase === 'attended'
      ? {
          label: 'استلام البضاعة',
          description: 'تم تسجيل وصولك وحضورك بالمخزن بالفعل. في انتظار تجهيز الخطة والشحنات لتسليمك.',
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
      : activePhase === 'attended'
      ? 'تم وصولك للمخزن'
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
      if (activePhase === 'no_plan' || activePhase === 'plan_ready' || activePhase === 'assigned') {
        const pendingShipments = shipments.filter((s) => s.status === 'pending');
        const warehouseShipment = pendingShipments.find(
          (s) => s.warehouseCoordinates && s.warehouseCoordinates.lat != null && s.warehouseCoordinates.lng != null
        );
        let lat: number | null = null;
        let lng: number | null = null;
        try {
          const loc = await getCurrentDriverLocation(10000);
          lat = loc.lat;
          lng = loc.lng;
        } catch {
          lat = null;
          lng = null;
        }

        const warehouseName = warehouseShipment?.warehouseOrigin || 'Horeca Marg';
        if (warehouseShipment) {
          const wLat = warehouseShipment.warehouseCoordinates!.lat;
          const wLng = warehouseShipment.warehouseCoordinates!.lng;
          if (lat != null && lng != null) {
            const dist = haversineDistance(lat, lng, wLat, wLng);
            if (dist > WAREHOUSE_GEOFENCE_RADIUS_METERS) {
              showToast(
                `أنت على بعد ${Math.round(dist)} م من المخزن. يجب أن تكون ضمن ${WAREHOUSE_GEOFENCE_RADIUS_METERS} م للوصول.`,
                'error'
              );
              return;
            }
          }
        }

        await driverWarehouseCheckIn({ lat, lng, warehouseName });
        useDeliveryStore.setState({ attendedToday: true });

        // Reload shipments so newly assigned plans/shipments appear and the
        // workflow can advance even if the app was idle when they were synced.
        await loadShipments();
        const refreshed = useDeliveryStore.getState();
        const currentPending = refreshed.shipments.filter((s) => s.status === 'pending');
        const resolvedPlanId = refreshed.activePlanId ?? activePlanId;
        if (currentPending.length > 0 && resolvedPlanId) {
          await startShift();
          showToast('تم تسجيل وصولك للمخزن وأصبحت الشحنات في انتظار التحميل', 'success');
        } else {
          showToast(
            'تم تسجيل وصولك للمخزن. في انتظار تعيين الشحنات للخطة.',
            'info'
          );
        }
        return;
      }
      if (activePhase === 'attended') {
        // Already checked in at the warehouse with no plan yet. Re-sync in case
        // a plan/shipments were just assigned, then stay pinned on the second
        // step (receiving) until there is actual goods to receive or a route.
        await loadShipments();
        const refreshed = useDeliveryStore.getState();
        const currentPending = refreshed.shipments.filter((s) => s.status === 'pending');
        if (currentPending.length > 0 && refreshed.activePlanId) {
          await startShift();
          showToast('تم تعيين الشحنات وبدأت مرحلة الاستلام', 'success');
        } else {
          showToast('في انتظار تجهيز الخطة والشحنات لتسليمك.', 'info');
        }
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
        if (activePlanId) {
          void fetchOrderCollectionsForPlan(activePlanId).then(setSettlementBreakdown);
        }
        setShowEndOfRouteModal(true);
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
      <div className="relative bg-white px-5 pt-5 pb-16 overflow-hidden">
        {/* subtle brand accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
        {/* soft decorative gradient */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-56 h-56 rounded-full bg-gradient-to-br from-emerald-100/70 to-teal-50/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 w-48 h-48 rounded-full bg-gradient-to-tr from-amber-100/50 to-transparent blur-2xl" />

        <div className="relative z-10">
          {/* Top row: logo + online toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <img
                src={driverAsset('logo.png')}
                alt=""
                className="h-9 w-9 rounded-xl object-contain bg-emerald-50 p-1 ring-1 ring-emerald-100"
              />
              <span className="text-gray-900 text-sm font-bold">هوريكا سمارت</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDriverOnline(!isDriverOnline);
                handleSync();
              }}
              className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-all ring-1 ${
                isDriverOnline
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-gray-50 text-gray-500 ring-gray-200'
              }`}
            >
              <span className={`relative flex h-2 w-2`}>
                {isDriverOnline && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    isDriverOnline ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                />
              </span>
              {isDriverOnline ? 'متصل' : 'غير متصل'}
            </button>
          </div>

          {/* Greeting */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">
                {new Date().toLocaleDateString('ar-EG', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>
              <h1 className="text-2xl font-extrabold text-gray-900 leading-tight mt-1">
                {getGreeting()}
                {user?.firstName && <span className="text-emerald-600"> {user.firstName}</span>}
              </h1>
              <p className="text-xs text-gray-400 mt-1">كيف حالك اليوم؟ عندك مهمات بانتظارك</p>
            </div>
            {/* Avatar circle */}
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-lg font-extrabold text-white shadow-lg shadow-emerald-200">
              {(user?.firstName ?? 'س').charAt(0)}
            </div>
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
        <motion.div variants={itemVariants} className="px-4">
          <div className="bg-white rounded-3xl px-5 py-4 shadow-sm border border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: 'الإجمالي',
                  value: displayStats.total,
                  accent: 'bg-gray-900',
                  soft: 'bg-gray-100',
                  text: 'text-gray-900',
                  trend: 'كل الشحنات',
                },
                {
                  label: 'معلق',
                  value: displayStats.pending,
                  accent: 'bg-amber-400',
                  soft: 'bg-amber-50',
                  text: 'text-amber-500',
                  trend: 'قيد التنفيذ',
                },
                {
                  label: 'تم',
                  value: displayStats.delivered,
                  accent: 'bg-emerald-500',
                  soft: 'bg-emerald-50',
                  text: 'text-emerald-600',
                  trend: 'تم التسليم',
                },
              ].map((stat) => (
                <div key={stat.label} className="flex flex-col items-center gap-1 py-1">
                  <div className={`flex items-center gap-1.5 ${stat.soft} rounded-full px-2.5 py-0.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${stat.accent}`} />
                    <span className={`text-[10px] font-semibold ${stat.text}`}>{stat.trend}</span>
                  </div>
                  <span className="text-[30px] font-extrabold leading-none text-gray-900 mt-1 tabular-nums">
                    {stat.value}
                  </span>
                  <span className="text-[11px] font-medium text-gray-400">{stat.label}</span>
                </div>
              ))}
            </div>
            {displayStats.total > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-gray-500">تقدم اليوم</span>
                  <span className="text-[11px] font-bold text-emerald-600 tabular-nums">
                    {Math.round(((displayStats.delivered + displayStats.failed) / displayStats.total) * 100)}%
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
              </div>
            )}
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
              const isCurrent = index === activeStepIndex && activePhase !== 'delivered';

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
          {activePhase === 'attended' && (
            <div className="mt-4 flex items-center justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle size={14} />
                تم تسجيل وصولك وحضورك بالمخزن
              </span>
            </div>
          )}
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
                  : activePhase === 'attended' || activePhase === 'out_for_delivery'
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
              {activePhase === 'attended' && <CheckCircle size={16} />}
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

        {/* Live Map - always visible with driver location + warehouse, route when plan set */}
        <motion.div variants={itemVariants} className="mx-4 mt-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              </span>
              <h3 className="text-sm font-semibold text-gray-800">موقعك المباشر</h3>
              {activePlanId && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  خطة نشطة
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate('/live-map')}
              className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            >
              الشاشة الكاملة
            </button>
          </div>
          <DriverDashboardMap heightClass="h-60" />
        </motion.div>

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

        {/* Driver rounds (خطط الأشواط) */}
        {(allPlans.length > 0 || lockedPlans.length > 0) && (
          <motion.div variants={itemVariants} className="px-4 mt-5">
            <div className="flex items-center gap-2 mb-3">
              <Layers size={15} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-800">الأشواط</h3>
              {currentRound !== null && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600">
                  الشوط الحالي: {currentRound}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2.5">
              {[...allPlans]
                .sort((left, right) => (Number(left.round_no) || 1) - (Number(right.round_no) || 1))
                .map((plan) => {
                  const round = Number(plan.round_no) || 1;
                  const statusLabel =
                    String(plan.plan_status ?? '') === 'completed' ? 'مكتملة' : 'جارية';
                  return (
                    <div
                      key={plan.id}
                      className="flex items-center gap-2.5 bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2.5"
                    >
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 flex-shrink-0">
                        الشوط {round}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-900 truncate" dir="ltr">
                          {plan.plan_reference ?? plan.id}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {plan.planned_date ? new Date(plan.planned_date).toLocaleDateString('ar-EG') : ''}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          String(plan.plan_status ?? '') === 'completed'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              {lockedPlans.map((plan) => {
                const round = Number(plan.round_no) || 1;
                return (
                  <div
                    key={plan.id}
                    className="flex items-center gap-2.5 bg-gray-50 rounded-xl border border-dashed border-gray-200 px-3 py-2.5"
                  >
                    <Lock size={15} className="text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-500 truncate" dir="ltr">
                        {plan.plan_reference ?? plan.id}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        الشوط {round} — مقفول حتى إتمام الأشواط السابقة
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-500 flex-shrink-0">
                      الشوط {round}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Shared plans (read-only) */}
        {viewerPlans.length > 0 && (
          <motion.div variants={itemVariants} className="px-4 mt-5">
            <div className="flex items-center gap-2 mb-3">
              <Eye size={15} className="text-indigo-500" />
              <h3 className="text-sm font-semibold text-gray-800">خطط معروضة (قراءة فقط)</h3>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                {viewerPlans.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {viewerPlans.map((plan) => {
                const planShipments = viewerShipments.filter((shipment) => shipment.planId === plan.id);
                return (
                  <div key={plan.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                      <div className="flex items-center gap-2 min-w-0">
                        <Package size={15} className="text-indigo-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate" dir="ltr">
                            {plan.plan_reference ?? plan.id}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {plan.planned_date ? new Date(plan.planned_date).toLocaleDateString('ar-EG') : ''}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-600">
                        {planShipments.length} شحنة
                      </span>
                    </div>
                    {planShipments.length > 0 && (
                      <div className="divide-y divide-gray-50">
                        {planShipments.map((shipment) => (
                          <div key={shipment.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs font-semibold text-gray-400 w-5 flex-shrink-0">
                                {shipment.routeOrder ? `#${shipment.routeOrder}` : '#'}
                              </span>
                              <p className="text-[13px] text-gray-700 truncate" dir="auto" data-preserve-source-text>
                                {shipment.customerName ?? `#${String(shipment.id).slice(0, 8)}`}
                              </p>
                            </div>
                            <StatusBadge status={shipment.status} size="sm" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              هذه الخطط مسندة لعرضها فقط — يمكنك متابعتها ولا يمكنك تعديلها أو تنفيذ تسليماتها.
            </p>
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
