import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Camera, CheckCircle, Package, Search, X } from 'lucide-react';
import { useOrderStore } from '../stores/orderStore';
import { useUIStore } from '../stores/uiStore';
import AppHeader from '../components/AppHeader';
import type { PrepOrderItem, ProductDataset, ScannerResult, UnavailabilityReason } from '../types';

const shortageReasons: Array<{ value: UnavailabilityReason; label: string }> = [
  { value: 'out_of_stock', label: 'نفاد المخزون' },
  { value: 'damaged', label: 'تالف' },
  { value: 'expired', label: 'منتهي الصلاحية' },
  { value: 'customer_removal', label: 'إزالة بطلب العميل' },
  { value: 'warehouse_issue', label: 'مشكلة في المخزن' },
  { value: 'other', label: 'أخرى' },
];

const ALL_BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
];

const READER_ID = 'dispatcher-barcode-reader';
const DEDUP_MS = 2_500;
const STABLE_SCAN_WINDOW_MS = 1_600;
const MIN_SCAN_HITS = 1;
const NATIVE_DETECTOR_INTERVAL_MS = 90;

const NATIVE_BARCODE_FORMATS = [
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'itf',
  'qr_code',
  'data_matrix',
  'pdf417',
];

type NativeBarcodeResult = {
  rawValue?: string;
};

type NativeBarcodeDetector = {
  detect: (source: CanvasImageSource) => Promise<NativeBarcodeResult[]>;
};

type NativeBarcodeDetectorConstructor = new (options?: { formats?: string[] }) => NativeBarcodeDetector;

type ExtendedCameraCapabilities = MediaTrackCapabilities & {
  focusMode?: string[];
  exposureMode?: string[];
};

function getNativeBarcodeDetector(): NativeBarcodeDetectorConstructor | null {
  const candidate = (globalThis as typeof globalThis & {
    BarcodeDetector?: NativeBarcodeDetectorConstructor;
  }).BarcodeDetector;
  return typeof candidate === 'function' ? candidate : null;
}

function getPreferredVideoConstraints(): MediaTrackConstraints {
  const advanced = [
    { focusMode: 'continuous' },
    { exposureMode: 'continuous' },
  ] as unknown as MediaTrackConstraintSet[];

  return {
    facingMode: { ideal: 'environment' },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30, min: 8 },
    advanced,
  };
}

async function applyRunningCameraQuality(scanner: Html5Qrcode) {
  try {
    const capabilities = scanner.getRunningTrackCapabilities() as ExtendedCameraCapabilities;
    const advanced: Array<Record<string, string>> = [];

    if (capabilities.focusMode?.includes('continuous')) {
      advanced.push({ focusMode: 'continuous' });
    }
    if (capabilities.exposureMode?.includes('continuous')) {
      advanced.push({ exposureMode: 'continuous' });
    }

    if (advanced.length > 0) {
      await scanner.applyVideoConstraints({
        advanced: advanced as unknown as MediaTrackConstraintSet[],
      });
    }
  } catch {
    // Some mobile browsers expose capabilities but reject focus constraints.
  }
}

function isEditableElement(element: Element | null) {
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || element.getAttribute('contenteditable') === 'true';
}

function cameraError(err: unknown): string {
  const n = err instanceof DOMException ? err.name : '';
  if (n === 'NotAllowedError' || n === 'PermissionDeniedError')
    return 'تم رفض إذن الكاميرا. اسمح للمتصفح بالكاميرا ثم حاول مرة أخرى.';
  if (n === 'NotFoundError' || n === 'DevicesNotFoundError')
    return 'لم يتم العثور على كاميرا متاحة.';
  if (n === 'NotReadableError' || n === 'TrackStartError')
    return 'الكاميرا مستخدمة حاليًا في تطبيق آخر.';
  console.error('[scanner] camera error:', err);
  return err instanceof Error ? err.message : 'تعذر تشغيل الكاميرا.';
}

