import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Car, Edit2, Archive, RotateCcw, Camera, BarChart3, ClipboardList, FileText, ImageIcon, Pencil, History, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtDateRu } from "@/components/corp-ui";
import { VehicleForm } from "@/components/VehicleForm";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plateNumber: string;
  vin?: string | null;
  color?: string | null;
  photoUrl?: string | null;
  status: string;
  assignedPersonnelId?: string | null;
  assignedPersonnel?: {
    id: string;
    firstName: string;
    lastName: string;
    specialization?: string | null;
    photoUrl?: string | null;
  } | null;
  createdAt?: string | null;
}

interface PhotoControl {
  id: string;
  performedAt: string | null;
  weekKey: string;
  mileageKm: number;
  pdfUrl?: string | null;
  performedBy?: { id: string; name: string } | null;
  photos: { id: string; step: number; label: string; photoUrl: string }[];
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>{label}</span>
      <span className="text-[13px] font-semibold text-right" style={{ color: 'var(--corp-ink)' }}>
        {value || '—'}
      </span>
    </div>
  );
}

export default function VehicleDetail() {
  const [, params] = useRoute<{ id: string }>('/vehicles/:id');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);

  const id = params?.id || '';
  const isDirector = user?.role === 'admin' || user?.role === 'director';
  const isMaster = user?.role === 'master';

  const { data: vehicle, isLoading } = useQuery<Vehicle>({
    queryKey: ['/api/vehicles', id],
    queryFn: async () => {
      const r = await fetch(`/api/vehicles/${id}`, { credentials: 'include' });
      if (!r.ok) throw new Error('not found');
      return r.json();
    },
    enabled: !!id,
  });

  const { data: controls = [] } = useQuery<PhotoControl[]>({
    queryKey: ['/api/vehicles', id, 'photo-controls'],
    queryFn: async () => {
      const r = await fetch(`/api/vehicles/${id}/photo-controls`, { credentials: 'include' });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!id,
  });

  interface MileageStats {
    week: number;
    month: number;
    year: number;
    all: number;
    controlsCount: number;
    lastMileage: number | null;
    lastDate: string | null;
  }
  const { data: stats } = useQuery<MileageStats>({
    queryKey: ['/api/vehicles', id, 'mileage-stats'],
    queryFn: async () => {
      const r = await fetch(`/api/vehicles/${id}/mileage-stats`, { credentials: 'include' });
      if (!r.ok) throw new Error('failed');
      return r.json();
    },
    enabled: !!id,
  });

  // Журнал аудита (только для директора/админа)
  interface AuditEntry {
    id: string;
    action: string;
    details: any;
    createdAt: string | null;
    user?: { id: string; name: string | null; username: string | null } | null;
  }
  const { data: auditLog = [], isLoading: auditLoading } = useQuery<AuditEntry[]>({
    queryKey: ['/api/vehicles', id, 'audit-log'],
    queryFn: async () => {
      const r = await fetch(`/api/vehicles/${id}/audit-log`, { credentials: 'include' });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!id && (user?.role === 'admin' || user?.role === 'director'),
  });

  // Корректировка пробега (директор/админ)
  const [mileageEdit, setMileageEdit] = useState<{
    controlId: string;
    currentMileage: number;
    newMileage: string;
    reason: string;
  } | null>(null);
  const correctMileageMutation = useMutation({
    mutationFn: async (vars: { controlId: string; mileageKm: number; reason: string }) => {
      const r = await apiRequest(
        `/api/vehicles/${id}/photo-controls/${vars.controlId}/mileage`,
        {
          method: 'PATCH',
          body: JSON.stringify({ mileageKm: vars.mileageKm, reason: vars.reason }),
        },
      );
      return r.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['/api/vehicles', id, 'photo-controls'] });
      qc.invalidateQueries({ queryKey: ['/api/vehicles', id, 'mileage-stats'] });
      qc.invalidateQueries({ queryKey: ['/api/vehicles', id, 'audit-log'] });
      qc.invalidateQueries({ queryKey: ['/api/vehicles'] });
      setMileageEdit(null);
      toast({ title: 'Пробег обновлён' });
    },
    onError: (e: any) => {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось обновить', variant: 'destructive' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (newStatus: 'active' | 'archived') => {
      const r = await apiRequest(`/api/vehicles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      return r.json();
    },
    onSuccess: (_d, newStatus) => {
      qc.invalidateQueries({ queryKey: ['/api/vehicles'] });
      qc.invalidateQueries({ queryKey: ['/api/vehicles', id] });
      qc.invalidateQueries({ queryKey: ['/api/vehicles', id, 'audit-log'] });
      toast({
        title: newStatus === 'archived' ? 'В архиве' : 'Восстановлен',
      });
    },
    onError: (e: any) => {
      toast({ title: 'Ошибка', description: e?.message, variant: 'destructive' });
    },
  });

  const isArchived = vehicle?.status === 'archived';
  const canManage = isDirector;
  const canPhotoControl = (isMaster || isDirector || user?.role === 'admin') && !isArchived;

  return (
    <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--corp-surface)', borderBottom: '1px solid var(--corp-line)' }}
      >
        <div className="px-3 sm:px-4 h-14 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLocation('/vehicles')}
            data-testid="button-back"
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ color: 'var(--corp-ink-2)' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h2
              className="text-[14px] sm:text-[15px] font-bold truncate"
              style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
            >
              {vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Автомобиль'}
            </h2>
            {vehicle && (
              <p className="text-[11px] truncate" style={{ color: 'var(--corp-muted)' }}>
                {vehicle.plateNumber}{isArchived ? ' · в архиве' : ''}
              </p>
            )}
          </div>
          {canManage && vehicle && (
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              data-testid="button-edit-vehicle"
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ color: 'var(--corp-ink-2)' }}
            >
              <Edit2 size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="px-3 sm:px-4 py-3 space-y-3 max-w-2xl mx-auto pb-24">
        {isLoading ? (
          <div className="space-y-2">
            <div
              className="h-44 animate-pulse"
              style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r-lg)' }}
            />
            <div
              className="h-32 animate-pulse"
              style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r-lg)' }}
            />
          </div>
        ) : !vehicle ? (
          <div className="text-center py-10 text-[13px]" style={{ color: 'var(--corp-muted)' }}>
            Автомобиль не найден
          </div>
        ) : (
          <>
            {/* Photo / hero */}
            <div
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
                overflow: 'hidden',
              }}
            >
              {vehicle.photoUrl ? (
                <img
                  src={vehicle.photoUrl}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="w-full h-44 object-cover"
                />
              ) : (
                <div
                  className="w-full h-44 flex items-center justify-center"
                  style={{ background: 'var(--corp-accent-soft, #EEF1FF)', color: 'var(--corp-accent)' }}
                >
                  <Car size={42} />
                </div>
              )}
              <div className="p-3">
                <InfoRow label="Госномер" value={<span className="font-mono">{vehicle.plateNumber}</span>} />
                <InfoRow label="Год выпуска" value={vehicle.year || '—'} />
                <InfoRow label="VIN" value={vehicle.vin ? <span className="font-mono text-[11px]">{vehicle.vin}</span> : '—'} />
                <InfoRow label="Цвет" value={vehicle.color || '—'} />
                <InfoRow
                  label="Закреплён"
                  value={
                    vehicle.assignedPersonnel
                      ? `${vehicle.assignedPersonnel.lastName} ${vehicle.assignedPersonnel.firstName}` +
                        (vehicle.assignedPersonnel.specialization
                          ? ` · ${vehicle.assignedPersonnel.specialization}`
                          : '')
                      : 'Не назначен'
                  }
                />
                <InfoRow label="Статус" value={isArchived ? 'Архив' : 'Активен'} />
                {vehicle.createdAt && (
                  <InfoRow label="Добавлен" value={fmtDateRu(vehicle.createdAt)} />
                )}
              </div>
            </div>

            {/* Photo control CTA / placeholder */}
            <div
              className="p-3"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList size={16} style={{ color: 'var(--corp-accent)' }} />
                <h3 className="text-[13px] font-bold" style={{ color: 'var(--corp-ink)' }}>
                  Фотоконтроль
                </h3>
              </div>
              {canPhotoControl ? (
                <Button
                  className="w-full h-10"
                  data-testid="button-start-photo-control"
                  onClick={() => setLocation(`/vehicles/${id}/photo-control`)}
                >
                  <Camera size={14} className="mr-2" /> Начать фотоконтроль
                </Button>
              ) : (
                <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                  {isArchived
                    ? 'Автомобиль в архиве — фотоконтроль недоступен.'
                    : isMaster
                      ? 'Этот автомобиль не закреплён за вами.'
                      : 'Фотоконтроль выполняет закреплённый сотрудник по воскресеньям с 08:00 до 20:00 (GST).'}
                </p>
              )}
            </div>

            {/* Stats */}
            <div
              className="p-3"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
              }}
              data-testid="card-mileage-stats"
            >
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 size={16} style={{ color: 'var(--corp-accent)' }} />
                <h3 className="text-[13px] font-bold" style={{ color: 'var(--corp-ink)' }}>
                  Статистика пробега
                </h3>
              </div>
              {!stats || stats.controlsCount === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                  Появится после первого фотоконтроля.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'За неделю', value: stats.week },
                      { label: 'За месяц', value: stats.month },
                      { label: 'За год', value: stats.year },
                      { label: 'Всего', value: stats.all },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="p-2 rounded"
                        style={{ background: 'var(--corp-surface-2)' }}
                        data-testid={`stat-${s.label}`}
                      >
                        <div className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                          {s.label}
                        </div>
                        <div className="text-[15px] font-bold" style={{ color: 'var(--corp-ink)' }}>
                          {s.value.toLocaleString('ru-RU')} <span className="text-[11px] font-normal" style={{ color: 'var(--corp-muted)' }}>км</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {stats.lastMileage !== null && (
                    <div className="mt-3 pt-2 flex items-center justify-between text-[11px]"
                      style={{ borderTop: '1px solid var(--corp-line)', color: 'var(--corp-muted)' }}>
                      <span>Последняя запись: {fmtDateRu(stats.lastDate || undefined)}</span>
                      <span className="font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
                        {stats.lastMileage.toLocaleString('ru-RU')} км
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* History */}
            <div
              className="p-3"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
              }}
            >
              <h3 className="text-[13px] font-bold mb-2" style={{ color: 'var(--corp-ink)' }}>
                История фотоконтролей
              </h3>
              {controls.length === 0 ? (
                <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                  Записей пока нет.
                </p>
              ) : (
                <div className="space-y-2">
                  {controls.map((c, idx) => {
                    // controls приходят desc по дате; предыдущая запись = следующая в массиве.
                    const prev = controls[idx + 1];
                    const delta = prev ? Math.max(0, c.mileageKm - prev.mileageKm) : null;
                    const firstPhoto = c.photos && c.photos.length > 0 ? c.photos[0] : null;
                    return (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 p-2 rounded"
                        style={{ background: 'var(--corp-surface-2)' }}
                        data-testid={`row-control-${c.id}`}
                      >
                        <div
                          className="w-12 h-12 rounded overflow-hidden flex-shrink-0 flex items-center justify-center"
                          style={{ background: 'var(--corp-surface)', border: '1px solid var(--corp-line)' }}
                        >
                          {firstPhoto ? (
                            <img
                              src={firstPhoto.photoUrl}
                              alt={firstPhoto.label}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const img = e.currentTarget;
                                img.style.display = 'none';
                                const sib = img.nextElementSibling as HTMLElement | null;
                                if (sib) sib.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <span
                            className="w-full h-full items-center justify-center"
                            style={{ display: firstPhoto ? 'none' : 'flex', color: 'var(--corp-muted)' }}
                          >
                            <ImageIcon size={18} />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>
                            {fmtDateRu(c.performedAt || undefined)}
                          </p>
                          <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                            <span className="font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
                              {c.mileageKm.toLocaleString('ru-RU')} км
                            </span>
                            {delta !== null && (
                              <span style={{ color: 'var(--corp-accent)' }}>
                                {' '}+{delta.toLocaleString('ru-RU')}
                              </span>
                            )}
                            {' · '}{c.performedBy?.name || '—'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {c.pdfUrl ? (
                            <a
                              href={c.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 px-2 py-1 rounded text-[12px] font-semibold"
                              style={{
                                background: 'var(--corp-accent-soft, #EEF1FF)',
                                color: 'var(--corp-accent)',
                              }}
                              data-testid={`link-pdf-${c.id}`}
                            >
                              <FileText size={12} /> PDF
                            </a>
                          ) : (
                            <span className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                              нет PDF
                            </span>
                          )}
                          {canManage && (
                            <button
                              type="button"
                              onClick={() =>
                                setMileageEdit({
                                  controlId: c.id,
                                  currentMileage: c.mileageKm,
                                  newMileage: String(c.mileageKm),
                                  reason: '',
                                })
                              }
                              data-testid={`button-correct-mileage-${c.id}`}
                              className="flex items-center gap-1 px-2 py-1 rounded text-[11px]"
                              style={{
                                color: 'var(--corp-muted)',
                                border: '1px solid var(--corp-line)',
                              }}
                            >
                              <Pencil size={10} /> Пробег
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Audit log (директор/админ) */}
            {canManage && (
              <div
                className="p-3"
                style={{
                  background: 'var(--corp-surface)',
                  border: '1px solid var(--corp-line)',
                  borderRadius: 'var(--corp-r-lg)',
                }}
                data-testid="card-audit-log"
              >
                <div className="flex items-center gap-2 mb-2">
                  <History size={16} style={{ color: 'var(--corp-accent)' }} />
                  <h3 className="text-[13px] font-bold" style={{ color: 'var(--corp-ink)' }}>
                    Журнал действий
                  </h3>
                </div>
                {auditLoading ? (
                  <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                    <Loader2 size={12} className="animate-spin" /> Загрузка…
                  </div>
                ) : auditLog.length === 0 ? (
                  <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                    Записей пока нет.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-72 overflow-y-auto">
                    {auditLog.map((a) => {
                      const actor = a.user?.name || a.user?.username || 'Система';
                      const d = a.details || {};
                      let descr = '';
                      switch (a.action) {
                        case 'create':
                          descr = `Добавлен автомобиль ${d.brand || ''} ${d.model || ''} · ${d.plateNumber || ''}`.trim();
                          break;
                        case 'update':
                          descr = `Обновлены поля: ${(d.fields || []).join(', ') || '—'}`;
                          break;
                        case 'archive':
                          descr = 'Перенесён в архив';
                          break;
                        case 'restore':
                          descr = 'Восстановлен из архива';
                          break;
                        case 'reassign':
                          descr = `Назначен сотрудник: ${d.assignedToName || 'не назначен'}` +
                            (d.assignedFromName ? ` (был: ${d.assignedFromName})` : '');
                          break;
                        case 'photo_control':
                          descr = `Выполнен фотоконтроль · пробег ${(d.mileageKm || 0).toLocaleString('ru-RU')} км`;
                          break;
                        case 'mileage_correction':
                          descr = `Корректировка пробега: ${(d.mileageFrom || 0).toLocaleString('ru-RU')} → ${(d.mileageTo || 0).toLocaleString('ru-RU')} км` +
                            (d.reason ? ` · ${d.reason}` : '');
                          break;
                        default:
                          descr = a.action;
                      }
                      return (
                        <div
                          key={a.id}
                          className="text-[11px] py-1.5 px-2 rounded"
                          style={{ background: 'var(--corp-surface-2)' }}
                          data-testid={`audit-${a.id}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold" style={{ color: 'var(--corp-ink)' }}>
                              {actor}
                            </span>
                            <span style={{ color: 'var(--corp-muted)' }}>
                              {fmtDateRu(a.createdAt || undefined)}
                            </span>
                          </div>
                          <div style={{ color: 'var(--corp-ink-2)' }}>{descr}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Archive / Restore (director only) */}
            {canManage && (
              <Button
                variant="outline"
                className="w-full h-10"
                data-testid="button-archive-toggle"
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate(isArchived ? 'active' : 'archived')}
              >
                {isArchived ? (
                  <><RotateCcw size={14} className="mr-2" /> Восстановить из архива</>
                ) : (
                  <><Archive size={14} className="mr-2" /> Перенести в архив</>
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Edit dialog */}
      {vehicle && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Редактировать автомобиль</DialogTitle>
            </DialogHeader>
            <VehicleForm
              initial={{
                id: vehicle.id,
                brand: vehicle.brand,
                model: vehicle.model,
                year: vehicle.year,
                plateNumber: vehicle.plateNumber,
                vin: vehicle.vin,
                color: vehicle.color,
                photoUrl: vehicle.photoUrl,
                assignedPersonnelId: vehicle.assignedPersonnelId,
              }}
              onSuccess={() => setEditOpen(false)}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Корректировка пробега (директор/админ) */}
      <Dialog open={!!mileageEdit} onOpenChange={(o) => !o && setMileageEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Корректировка пробега</DialogTitle>
          </DialogHeader>
          {mileageEdit && (
            <div className="space-y-3">
              <div className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                Текущее значение: <b style={{ color: 'var(--corp-ink)' }}>
                  {mileageEdit.currentMileage.toLocaleString('ru-RU')} км
                </b>
              </div>
              <div className="space-y-1">
                <Label htmlFor="mileage-new" className="text-[12px]">Новый пробег (км)</Label>
                <Input
                  id="mileage-new"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={mileageEdit.newMileage}
                  onChange={(e) =>
                    setMileageEdit({ ...mileageEdit, newMileage: e.target.value })
                  }
                  data-testid="input-correct-mileage"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="mileage-reason" className="text-[12px]">Причина</Label>
                <Textarea
                  id="mileage-reason"
                  rows={3}
                  placeholder="Например: ошибка ввода, опечатка"
                  value={mileageEdit.reason}
                  onChange={(e) =>
                    setMileageEdit({ ...mileageEdit, reason: e.target.value })
                  }
                  data-testid="input-correct-reason"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMileageEdit(null)}
                  data-testid="button-correct-cancel"
                >
                  Отмена
                </Button>
                <Button
                  type="button"
                  disabled={correctMileageMutation.isPending}
                  onClick={() => {
                    const n = parseInt(mileageEdit.newMileage, 10);
                    if (!Number.isFinite(n) || n < 0) {
                      toast({ title: 'Введите корректный пробег', variant: 'destructive' });
                      return;
                    }
                    if (n === mileageEdit.currentMileage) {
                      toast({ title: 'Значение не изменилось', variant: 'destructive' });
                      return;
                    }
                    if (mileageEdit.reason.trim().length < 1) {
                      toast({ title: 'Укажите причину', variant: 'destructive' });
                      return;
                    }
                    correctMileageMutation.mutate({
                      controlId: mileageEdit.controlId,
                      mileageKm: n,
                      reason: mileageEdit.reason.trim(),
                    });
                  }}
                  data-testid="button-correct-save"
                >
                  {correctMileageMutation.isPending ? 'Сохранение…' : 'Сохранить'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
