import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/LanguageProvider";
import { fmtDate } from "@/lib/locale";
import { fmtNum } from "@/components/corp-ui";
import {
  ArrowLeft, Camera, Loader2, Check, RotateCcw, AlertTriangle,
  CheckCircle2, Clock, Gauge, FileText,
} from "lucide-react";

type Translator = (key: string) => string;

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  status: string;
  assignedPersonnelId?: string | null;
  assignedPersonnel?: { id: string; firstName: string; lastName: string } | null;
}

interface LastControl {
  id: string;
  performedAt: string | null;
  mileageKm: number;
}

interface ServerTimeWindow {
  canPerform: boolean;
  nowUtcMs: number;
  nowGstIso: string;
  windowStartsAtUtcMs: number;
  windowEndsAtUtcMs: number;
  weekKey: string;
}

interface CapturedPhoto {
  step: number;
  label: string;
  photoUrl: string;
  takenAt: string;
  previewUrl: string;
}

const STEPS = [
  { n: 1, labelKey: 'pcStep1Label', hintKey: 'pcStep1Hint' },
  { n: 2, labelKey: 'pcStep2Label', hintKey: 'pcStep2Hint' },
  { n: 3, labelKey: 'pcStep3Label', hintKey: 'pcStep3Hint' },
  { n: 4, labelKey: 'pcStep4Label', hintKey: 'pcStep4Hint' },
  { n: 5, labelKey: 'pcStep5Label', hintKey: 'pcStep5Hint' },
  { n: 6, labelKey: 'pcStep6Label', hintKey: 'pcStep6Hint' },
  { n: 7, labelKey: 'pcStep7Label', hintKey: 'pcStep7Hint' },
  { n: 8, labelKey: 'pcStep8Label', hintKey: 'pcStep8Hint' },
];

function pad(n: number) { return String(n).padStart(2, '0'); }