export default function ScannerScreen() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('order');
  const selectedItemId = searchParams.get('item');
  const orders = useOrderStore((s) => s.orders);
  const loadOrderDetail = useOrderStore((s) => s.loadOrderDetail);
  const validateBarcode = useOrderStore((s) => s.validateBarcode);
  const lookupBarcode = useOrderStore((s) => s.lookupBarcode);
  const registerBarcode = useOrderStore((s) => s.registerBarcode);
  const searchProductDataset = useOrderStore((s) => s.searchProductDataset);
  const confirmPreparedItem = useOrderStore((s) => s.confirmPreparedItem);
  const showToast = useUIStore((s) => s.showToast);

  const order = orders.find((candidate) => candidate.id === orderId);
  const selectedItem = useMemo(
    () => order?.items.find((item) => item.id === selectedItemId) ?? null,
    [order?.items, selectedItemId],
  );
  const visibleItems = useMemo(
    () => selectedItem ? [selectedItem] : order?.items ?? [],
    [order?.items, selectedItem],
  );

  const [manualBarcode, setManualBarcode] = useState('');
  const [activeBarcode, setActiveBarcode] = useState('');
  const [scannedProduct, setScannedProduct] = useState<PrepOrderItem | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [confirmQty, setConfirmQty] = useState(0);
  const [shortageReason, setShortageReason] = useState<UnavailabilityReason | ''>('');
  const [shortageNote, setShortageNote] = useState('');
  const [datasetSearch, setDatasetSearch] = useState('');
  const [datasetResults, setDatasetResults] = useState<ProductDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<ProductDataset | null>(null);
  const [selectedRegistrationItemId, setSelectedRegistrationItemId] = useState<string | null>(selectedItemId);
  const [isWorking, setIsWorking] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError_, setCameraError] = useState<string | null>(null);
  const [scannerHint, setScannerHint] = useState('جاهز لاستقبال الباركود');
  const [scanError, setScanError] = useState<string | null>(null);
  const [inquiryResult, setInquiryResult] = useState<ScannerResult | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; count: number; firstSeen: number; lastSeen: number } | null>(null);
  const lastSentRef = useRef<{ code: string; at: number } | null>(null);
  const keyboardBufferRef = useRef('');
  const keyboardTimerRef = useRef<number | null>(null);
  const nativeDetectorRef = useRef<NativeBarcodeDetector | null>(null);
  const nativeDetectorTimerRef = useRef<number | null>(null);
  const handleScanRef = useRef<(code: string) => void>(() => {});

  const openQuantityDialog = useCallback((item: PrepOrderItem, barcode: string) => {
    setScannedProduct(item);
    setActiveBarcode(barcode);
    setConfirmQty(item.ordered_quantity);
    setShortageReason('');
    setShortageNote('');
    setShowConfirm(true);
  }, []);

  const shouldAcceptScan = useCallback((code: string): boolean => {
    const now = Date.now();
    const current = lastScanRef.current;
    const isSame = current?.code === code && now - current.lastSeen < STABLE_SCAN_WINDOW_MS;
    const next = isSame
      ? { ...current, count: current.count + 1, lastSeen: now }
      : { code, count: 1, firstSeen: now, lastSeen: now };
    lastScanRef.current = next;
    return next.count >= MIN_SCAN_HITS && now - next.firstSeen <= STABLE_SCAN_WINDOW_MS;
  }, []);

  const handleBarcodeScan = useCallback(async (barcode: string) => {
    const normalized = barcode.trim();
    if (!normalized) return;

    const lastSent = lastSentRef.current;
    if (lastSent?.code === normalized && Date.now() - lastSent.at < DEDUP_MS) return;

    setIsWorking(true);
    setScanError(null);
    setScannerHint(`تمت قراءة الباركود: ${normalized}`);
    try {
      if (orderId && order) {
        const result = await validateBarcode(orderId, normalized);
        if (!result.productId && !result.datasetId) {
          setActiveBarcode(normalized);
          setShowRegistration(true);
          showToast('الباركود غير مسجل، اختر المنتج لتسجيله', 'info');
          return;
        }

        const matchedItem = order.items.find((item) => item.id === result.orderItemId) ?? null;
        if (!matchedItem) {
          const productName = result.productName ?? 'غير معروف';
          const errorMsg = `الباركود يخص منتج "${productName}" وهو غير موجود في هذا الطلب`;
          showToast(errorMsg, 'error');
          setScannerHint(errorMsg);
          setScanError(errorMsg);
          return;
        }

        if (selectedItem && matchedItem.id !== selectedItem.id) {
          const productName = result.productName ?? 'غير معروف';
          const errorMsg = `الباركود يخص "${productName}" وليس "${selectedItem.product_name}"`;
          showToast(errorMsg, 'error');
          setScannerHint(errorMsg);
          setScanError(errorMsg);
          return;
        }

        lastSentRef.current = { code: normalized, at: Date.now() };
        openQuantityDialog(matchedItem, normalized);
      } else {
        const result = await lookupBarcode(normalized);
        if (!result.productId && !result.datasetId) {
          setActiveBarcode(normalized);
          setShowRegistration(true);
          showToast('الباركود غير مسجل، اختر المنتج لتسجيله', 'info');
          return;
        }
        lastSentRef.current = { code: normalized, at: Date.now() };
        setInquiryResult(result);
        setScannerHint(`تم العثور على: ${result.productName ?? 'غير معروف'}`);
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل التحقق من الباركود', 'error');
      setScannerHint('فشل التحقق من الباركود');
      setScanError(error instanceof Error ? error.message : 'فشل التحقق من الباركود');
    } finally {
      setIsWorking(false);
      setManualBarcode('');
    }
  }, [lookupBarcode, openQuantityDialog, order, orderId, selectedItem, showToast, validateBarcode]);

  handleScanRef.current = handleBarcodeScan;

  const stopNativeBarcodeDetection = useCallback(() => {
    if (nativeDetectorTimerRef.current) {
      window.clearTimeout(nativeDetectorTimerRef.current);
      nativeDetectorTimerRef.current = null;
    }
    nativeDetectorRef.current = null;
  }, []);

  const startNativeBarcodeDetection = useCallback(() => {
    stopNativeBarcodeDetection();

    const Detector = getNativeBarcodeDetector();
    if (!Detector) return;

    try {
      nativeDetectorRef.current = new Detector({ formats: NATIVE_BARCODE_FORMATS });
    } catch {
      return;
    }

    const detectNextFrame = async () => {
      const detector = nativeDetectorRef.current;
      const scanner = scannerRef.current;
      if (!detector || !scanner?.isScanning) return;

      try {
        const video = document.querySelector<HTMLVideoElement>(`#${READER_ID} video`);
        if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          const results = await detector.detect(video);
          const code = results
            .map((result) => result.rawValue?.trim() ?? '')
            .find(Boolean);
          if (code && shouldAcceptScan(code)) {
            void handleScanRef.current(code);
          }
        }
      } catch {
        // Native detection is an enhancement; html5-qrcode remains active.
      }

      nativeDetectorTimerRef.current = window.setTimeout(detectNextFrame, NATIVE_DETECTOR_INTERVAL_MS);
    };

    nativeDetectorTimerRef.current = window.setTimeout(detectNextFrame, 250);
  }, [shouldAcceptScan, stopNativeBarcodeDetection]);

  const startCamera = useCallback(async () => {
    if (scannerRef.current) return;
    if (!document.getElementById(READER_ID)) return;

    setCameraError(null);
    setScannerHint('جاري تشغيل الكاميرا...');

    try {
      const scanner = new Html5Qrcode(READER_ID, {
        formatsToSupport: ALL_BARCODE_FORMATS,
        useBarCodeDetectorIfSupported: false,
        verbose: false,
      });
      scannerRef.current = scanner;
      const videoConstraints = getPreferredVideoConstraints();

      await scanner.start(
        videoConstraints,
        { fps: 15, disableFlip: false, videoConstraints },
        (text) => {
          const code = text.trim();
          if (code && shouldAcceptScan(code)) {
            void handleScanRef.current(code);
          }
        },
        () => {},
      );

      void applyRunningCameraQuality(scanner);
      startNativeBarcodeDetection();
      setScanning(true);
      setScannerHint('ضع الباركود داخل الإطار وسيتم قراءته تلقائيا');
    } catch (err) {
      setCameraError(cameraError(err));
      setScannerHint('تعذر تشغيل الكاميرا');
      scannerRef.current = null;
    }
  }, [shouldAcceptScan, startNativeBarcodeDetection]);

  const stopCamera = useCallback(async () => {
    stopNativeBarcodeDetection();
    const s = scannerRef.current;
    if (s) {
      const cleanup = () => { try { s.clear() } catch { /* */ } };
      if (s.isScanning) await s.stop().then(cleanup).catch(cleanup);
      else cleanup();
      scannerRef.current = null;
    }
    setScanning(false);
  }, [stopNativeBarcodeDetection]);

  useEffect(() => {
    if (showConfirm || showRegistration) {
      void stopCamera();
    } else {
      const tid = setTimeout(() => void startCamera(), 300);
      return () => clearTimeout(tid);
    }
    return undefined;
  }, [showConfirm, showRegistration, startCamera, stopCamera]);

  useEffect(() => {
    return () => {
      void stopCamera();
      if (keyboardTimerRef.current) window.clearTimeout(keyboardTimerRef.current);
      stopNativeBarcodeDetection();
    };
  }, [stopCamera, stopNativeBarcodeDetection]);

  useEffect(() => {
    if (orderId) {
      loadOrderDetail(orderId).catch(() => undefined);
    }
  }, [loadOrderDetail, orderId]);

  useEffect(() => {
    setSelectedRegistrationItemId(selectedItemId);
  }, [selectedItemId]);

  useEffect(() => {
    if (!showConfirm && !showRegistration) {
      const focusTimer = window.setTimeout(() => barcodeInputRef.current?.focus(), 80);
      return () => window.clearTimeout(focusTimer);
    }
    return undefined;
  }, [showConfirm, showRegistration, selectedItemId]);

  const submitBufferedKeyboardScan = useCallback(() => {
    const buffered = keyboardBufferRef.current.trim();
    keyboardBufferRef.current = '';
    if (keyboardTimerRef.current) {
      window.clearTimeout(keyboardTimerRef.current);
      keyboardTimerRef.current = null;
    }
    if (buffered.length >= 4) {
      void handleScanRef.current(buffered);
    }
  }, []);

  useEffect(() => {
    if (showConfirm || showRegistration) return undefined;

    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (isEditableElement(document.activeElement)) return;

      if (event.key === 'Enter') {
        submitBufferedKeyboardScan();
        return;
      }

      if (event.key.length !== 1) return;
      keyboardBufferRef.current += event.key;
      setScannerHint('جار استقبال قراءة من قارئ الباركود...');

      if (keyboardTimerRef.current) {
        window.clearTimeout(keyboardTimerRef.current);
      }
      keyboardTimerRef.current = window.setTimeout(submitBufferedKeyboardScan, 140);
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showConfirm, showRegistration, submitBufferedKeyboardScan]);

  useEffect(() => {
    if (showConfirm || showRegistration || manualBarcode.trim().length < 5) return undefined;
    const submitTimer = window.setTimeout(() => {
      const value = manualBarcode.trim();
      if (value.length >= 5) {
        void handleScanRef.current(value);
      }
    }, 220);

    return () => window.clearTimeout(submitTimer);
  }, [manualBarcode, showConfirm, showRegistration]);

  const handleManualSearch = () => {
    const value = manualBarcode.trim();
    if (!value) return;
    void handleScanRef.current(value);
  };

  const handleRetryScan = useCallback(() => {
    setScanError(null);
    setInquiryResult(null);
    setScannerHint('ضع الباركود داخل الإطار وسيتم قراءته تلقائيا');
    lastScanRef.current = null;
    lastSentRef.current = null;
    if (!scanning && !cameraError_) {
      void startCamera();
    }
  }, [scanning, cameraError_, startCamera]);

  const handleDatasetSearch = async () => {
    if (!datasetSearch.trim()) return;
    setIsWorking(true);
    try {
      const results = await searchProductDataset(datasetSearch);
      setDatasetResults(results);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل البحث في المنتجات', 'error');
    } finally {
      setIsWorking(false);
    }
  };

  const handleRegisterBarcode = async () => {
    if (!order || !activeBarcode) return;
    const item = order.items.find((candidate) => candidate.id === selectedRegistrationItemId) ?? selectedItem;
    if (!item) {
      showToast('اختر منتج الطلب أولا', 'error');
      return;
    }
    if (!item.product_id && !selectedDataset) {
      showToast('اختر منتجا من قاعدة المنتجات لتسجيل الباركود', 'error');
      return;
    }

    setIsWorking(true);
    try {
      const result = await registerBarcode({
        barcode: activeBarcode,
        item,
        datasetId: selectedDataset?.id ?? item.dataset_id,
        productId: item.product_id ?? selectedDataset?.product_id ?? null,
      });
      setShowRegistration(false);
      setSelectedDataset(null);
      setDatasetResults([]);
      if (result.matched && result.orderItemId) {
        const matchedItem = order.items.find((candidate) => candidate.id === result.orderItemId) ?? item;
        openQuantityDialog(matchedItem, activeBarcode);
      } else {
        openQuantityDialog(item, activeBarcode);
      }
      showToast('تم تسجيل الباركود', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل تسجيل الباركود', 'error');
    } finally {
      setIsWorking(false);
    }
  };

  const handleConfirmQty = async () => {
    if (!scannedProduct || !orderId) return;
    if (confirmQty < scannedProduct.ordered_quantity && !shortageReason) {
      showToast('اختر سبب نقص الكمية', 'error');
      return;
    }

    setIsWorking(true);
    try {
      await confirmPreparedItem(
        orderId,
        scannedProduct.id,
        confirmQty,
        confirmQty < scannedProduct.ordered_quantity ? shortageReason || null : null,
        shortageNote.trim() || undefined,
      );
      showToast('تم حفظ الكمية المعتمدة', 'success');
      setShowConfirm(false);
      setScannedProduct(null);
      setScanError(null);
      await loadOrderDetail(orderId);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'فشل حفظ الكمية', 'error');
    } finally {
      setIsWorking(false);
    }
  };

  if (!order && orderId) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <AppHeader title="مسح المنتجات" showBack />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-app-text-secondary">لم يتم تحديد طلب</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <AppHeader title={order ? (selectedItem ? 'مسح المنتج' : 'مسح المنتجات') : 'استعلام المنتجات'} showBack />
      <style>{`
        @keyframes scanner-laser-sweep {
          0%   { top: 12%; opacity: 1; }
          48%  { top: 88%; opacity: 1; }
          50%  { opacity: 0; }
          52%  { top: 12%; opacity: 0; }
          54%  { opacity: 1; }
          100% { top: 12%; opacity: 1; }
        }
        .scanner-laser {
          position: absolute;
          left: 6%; right: 6%;
          height: 2px;
          background: linear-gradient(90deg, transparent, #22c55e, #4ade80, #22c55e, transparent);
          box-shadow: 0 0 8px 2px rgba(34,197,94,0.6);
          animation: scanner-laser-sweep 1.8s cubic-bezier(0.4,0,0.6,1) infinite;
          pointer-events: none;
          z-index: 40;
          border-radius: 2px;
        }
        #${READER_ID},
        #${READER_ID} video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover;
        }
      `}</style>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {order && selectedItem && (
          <div className="mx-4 mt-4 rounded-xl bg-brand-50 p-4">
            <p className="text-xs font-medium text-brand-500">المنتج المحدد</p>
            <p className="mt-1 text-sm font-semibold text-app-text">{selectedItem.product_name}</p>
            <p className="mt-0.5 text-xs text-app-text-secondary">المطلوب: {selectedItem.ordered_quantity}</p>
          </div>
        )}

        <div className="mx-4 mt-4 bg-white rounded-xl shadow-card overflow-hidden">
          <div className="relative bg-black" style={{ minHeight: 300, height: 'min(58vh, 360px)' }}>
            <div id={READER_ID} className="w-full h-full" />

            {scanning && <div className="scanner-laser" />}

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 border-green-500" />
              <div className="absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 border-green-500" />
              <div className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 border-green-500" />
              <div className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 border-green-500" />
            </div>

            <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-black/70 px-3 py-2 text-center text-xs font-medium text-white z-20">
              {cameraError_ ?? scannerHint}
            </div>

            {scanError && !showConfirm && !showRegistration && (
              <button
                onClick={handleRetryScan}
                className="absolute bottom-14 left-1/2 -translate-x-1/2 px-4 py-2 bg-app-accent text-white rounded-xl text-xs font-semibold active:scale-95 transition-transform whitespace-nowrap z-20"
              >
                إعادة المسح
              </button>
            )}

            {!scanning && !cameraError_ && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-10">
                <Camera size={40} className="text-gray-400" />
                <span className="text-sm text-gray-400">جاري تشغيل الكاميرا...</span>
              </div>
            )}

            {cameraError_ && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-10">
                <Camera size={40} className="text-gray-500" />
                <p className="text-sm text-gray-400 text-center px-6">{cameraError_}</p>
                <button onClick={handleRetryScan} className="px-4 py-2 bg-app-dark text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform">
                  إعادة المحاولة
                </button>
              </div>
            )}
          </div>
        </div>

        {!orderId && inquiryResult && (
          <div className="mx-4 mt-3 bg-white rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-app-accent" />
                <h3 className="text-sm font-semibold text-app-text">معلومات المنتج</h3>
              </div>
              <button onClick={() => setInquiryResult(null)} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-brand-25/70">
                <X size={14} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex gap-4">
                {inquiryResult.imageUrl ? (
                  <img src={inquiryResult.imageUrl} alt={inquiryResult.productName ?? ''} className="w-20 h-20 rounded-xl object-cover bg-gray-100 flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package size={28} className="text-gray-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-app-text truncate">{inquiryResult.productName ?? 'غير معروف'}</p>
                  <p className="text-xs text-app-text-secondary mt-1">الباركود: {inquiryResult.barcode}</p>
                  {inquiryResult.baseId && (
                    <p className="text-xs text-app-text-secondary">base_id: {inquiryResult.baseId}</p>
                  )}
                  {inquiryResult.variants && (
                    <p className="text-xs text-app-text-secondary mt-0.5">النوع: {inquiryResult.variants}</p>
                  )}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {inquiryResult.price != null && inquiryResult.price > 0 && (
                  <div className="rounded-lg bg-brand-25 px-3 py-2">
                    <p className="text-[10px] text-app-text-secondary">السعر</p>
                    <p className="text-sm font-semibold text-app-text">{inquiryResult.price} ج.م</p>
                  </div>
                )}
                {inquiryResult.stock != null && (
                  <div className="rounded-lg bg-brand-25 px-3 py-2">
                    <p className="text-[10px] text-app-text-secondary">المخزون</p>
                    <p className="text-sm font-semibold text-app-text">{inquiryResult.stock}</p>
                  </div>
                )}
              </div>
              <button
                onClick={handleRetryScan}
                className="mt-3 w-full h-10 bg-app-dark text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform"
              >
                مسح منتج آخر
              </button>
            </div>
          </div>
        )}

        <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-card">
          <label className="text-sm font-medium text-app-text mb-2 block">إدخال يدوي للباركود</label>
          <div className="flex gap-2">
            <input
              ref={barcodeInputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              autoCapitalize="off"
              value={manualBarcode}
              onChange={(event) => setManualBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleManualSearch();
                }
              }}
              placeholder="امسح أو أدخل الباركود..."
              className="flex-1 h-11 bg-gray-100 rounded-xl px-4 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent"
            />
            <button disabled={isWorking} onClick={handleManualSearch} className="h-11 px-4 bg-app-dark text-white rounded-xl active:scale-95 transition-transform disabled:opacity-50">
              <Search size={18} />
            </button>
          </div>
        </div>

        {orderId && order && (
          <div className="mx-4 mt-3 bg-white rounded-xl shadow-card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-app-text">{selectedItem ? 'المنتج المطلوب' : `منتجات الطلب (${order.items.length})`}</h3>
            </div>
            {visibleItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => navigate(`/scanner?order=${order.id}&item=${item.id}`)}
                className={`w-full px-4 py-3 flex items-center justify-between text-right ${index < visibleItems.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium text-app-text">{item.product_name}</p>
                  <p className="text-xs text-app-text-secondary">المطلوب: {item.ordered_quantity} | المعتمد: {item.confirmed_quantity}</p>
                </div>
                {item.preparation_status !== 'pending' ? (
                  <CheckCircle size={18} className="text-app-success" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {showRegistration && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full max-h-[86vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-app-text">تسجيل باركود جديد</h3>
            <p className="mt-1 text-xs text-app-text-secondary">الباركود: {activeBarcode}</p>

            <label className="mt-4 text-sm font-medium text-app-text block">منتج الطلب</label>
            <select value={selectedRegistrationItemId ?? ''} onChange={(event) => setSelectedRegistrationItemId(event.target.value)} className="mt-2 w-full h-11 rounded-xl bg-gray-100 px-3 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent">
              <option value="">اختر منتج الطلب</option>
              {visibleItems.map((item) => (
                <option key={item.id} value={item.id}>{item.product_name ?? item.product_code ?? item.id}</option>
              ))}
            </select>

            <label className="mt-4 text-sm font-medium text-app-text block">البحث في قاعدة المنتجات</label>
            <div className="mt-2 flex gap-2">
              <input value={datasetSearch} onChange={(event) => setDatasetSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleDatasetSearch()} className="flex-1 h-11 rounded-xl bg-gray-100 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-app-accent" placeholder="اسم المنتج أو base_id" />
              <button onClick={handleDatasetSearch} className="h-11 px-4 rounded-xl bg-app-dark text-white">
                <Search size={18} />
              </button>
            </div>

            {datasetResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {datasetResults.map((dataset) => (
                  <button
                    key={dataset.id}
                    onClick={() => setSelectedDataset(dataset)}
                    className={`w-full rounded-xl border p-3 text-right ${selectedDataset?.id === dataset.id ? 'border-app-accent bg-brand-50' : 'border-gray-100 bg-white'}`}
                  >
                    <p className="text-sm font-semibold text-app-text">{dataset.name}</p>
                    <p className="text-xs text-app-text-secondary">barcode: {dataset.barcode}</p>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 flex gap-3">
              <button onClick={() => setShowRegistration(false)} className="flex-1 h-12 border border-gray-200 rounded-xl font-semibold text-app-text-secondary active:scale-95 transition-transform">
                إلغاء
              </button>
              <button disabled={isWorking} onClick={handleRegisterBarcode} className="flex-1 h-12 bg-app-dark text-white rounded-xl font-semibold active:scale-95 transition-transform disabled:opacity-50">
                تسجيل
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && scannedProduct && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-app-light flex items-center justify-center">
                <CheckCircle size={20} className="text-app-success" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-app-text">تأكيد الكمية</h3>
                <p className="text-xs text-app-text-secondary">{scannedProduct.product_name}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-app-text mb-1 block">الكمية المطلوبة: {scannedProduct.ordered_quantity}</label>
              <input type="number" min={0} max={scannedProduct.ordered_quantity} value={confirmQty} onChange={(event) => setConfirmQty(Number(event.target.value))} className="w-full h-12 bg-gray-100 rounded-xl px-4 text-lg font-semibold text-app-text text-center focus:outline-none focus:ring-2 focus:ring-app-accent" />
            </div>
            {confirmQty < scannedProduct.ordered_quantity && (
              <div className="mb-4 space-y-3">
                <div className="rounded-xl bg-warning-50 p-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-warning-600" />
                  <span className="text-xs text-warning-700">يجب تحديد سبب نقص الكمية</span>
                </div>
                <select value={shortageReason} onChange={(event) => setShortageReason(event.target.value as UnavailabilityReason)} className="w-full h-11 rounded-xl bg-gray-100 px-3 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent">
                  <option value="">اختر السبب</option>
                  {shortageReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>{reason.label}</option>
                  ))}
                </select>
                <textarea value={shortageNote} onChange={(event) => setShortageNote(event.target.value)} placeholder="ملاحظات اختيارية" className="w-full min-h-[76px] rounded-xl bg-gray-100 p-3 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent" />
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowConfirm(false); setScannedProduct(null); setScanError(null); }} className="flex-1 h-12 border border-gray-200 rounded-xl font-semibold text-app-text-secondary active:scale-95 transition-transform">
                إلغاء
              </button>
              <button disabled={isWorking} onClick={handleConfirmQty} className="flex-1 h-12 bg-app-dark text-white rounded-xl font-semibold active:scale-95 transition-transform disabled:opacity-50">
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
