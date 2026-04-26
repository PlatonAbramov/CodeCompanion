import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Car, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CorpEmpty, fmtDateRu } from "@/components/corp-ui";
import { VehicleForm } from "@/components/VehicleForm";

interface VehicleListItem {
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
  lastPhotoControl?: {
    id: string;
    performedAt: string | null;
    weekKey: string;
    mileageKm: number;
  } | null;
}

interface PersonnelOption {
  id: string;
  firstName: string;
  lastName: string;
  specialization: string;
  status?: string | null;
}

type StatusFilter = 'active' | 'archived' | 'all';

function VehicleCard({ v, onClick }: { v: VehicleListItem; onClick: () => void }) {
  const initials = `${v.brand?.[0] || '?'}${v.model?.[0] || ''}`.toUpperCase();
  const isArchived = v.status === 'archived';
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`card-vehicle-${v.id}`}
      className="w-full text-left p-3 transition-colors active:opacity-80"
      style={{
        background: 'var(--corp-surface)',
        border: '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
        opacity: isArchived ? 0.7 : 1,
      }}
    >
      <div className="flex items-center gap-3">
        {v.photoUrl ? (
          <img
            src={v.photoUrl}
            alt={`${v.brand} ${v.model}`}
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center text-[15px] font-bold flex-shrink-0"
            style={{ background: 'var(--corp-accent-soft, #EEF1FF)', color: 'var(--corp-accent)' }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>
              {v.brand} {v.model}
            </p>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold font-mono"
              style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)' }}
            >
              {v.plateNumber}
            </span>
            {isArchived && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-muted)' }}
              >
                Архив
              </span>
            )}
          </div>
          <p className="text-[12px] truncate" style={{ color: 'var(--corp-muted)' }}>
            {v.assignedPersonnel
              ? `${v.assignedPersonnel.lastName} ${v.assignedPersonnel.firstName}`
              : 'Не назначен'}
            {v.year ? ` · ${v.year}` : ''}
          </p>
          {v.lastPhotoControl ? (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--corp-ink-3)' }}>
              Последний контроль: {fmtDateRu(v.lastPhotoControl.performedAt || undefined)} · {v.lastPhotoControl.mileageKm.toLocaleString('ru-RU')} км
            </p>
          ) : (
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--corp-warning, #C97A00)' }}>
              Контроль не проводился
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Vehicles() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const isDirector = user?.role === 'admin' || user?.role === 'director';

  const { data: vehicles = [], isLoading } = useQuery<VehicleListItem[]>({
    queryKey: ['/api/vehicles'],
  });

  const { data: personnelOptions = [] } = useQuery<PersonnelOption[]>({
    queryKey: ['/api/personnel'],
    queryFn: async () => {
      const r = await fetch('/api/personnel', { credentials: 'include' });
      if (!r.ok) return [];
      return r.json();
    },
    enabled: isDirector,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return vehicles.filter((v) => {
      if (statusFilter !== 'all' && v.status !== statusFilter) return false;
      if (assignedFilter !== 'all') {
        if (assignedFilter === 'none' && v.assignedPersonnelId) return false;
        if (assignedFilter !== 'none' && v.assignedPersonnelId !== assignedFilter) return false;
      }
      if (!q) return true;
      const personName = v.assignedPersonnel
        ? `${v.assignedPersonnel.lastName} ${v.assignedPersonnel.firstName}`
        : '';
      return [v.brand, v.model, v.plateNumber, v.vin || '', personName]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [vehicles, search, statusFilter, assignedFilter]);

  const tabs: { key: StatusFilter; label: string }[] = [
    { key: 'active', label: 'Активные' },
    { key: 'archived', label: 'Архив' },
    { key: 'all', label: 'Все' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--corp-surface)', borderBottom: '1px solid var(--corp-line)' }}
      >
        <div className="px-3 sm:px-4 h-14 flex items-center gap-2">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--corp-accent-soft, #EEF1FF)', color: 'var(--corp-accent)' }}
          >
            <Car size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-[14px] sm:text-[15px] font-bold truncate"
              style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
            >
              Автомобили
            </h2>
            <p className="text-[11px] truncate" style={{ color: 'var(--corp-muted)' }}>
              {isDirector ? 'Парк компании' : 'Закреплённые за вами'}
            </p>
          </div>
          {isDirector && (
            <button
              type="button"
              data-testid="button-add-vehicle"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
              style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r)' }}
            >
              <Plus size={14} /> Добавить
            </button>
          )}
        </div>
      </header>

      <div className="px-3 sm:px-4 py-3 space-y-3 max-w-2xl mx-auto pb-24">
        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--corp-muted)' }}
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по марке, госномеру, сотруднику…"
            className="pl-9 h-10 text-[13px]"
            data-testid="input-vehicle-search"
          />
        </div>

        {/* Status tabs */}
        <div
          className="flex p-0.5 gap-0.5"
          style={{
            background: 'var(--corp-surface-2)',
            borderRadius: 'var(--corp-r-lg)',
          }}
        >
          {tabs.map((t) => {
            const active = statusFilter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatusFilter(t.key)}
                data-testid={`tab-status-${t.key}`}
                className="flex-1 h-8 text-[12px] font-semibold transition-colors"
                style={{
                  background: active ? 'var(--corp-surface)' : 'transparent',
                  color: active ? 'var(--corp-ink)' : 'var(--corp-muted)',
                  borderRadius: 'calc(var(--corp-r-lg) - 2px)',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Assigned filter (director only) */}
        {isDirector && personnelOptions.length > 0 && (
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger
              className="h-9 text-[12px]"
              data-testid="select-assigned-filter"
            >
              <SelectValue placeholder="Водитель" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все водители</SelectItem>
              <SelectItem value="none">Без назначения</SelectItem>
              {personnelOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.lastName} {p.firstName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse"
                style={{
                  background: 'var(--corp-surface-2)',
                  borderRadius: 'var(--corp-r-lg)',
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <CorpEmpty
            icon={<Car size={22} />}
            title={search || assignedFilter !== 'all' ? 'Ничего не найдено' : 'Автомобилей пока нет'}
            description={
              search || assignedFilter !== 'all'
                ? 'Попробуйте изменить фильтры'
                : isDirector
                  ? 'Добавьте первый автомобиль, чтобы вести фотоконтроль'
                  : 'За вами пока не закреплено ни одного автомобиля'
            }
            actionLabel={isDirector && !search && assignedFilter === 'all' ? 'Добавить автомобиль' : undefined}
            onAction={isDirector && !search && assignedFilter === 'all' ? () => setCreateOpen(true) : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((v) => (
              <VehicleCard
                key={v.id}
                v={v}
                onClick={() => setLocation(`/vehicles/${v.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      {isDirector && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Новый автомобиль</DialogTitle>
            </DialogHeader>
            <VehicleForm
              onSuccess={(id) => {
                setCreateOpen(false);
                setLocation(`/vehicles/${id}`);
              }}
              onCancel={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
