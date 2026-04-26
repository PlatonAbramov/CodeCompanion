import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Car, Edit2, Archive, RotateCcw, Camera, BarChart3, ClipboardList } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
  assignedUserId?: string | null;
  assignedUser?: { id: string; name: string; role: string } | null;
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
  const canPhotoControl = isMaster && vehicle?.assignedUserId === user?.id && !isArchived;

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
                <InfoRow label="Закреплён" value={vehicle.assignedUser?.name || 'Не назначен'} />
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

            {/* Stats placeholder (T005) */}
            <div
              className="p-3"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} style={{ color: 'var(--corp-accent)' }} />
                <h3 className="text-[13px] font-bold" style={{ color: 'var(--corp-ink)' }}>
                  Статистика пробега
                </h3>
              </div>
              <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                Появится после первого фотоконтроля.
              </p>
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
                  {controls.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 rounded"
                      style={{ background: 'var(--corp-surface-2)' }}
                      data-testid={`row-control-${c.id}`}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold" style={{ color: 'var(--corp-ink)' }}>
                          {fmtDateRu(c.performedAt || undefined)}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                          {c.mileageKm.toLocaleString('ru-RU')} км · {c.performedBy?.name || '—'}
                        </p>
                      </div>
                      {c.pdfUrl && (
                        <a
                          href={c.pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[12px] font-semibold"
                          style={{ color: 'var(--corp-accent)' }}
                        >
                          PDF
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                assignedUserId: vehicle.assignedUserId,
              }}
              onSuccess={() => setEditOpen(false)}
              onCancel={() => setEditOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