// gstIso поступает с сервера как ISO-строка, но представляющая GST как если бы UTC.
function formatStampForWatermark(gstIso: string) {
  const d = new Date(gstIso);
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} GST`;
}

function formatDateRu(ms: number) {
  const d = new Date(ms);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function watermarkImage(
  file: File,
  gstIso: string,
  plate: string,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        URL.revokeObjectURL(url);
        const maxW = 1600;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);

        const fontSize = Math.max(18, Math.round(w * 0.024));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const padding = Math.round(fontSize * 0.55);
        const t1 = formatStampForWatermark(gstIso);
        const t2 = plate;
        const t1w = ctx.measureText(t1).width;
        const t2w = ctx.measureText(t2).width;
        const boxW = Math.max(t1w, t2w) + padding * 2;
        const lineGap = Math.round(fontSize * 0.25);
        const boxH = fontSize * 2 + lineGap + padding * 2;
        const x = w - boxW - padding;
        const y = h - boxH - padding;

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, boxW, boxH);
        ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'top';
        ctx.fillText(t1, x + padding, y + padding);
        ctx.fillText(t2, x + padding, y + padding + fontSize + lineGap);

        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('toBlob failed'))),
          'image/jpeg',
          0.85,
        );
      } catch (e) {
        reject(e as Error);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image load failed'));
    };
    img.src = url;
  });
}

async function uploadBlob(blob: Blob, t: Translator): Promise<string> {
  const r = await apiRequest('/api/objects/upload', { method: 'POST' });
  const data = await r.json();
  if (!data?.uploadURL) throw new Error(t('pcUploadUrlFailed'));
  const put = await fetch(data.uploadURL, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  });
  if (!put.ok) throw new Error(t('pcUploadFailedTpl').replace('{status}', String(put.status)));
  const ack = await apiRequest('/api/objects/acl', {
    method: 'POST',
    body: JSON.stringify({ objectUrl: data.uploadURL, visibility: 'public' }),
  });
  const ackData = await ack.json();
  if (!ackData?.objectPath) throw new Error(t('pcServerNoPath'));
  return ackData.objectPath as string;
}

export default function PhotoControl() {
  const [, params] = useRoute<{ id: string }>('/vehicles/:id/photo-control');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const qc = useQueryClient();
  const id = params?.id || '';

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stepIdx, setStepIdx] = useState(0); // 0..7 photos, 8 = mileage, 9 = success
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<{ photoUrl: string; takenAt: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [mileage, setMileage] = useState('');
  const [doneInfo, setDoneInfo] = useState<{ mileageKm: number; performedAtIso: string; pdfUrl?: string | null } | null>(null);

  const { data: vehicle, isLoading: vehicleLoading } = useQuery<Vehicle>({
    queryKey: ['/api/vehicles', id],
    queryFn: async () => {
      const r = await fetch(`/api/vehicles/${id}`, { credentials: 'include' });
      if (!r.ok) throw new Error('not found');
      return r.json();
    },
    enabled: !!id,
  });

  const { data: lastControl } = useQuery<LastControl | null>({
    queryKey: ['/api/vehicles', id, 'photo-controls', 'last'],
    queryFn: async () => {
      const r = await fetch(`/api/vehicles/${id}/photo-controls`, { credentials: 'include' });
      if (!r.ok) return null;
      const list = (await r.json()) as LastControl[];
      return list[0] || null;
    },
    enabled: !!id,
  });

  const { data: timeWin, refetch: refetchTime } = useQuery<ServerTimeWindow>({
    queryKey: ['/api/vehicles/server-time-window'],
    queryFn: async () => {
      const r = await fetch('/api/vehicles/server-time-window', { credentials: 'include' });
      if (!r.ok) throw new Error('time window failed');
      return r.json();
    },
    refetchInterval: 60_000,
  });

  // Cleanup any pending preview blob URLs on unmount
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = user?.role === 'admin';
  // Закрепление теперь идёт из «Персонала», поэтому фотоконтроль доступен любому
  // с ролью master/director/admin (имя выполняющего сохраняется в performedByUserId).
  const canPerform = !!timeWin?.canPerform || isAdmin;
  const blockReason = useMemo(() => {
    if (!vehicle) return null;
    if (vehicle.status === 'archived') return t('pcVehicleArchivedMsg');
    if (!canPerform) {
      if (timeWin?.windowStartsAtUtcMs) {
        return t('pcWindowAvailableTpl').replace('{time}', formatDateRu(timeWin.windowStartsAtUtcMs));
      }
      return t('pcWindowClosedMsg');
    }
    return null;
  }, [vehicle, canPerform, timeWin, t]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const km = parseInt(mileage.replace(/\D/g, ''), 10);
      if (!Number.isFinite(km) || km < 0) {
        throw new Error(t('pcEnterValidMileage'));
      }
      if (lastControl && km < lastControl.mileageKm) {
        throw new Error(t('pcMileageMustBeAtLeastTpl').replace('{km}', `${fmtNum(lastControl.mileageKm)} ${t('kmUnit')}`));
      }
      if (photos.length !== 8) {
        throw new Error(t('pcStepsNotComplete'));
      }
      const payload = {
        mileageKm: km,
        photos: photos
          .slice()
          .sort((a, b) => a.step - b.step)
          .map((p) => ({
            step: p.step,
            label: p.label,
            photoUrl: p.photoUrl,
            takenAt: p.takenAt,
          })),
      };
      const r = await apiRequest(`/api/vehicles/${id}/photo-control`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return r.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['/api/vehicles', id] });
      qc.invalidateQueries({ queryKey: ['/api/vehicles', id, 'photo-controls'] });
      qc.invalidateQueries({ queryKey: ['/api/vehicles'] });
      setDoneInfo({
        mileageKm: data?.mileageKm ?? parseInt(mileage, 10),
        performedAtIso: data?.performedAt || new Date().toISOString(),
        pdfUrl: data?.pdfUrl || null,
      });
      setStepIdx(9);
    },
    onError: (e: any) => {
      toast({ title: t('errorToastTitle'), description: e?.message || t('pcSaveFailed'), variant: 'destructive' });
    },
  });

  const onPickFile = () => {
    if (processing || pendingPreview) return;
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow reselect
    if (!file || !vehicle) return;
    if (!canPerform) {
      toast({ title: t('pcWindowClosedTitle'), description: blockReason || t('pcUnavailable'), variant: 'destructive' });
      return;
    }
    setProcessing(true);
    try {
      // Получаем свежее серверное время (GST iso) — единый источник
      const tr = await refetchTime();
      const fresh = tr.data;
      if (!fresh) throw new Error(t('pcServerTimeFailed'));
      if (!fresh.canPerform && !isAdmin) {
        throw new Error(t('pcWindowClosedShort'));
      }
      const blob = await watermarkImage(file, fresh.nowGstIso, vehicle.plateNumber);
      const previewUrl = URL.createObjectURL(blob);
      const photoUrl = await uploadBlob(blob, t);
      // Сохраняем как pending — даём возможность переснять или подтвердить
      setPendingPreview(previewUrl);
      setPendingPhoto({ photoUrl, takenAt: fresh.nowGstIso });
    } catch (err: any) {
      toast({
        title: t('pcPhotoProcessFailed'),
        description: err?.message || String(err),
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const confirmPending = () => {
    if (!pendingPhoto || !pendingPreview) return;
    const stepDef = STEPS[stepIdx];
    setPhotos((prev) => [
      ...prev,
      {
        step: stepDef.n,
        label: t(stepDef.labelKey),
        photoUrl: pendingPhoto.photoUrl,
        takenAt: pendingPhoto.takenAt,
        previewUrl: pendingPreview,
      },
    ]);
    setPendingPhoto(null);
    setPendingPreview(null);
    setStepIdx((i) => i + 1);
  };

  const retakePending = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingPreview(null);
    setPendingPhoto(null);
  };

  const onAbort = () => {
    if (photos.length === 0 && !pendingPreview) {
      setLocation(`/vehicles/${id}`);
      return;
    }
    if (window.confirm(t('pcAbortConfirm'))) {
      photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
      setLocation(`/vehicles/${id}`);
    }
  };

  // ---- RENDER --------------------------------------------------------------

  if (vehicleLoading || !vehicle) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--corp-bg)' }}>
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  // Success screen
  if (stepIdx === 9 && doneInfo) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
        <div className="max-w-md mx-auto px-4 py-10 text-center">
          <div
            className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4"
            style={{ background: 'var(--corp-accent-soft, #DCFCE7)', color: '#16a34a' }}
          >
            <CheckCircle2 size={32} />
          </div>
          <h1 className="text-[18px] font-bold mb-2" style={{ color: 'var(--corp-ink)' }}>
            {t("pcDoneTitle")}
          </h1>
          <p className="text-[13px] mb-4" style={{ color: 'var(--corp-muted)' }}>
            {vehicle.brand} {vehicle.model} · {vehicle.plateNumber}
          </p>
          <div
            className="rounded-lg p-4 mb-4 text-left"
            style={{ background: 'var(--corp-surface)', border: '1px solid var(--corp-line)' }}
          >
            <div className="flex justify-between py-1">
              <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>{t('dateLabel')}</span>
              <span className="text-[13px] font-semibold" style={{ color: 'var(--corp-ink)' }}>
                {formatDateRu(new Date(doneInfo.performedAtIso).getTime())}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>{t('pcMileageWord')}</span>
              <span className="text-[13px] font-semibold" style={{ color: 'var(--corp-ink)' }}>
                {fmtNum(doneInfo.mileageKm)} {t('kmUnit')}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>{t('pcPhotosWord')}</span>
              <span className="text-[13px] font-semibold" style={{ color: 'var(--corp-ink)' }}>
                8 / 8
              </span>
            </div>
          </div>
          {doneInfo.pdfUrl ? (
            <a
              href={doneInfo.pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full h-10 mb-2 rounded-md flex items-center justify-center text-[13px] font-semibold"
              style={{
                background: 'var(--corp-accent-soft, #EEF1FF)',
                color: 'var(--corp-accent)',
                border: '1px solid var(--corp-line)',
              }}
              data-testid="link-pdf"
            >
              <FileText size={14} className="mr-2" />
              {t("pcOpenPdfReport")}
            </a>
          ) : (
            <p className="text-[11px] mb-2" style={{ color: 'var(--corp-muted)' }}>
              {t("pcPdfNotReady")}
            </p>
          )}
          <Button
            className="w-full h-10"
            data-testid="button-back-to-vehicle"
            onClick={() => setLocation(`/vehicles/${id}`)}
          >
            {t("pcBackToVehicle")}
          </Button>
        </div>
      </div>
    );
  }

  // Block screen (no rights / window closed / archived)
  if (blockReason && stepIdx === 0 && photos.length === 0 && !pendingPreview) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
        <header
          className="sticky top-0 z-40"
          style={{ background: 'var(--corp-surface)', borderBottom: '1px solid var(--corp-line)' }}
        >
          <div className="px-3 sm:px-4 h-14 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLocation(`/vehicles/${id}`)}
              data-testid="button-back"
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--corp-ink-2)' }}
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>{t('photoControlTitle')}</h2>
          </div>
        </header>
        <div className="max-w-md mx-auto px-4 py-10 text-center">
          <div
            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-3"
            style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-muted)' }}
          >
            <Clock size={26} />
          </div>
          <h1 className="text-[16px] font-bold mb-2" style={{ color: 'var(--corp-ink)' }}>
            {t("pcUnavailableNow")}
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>{blockReason}</p>
        </div>
      </div>
    );
  }

  const isMileageStep = stepIdx === 8;
  const currentStep = !isMileageStep ? STEPS[stepIdx] : null;
  const progressPct = ((isMileageStep ? 8 : stepIdx) / 8) * 100;

  return (
    <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--corp-surface)', borderBottom: '1px solid var(--corp-line)' }}
      >
        <div className="px-3 sm:px-4 h-14 flex items-center gap-2">
          <button
            type="button"
            onClick={onAbort}
            data-testid="button-abort"
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--corp-ink-2)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-bold truncate" style={{ color: 'var(--corp-ink)' }}>
              {t("pcTitle")}
            </h2>
            <p className="text-[11px] truncate" style={{ color: 'var(--corp-muted)' }}>
              {vehicle.brand} {vehicle.model} · {vehicle.plateNumber}
            </p>
          </div>
          <div className="text-[11px] font-semibold" style={{ color: 'var(--corp-muted)' }} data-testid="text-progress">
            {isMileageStep ? t('pcMileageWord') : `${stepIdx + 1} / 8`}
          </div>
        </div>
        <div className="h-1 w-full" style={{ background: 'var(--corp-surface-2)' }}>
          <div
            className="h-1 transition-all"
            style={{ width: `${progressPct}%`, background: 'var(--corp-accent)' }}
          />
        </div>
      </header>

      <div className="max-w-md mx-auto px-3 sm:px-4 py-3 pb-24 space-y-3">
        {!isMileageStep && currentStep && (
          <>
            <div
              className="p-3"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
              }}
            >
              <h3 className="text-[15px] font-bold mb-1" style={{ color: 'var(--corp-ink)' }}>
                {t('pcStepWord')} {currentStep.n}. {t(currentStep.labelKey)}
              </h3>
              <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>{t(currentStep.hintKey)}</p>
            </div>

            {/* Pending preview / capture area */}
            <div
              className="overflow-hidden"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
              }}
            >
              {pendingPreview ? (
                <>
                  <img
                    src={pendingPreview}
                    alt="preview"
                    className="w-full max-h-[60vh] object-contain"
                    style={{ background: '#000' }}
                    data-testid="img-preview"
                  />
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="h-10"
                      onClick={retakePending}
                      data-testid="button-retake"
                    >
                      <RotateCcw size={14} className="mr-2" /> {t("pcRetake")}
                    </Button>
                    <Button
                      className="h-10"
                      onClick={confirmPending}
                      data-testid="button-confirm-photo"
                    >
                      <Check size={14} className="mr-2" /> {t("confirm")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center">
                  <div
                    className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3"
                    style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-accent)' }}
                  >
                    <Camera size={28} />
                  </div>
                  <p className="text-[12px] mb-3" style={{ color: 'var(--corp-muted)' }}>
                    {t("pcWatermarkHint")}
                  </p>
                  <Button
                    className="h-10 px-6"
                    onClick={onPickFile}
                    disabled={processing}
                    data-testid="button-take-photo"
                  >
                    {processing ? (
                      <><Loader2 size={14} className="animate-spin mr-2" /> {t("pcProcessing")}</>
                    ) : (
                      <><Camera size={14} className="mr-2" /> {t("pcTakePhoto")}</>
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={onFileChange}
                    data-testid="input-photo"
                  />
                </div>
              )}
            </div>

            {/* Captured strip */}
            {photos.length > 0 && (
              <div
                className="p-2 flex gap-2 overflow-x-auto"
                style={{
                  background: 'var(--corp-surface)',
                  border: '1px solid var(--corp-line)',
                  borderRadius: 'var(--corp-r-lg)',
                }}
              >
                {photos.map((p) => (
                  <div key={p.step} className="flex-none text-center" data-testid={`thumb-step-${p.step}`}>
                    <img
                      src={p.previewUrl}
                      alt={p.label}
                      className="w-14 h-14 object-cover rounded"
                      style={{ border: '1px solid var(--corp-line)' }}
                    />
                    <span className="text-[10px] block mt-0.5" style={{ color: 'var(--corp-muted)' }}>
                      {p.step}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {isMileageStep && (
          <>
            <div
              className="p-3"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Gauge size={16} style={{ color: 'var(--corp-accent)' }} />
                <h3 className="text-[15px] font-bold" style={{ color: 'var(--corp-ink)' }}>
                  {t("pcCurrentMileage")}
                </h3>
              </div>
              <p className="text-[12px] mb-3" style={{ color: 'var(--corp-muted)' }}>
                {t("pcEnterOdometerHint")}
              </p>
              {lastControl && (
                <div
                  className="text-[11px] rounded p-2 mb-3 flex items-start gap-2"
                  style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)' }}
                >
                  <AlertTriangle size={13} style={{ color: '#d97706' }} className="mt-0.5 flex-none" />
                  <span>
                    {t('pcPrevMileage')}: <b>{fmtNum(lastControl.mileageKm)} {t('kmUnit')}</b>.
                    {t("pcMustBeGreaterEq")}
                  </span>
                </div>
              )}
              <Label htmlFor="pc-mileage" className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
                {t("pcMileageKmLabel")}
              </Label>
              <Input
                id="pc-mileage"
                inputMode="numeric"
                value={mileage}
                onChange={(e) => setMileage(e.target.value.replace(/[^0-9]/g, '').slice(0, 7))}
                placeholder="125000"
                className="h-10 text-[15px] mt-1 font-mono"
                data-testid="input-mileage"
              />
            </div>

            <Button
              className="w-full h-11"
              disabled={!mileage || submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
              data-testid="button-submit-control"
            >
              {submitMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin mr-2" /> {t("savingDots")}</>
              ) : (
                t('pcCompleteBtn')
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
