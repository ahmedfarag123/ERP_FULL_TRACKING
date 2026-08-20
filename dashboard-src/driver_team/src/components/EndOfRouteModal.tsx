import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Camera, X, CheckCircle, Upload, AlertTriangle, ArrowRightLeft, DollarSign, FileCheck, CreditCard } from 'lucide-react';
import { formatMoney } from '@/lib/format';
import { uploadDeliveryProof } from '@/services/shipmentData';
import { useAuthStore } from '@/stores/authStore';
import { submitCollectionHandover, submitCollectionRequest } from '@/services/collectionHandover';
import { supabase } from '@/lib/supabase';
import type { SettlementBreakdown } from '@/types';

interface EndOfRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string | null;
  settlement: SettlementBreakdown;
  totalCollected: number;
  totalDebt: number;
  currencyCode: string;
  onEndShift: () => void;
}

type SettlementStep =
  | 'choose'
  | 'transfer_proof'
  | 'fawry'
  | 'accounting_confirm'
  | 'settlement_request'
  | 'done';

export default function EndOfRouteModal({
  isOpen,
  onClose,
  planId,
  settlement,
  currencyCode,
  onEndShift,
}: EndOfRouteModalProps) {
  const [step, setStep] = useState<SettlementStep>('choose');
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream>(null);
  const user = useAuthStore((s) => s.user);

  const hasTransfer = settlement.transferAmount > 0;
  const hasCashDebt = settlement.cashDebt > 0;
  const hasInfoOnly = settlement.chequeAmount > 0 || settlement.creditAmount > 0;

  useEffect(() => {
    if (!isOpen || (step !== 'fawry' && step !== 'transfer_proof')) return;

    let active = true;
    const startCamera = async () => {
      setCameraError(null);
      setCameraReady(false);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        cameraStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraReady(true);
      } catch (error) {
        setCameraError(error instanceof Error ? error.message : 'تعذر فتح الكاميرا');
      }
    };

    void startCamera();

    return () => {
      active = false;
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    };
  }, [isOpen, step]);

  const reset = () => {
    setStep('choose');
    setReceiptPhoto(null);
    setReceiptFile(null);
    setNote('');
    setCameraError(null);
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return;

    if (receiptPhoto) URL.revokeObjectURL(receiptPhoto);
    const file = new File([blob], `receipt-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setReceiptFile(file);
    setReceiptPhoto(URL.createObjectURL(file));

    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (receiptPhoto) URL.revokeObjectURL(receiptPhoto);
    setReceiptFile(file);
    setReceiptPhoto(URL.createObjectURL(file));
  };

  const handleTransferProofSubmit = async () => {
    if (!receiptFile || !planId) return;
    setSubmitting(true);
    try {
      const proofPath = await uploadDeliveryProof(user?.id ?? '', receiptFile);
      await submitCollectionRequest({
        planId,
        collectedAmount: settlement.transferAmount,
        currencyCode,
        proofPhotoUrl: proofPath,
        driverNotes: note.trim() || 'إثبات تحويل بنكي',
      });
      setReceiptPhoto(null);
      setReceiptFile(null);
      setNote('');
      if (hasCashDebt) {
        setStep('choose');
      } else {
        setStep('done');
        setTimeout(() => {
          handleClose();
          onEndShift();
        }, 1500);
      }
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFawrySubmit = async () => {
    if (!receiptFile || !planId) return;
    setSubmitting(true);
    try {
      const proofPath = await uploadDeliveryProof(user?.id ?? '', receiptFile);
      await submitCollectionRequest({
        planId,
        collectedAmount: settlement.cashDebt,
        currencyCode,
        proofPhotoUrl: proofPath,
        driverNotes: note.trim() || 'تحويل فوري',
      });
      setStep('done');
      setTimeout(() => {
        handleClose();
        onEndShift();
      }, 1500);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccountingSubmit = async () => {
    if (!planId) return;
    setSubmitting(true);
    try {
      await submitCollectionHandover({
        planId,
        handedToManager: false,
        reason: 'توريد للحسابات - سيتم التوريد يدويًا',
        totalAmount: settlement.cashDebt,
        currencyCode,
      });
      setStep('done');
      setTimeout(() => {
        handleClose();
        onEndShift();
      }, 1500);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettlementRequest = async () => {
    if (!planId || settlement.cashDebt <= 0) return;
    setSubmitting(true);
    try {
      let proofUrl: string | null = null;
      if (receiptFile) {
        proofUrl = await uploadDeliveryProof(user?.id ?? '', receiptFile);
      }
      const { error } = await supabase.rpc('driver_submit_plan_settlement_request', {
        p_plan_id: planId,
        p_total_debt_amount: settlement.cashDebt,
        p_currency_code: currencyCode,
        p_driver_notes: note.trim() || null,
        p_proof_photo_url: proofUrl,
      });
      if (error) throw error;
      setStep('done');
      setTimeout(() => {
        handleClose();
        onEndShift();
      }, 1500);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'done') {
    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-8 text-center max-w-sm w-full"
            >
              <CheckCircle size={64} className="text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold text-app-text mt-4">تم التسجيل بنجاح</h3>
              <p className="text-sm text-app-text-secondary mt-2">
                سيتم مراجعة التحصيل من قسم الحسابات
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
          className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-6"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="bg-white rounded-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {step === 'choose' && (
              <>
                <div className="px-5 pt-5 pb-3 text-center">
                  <h3 className="text-lg font-bold text-app-text">نهاية خط السير</h3>
                  <p className="text-sm text-app-text-secondary mt-1">ملخص التحصيل حسب طريقة الدفع</p>

                  <div className="mt-3 bg-brand-25 rounded-xl p-4 space-y-3">
                    {hasTransfer && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowRightLeft size={16} className="text-blue-500" />
                          <div>
                            <p className="text-sm font-medium text-app-text">تحويل بنكي</p>
                            <p className="text-xs text-blue-500">إثبات الإيصال مطلوب</p>
                          </div>
                        </div>
                        <p className="text-base font-bold text-blue-600">
                          {formatMoney(settlement.transferAmount, currencyCode)}
                        </p>
                      </div>
                    )}

                    {hasCashDebt && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign size={16} className="text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-app-text">مديونية نقدية</p>
                            <p className="text-xs text-green-600">المبلغ المستحق للتوريد</p>
                          </div>
                        </div>
                        <p className="text-base font-bold text-green-600">
                          {formatMoney(settlement.cashDebt, currencyCode)}
                        </p>
                      </div>
                    )}

                    {settlement.chequeAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileCheck size={16} className="text-purple-500" />
                          <div>
                            <p className="text-sm font-medium text-app-text">شيكات</p>
                            <p className="text-xs text-purple-500">لا إجراء مطلوب</p>
                          </div>
                        </div>
                        <p className="text-base font-bold text-purple-600">
                          {formatMoney(settlement.chequeAmount, currencyCode)}
                        </p>
                      </div>
                    )}

                    {settlement.creditAmount > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard size={16} className="text-orange-500" />
                          <div>
                            <p className="text-sm font-medium text-app-text">آجل / أقساط</p>
                            <p className="text-xs text-orange-500">لا إجراء مطلوب</p>
                          </div>
                        </div>
                        <p className="text-base font-bold text-orange-600">
                          {formatMoney(settlement.creditAmount, currencyCode)}
                        </p>
                      </div>
                    )}

                    {!hasTransfer && !hasCashDebt && !hasInfoOnly && (
                      <div className="text-center py-2">
                        <p className="text-sm text-app-text-secondary">لا توجد مبالغ للتحصيل</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5 space-y-2.5">
                  {hasTransfer && (
                    <button
                      onClick={() => setStep('transfer_proof')}
                      className="w-full h-13 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                    >
                      <Camera size={18} />
                      إثبات التحويلات ({formatMoney(settlement.transferAmount, currencyCode)})
                    </button>
                  )}

                  {hasCashDebt && (
                    <>
                      <button
                        onClick={() => setStep('fawry')}
                        className="w-full h-13 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                      >
                        تحويل فوري ({formatMoney(settlement.cashDebt, currencyCode)})
                      </button>

                      <button
                        onClick={() => setStep('settlement_request')}
                        className="w-full h-13 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                      >
                        <AlertTriangle size={16} />
                        طلب تسويه المديونية
                      </button>

                      <button
                        onClick={() => setStep('accounting_confirm')}
                        className="w-full h-13 bg-gray-100 hover:bg-gray-200 text-app-text rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                      >
                        توريد للحسابات
                      </button>
                    </>
                  )}

                  {!hasTransfer && !hasCashDebt && (
                    <button
                      onClick={() => {
                        setStep('done');
                        setTimeout(() => {
                          handleClose();
                          onEndShift();
                        }, 1500);
                      }}
                      className="w-full h-13 bg-app-success text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
                    >
                      <CheckCircle size={18} />
                      إنهاء الوردية
                    </button>
                  )}
                </div>

                <button
                  onClick={handleClose}
                  className="w-full h-12 text-app-text-secondary font-medium border-t border-gray-100"
                >
                  إلغاء
                </button>
              </>
            )}

            {step === 'transfer_proof' && (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-app-text">إثبات التحويل البنكي</h3>
                  <button onClick={() => { setReceiptPhoto(null); setReceiptFile(null); setStep('choose'); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-sm text-gray-600">مبلغ التحويلات</p>
                    <p className="text-xl font-bold text-blue-700">{formatMoney(settlement.transferAmount, currencyCode)}</p>
                    <p className="text-xs text-blue-500 mt-1">قم بتصوير إيصال التحويل كإثبات</p>
                  </div>

                  {!receiptPhoto ? (
                    <div className="space-y-2">
                      <video
                        ref={videoRef}
                        className="w-full rounded-xl bg-black aspect-video object-cover"
                        playsInline
                        muted
                      />
                      {cameraError && (
                        <p className="text-xs text-red-500 text-center">{cameraError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleCapture}
                          disabled={!cameraReady}
                          className="flex-1 h-11 bg-app-dark text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50"
                        >
                          <Camera size={16} />
                          تصوير الإيصال
                        </button>
                        <label className="flex-1 h-11 bg-gray-100 text-app-text rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]">
                          <Upload size={16} />
                          رفع صورة
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={receiptPhoto} alt="الإيصال" className="w-full rounded-xl aspect-video object-cover" />
                      <button
                        onClick={() => { setReceiptPhoto(null); setReceiptFile(null); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-app-text-secondary">ملاحظة (اختياري)</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="أضف ملاحظة..."
                      className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent mt-1"
                    />
                  </div>

                  {cameraError && (
                    <p className="text-sm text-red-500 text-center">{cameraError}</p>
                  )}
                </div>

                <div className="px-4 pb-4">
                  <button
                    onClick={handleTransferProofSubmit}
                    disabled={!receiptFile || submitting}
                    className="w-full h-12 bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'تأكيد وإرسال الإثبات'
                    )}
                  </button>
                </div>
              </>
            )}

            {step === 'fawry' && (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-app-text">تحويل فوري</h3>
                  <button onClick={() => { setReceiptPhoto(null); setReceiptFile(null); setStep('choose'); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="bg-yellow-50 rounded-xl p-3 text-center">
                    <p className="text-sm text-gray-600">المبلغ</p>
                    <p className="text-xl font-bold text-gray-900">{formatMoney(settlement.cashDebt, currencyCode)}</p>
                  </div>

                  {!receiptPhoto ? (
                    <div className="space-y-2">
                      <video
                        ref={videoRef}
                        className="w-full rounded-xl bg-black aspect-video object-cover"
                        playsInline
                        muted
                      />
                      {cameraError && (
                        <p className="text-xs text-red-500 text-center">{cameraError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleCapture}
                          disabled={!cameraReady}
                          className="flex-1 h-11 bg-app-dark text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50"
                        >
                          <Camera size={16} />
                          تصوير الإيصال
                        </button>
                        <label className="flex-1 h-11 bg-gray-100 text-app-text rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]">
                          <Upload size={16} />
                          رفع صورة
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={receiptPhoto} alt="الإيصال" className="w-full rounded-xl aspect-video object-cover" />
                      <button
                        onClick={() => { setReceiptPhoto(null); setReceiptFile(null); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-app-text-secondary">ملاحظة (اختياري)</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="أضف ملاحظة..."
                      className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent mt-1"
                    />
                  </div>

                  {cameraError && (
                    <p className="text-sm text-red-500 text-center">{cameraError}</p>
                  )}
                </div>

                <div className="px-4 pb-4">
                  <button
                    onClick={handleFawrySubmit}
                    disabled={!receiptFile || submitting}
                    className="w-full h-12 bg-yellow-400 text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'تأكيد التحويل'
                    )}
                  </button>
                </div>
              </>
            )}

            {step === 'accounting_confirm' && (
              <>
                <div className="px-5 pt-5 pb-3 text-center">
                  <h3 className="text-lg font-bold text-app-text">توريد للحسابات</h3>
                  <p className="text-sm text-app-text-secondary mt-2">
                    سيتم تسجيل مديونية بقيمة{' '}
                    <span className="font-bold text-app-dark">{formatMoney(settlement.cashDebt, currencyCode)}</span>{' '}
                    على الحسابات للتوريد يدويًا.
                  </p>
                </div>

                <div className="px-5 pb-5 space-y-3">
                  <button
                    onClick={handleAccountingSubmit}
                    disabled={submitting}
                    className="w-full h-12 bg-app-dark text-white rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 transition-all"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'تأكيد التوريد'
                    )}
                  </button>
                  <button
                    onClick={() => setStep('choose')}
                    className="w-full h-12 text-app-text-secondary font-medium"
                  >
                    رجوع
                  </button>
                </div>
              </>
            )}

            {step === 'settlement_request' && (
              <>
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="text-base font-semibold text-app-text">طلب تسويه المديونية</h3>
                  <button onClick={() => { setReceiptPhoto(null); setReceiptFile(null); setStep('choose'); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <X size={16} className="text-gray-500" />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  <div className="bg-red-50 rounded-xl p-4 text-center">
                    <AlertTriangle size={32} className="text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-red-600">المديونية المتراكمة</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">
                      {formatMoney(settlement.cashDebt, currencyCode)}
                    </p>
                    <p className="text-xs text-red-500 mt-2">
                      سيتم إرسال طلب تسويه للمدير للمراجعة والاعتماد
                    </p>
                  </div>

                  {!receiptPhoto ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-app-text-secondary text-center">
                        صورة إثبات تسليم المبلغ مطلوبة
                      </p>
                      <video
                        ref={videoRef}
                        className="w-full rounded-xl bg-black aspect-video object-cover"
                        playsInline
                        muted
                      />
                      {cameraError && (
                        <p className="text-xs text-red-500 text-center">{cameraError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={handleCapture}
                          disabled={!cameraReady}
                          className="flex-1 h-11 bg-app-dark text-white rounded-xl font-medium flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50"
                        >
                          <Camera size={16} />
                          تصوير الإيصال
                        </button>
                        <label className="flex-1 h-11 bg-gray-100 text-app-text rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]">
                          <Upload size={16} />
                          رفع صورة
                          <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <img src={receiptPhoto} alt="إثبات التسليم" className="w-full rounded-xl aspect-video object-cover" />
                      <button
                        onClick={() => { setReceiptPhoto(null); setReceiptFile(null); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-app-text-secondary">ملاحظة (اختياري)</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="أضف ملاحظة للطلب..."
                      className="w-full h-10 bg-white border border-gray-200 rounded-lg px-3 text-sm text-app-text placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-app-accent mt-1"
                    />
                  </div>

                  {cameraError && (
                    <p className="text-sm text-red-500 text-center">{cameraError}</p>
                  )}
                </div>

                <div className="px-4 pb-4 space-y-2">
                  <button
                    onClick={handleSettlementRequest}
                    disabled={submitting || settlement.cashDebt <= 0 || !receiptFile}
                    className="w-full h-12 bg-red-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <AlertTriangle size={16} />
                        إرسال طلب التسويه
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setStep('choose')}
                    className="w-full h-12 text-app-text-secondary font-medium"
                  >
                    رجوع
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
