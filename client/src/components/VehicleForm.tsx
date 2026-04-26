import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Camera, Loader2, X } from "lucide-react";

export interface VehicleFormValues {
  brand: string;
  model: string;
  year?: number | null;
  plateNumber: string;
  vin?: string | null;
  color?: string | null;
  photoUrl?: string | null;
  assignedPersonnelId?: string | null;
}

interface PersonnelRecord {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  specialization: string;
  status?: string | null;
  isDriver?: boolean;
}

interface VehicleFormProps {
  initial?: Partial<VehicleFormValues> & { id?: string };
  onSuccess: (id: string) => void;
  onCancel: () => void;
}

export function VehicleForm({ initial, onSuccess, onCancel }: VehicleFormProps) {
  const isEdit = !!initial?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [brand, setBrand] = useState(initial?.brand || '');
  const [model, setModel] = useState(initial?.model || '');
  const [year, setYear] = useState<string>(
    initial?.year ? String(initial.year) : '',
  );
  const [plateNumber, setPlateNumber] = useState(initial?.plateNumber || '');
  const [vin, setVin] = useState(initial?.vin || '');
  const [color, setColor] = useState(initial?.color || '');
  const [assignedPersonnelId, setAssignedPersonnelId] = useState(initial?.assignedPersonnelId || '');
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl || '');

  // Список водителей берём из справочника «Персонал».
  const { data: personnelList = [] } = useQuery<PersonnelRecord[]>({
    queryKey: ['/api/personnel'],
    queryFn: async () => {
      const r = await fetch('/api/personnel', { credentials: 'include' });
      if (!r.ok) return [];
      return r.json();
    },
  });
  // Только сотрудники с ролью «Водитель»; активные сверху.
  const personnelSorted = [...personnelList]
    .filter((p) => p.isDriver === true)
    .sort((a, b) => {
      const aActive = (a.status || 'active') === 'active' ? 0 : 1;
      const bActive = (b.status || 'active') === 'active' ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'ru');
    });

  const handleGetUploadParameters = async () => {
    const r = await apiRequest('/api/objects/upload', { method: 'POST' });
    const data = await r.json();
    if (!data?.uploadURL) throw new Error('Нет URL для загрузки');
    return { method: 'PUT' as const, url: data.uploadURL };
  };

  const handleUploadComplete = async (result: any) => {
    try {
      const uploaded = result?.successful?.[0];
      if (!uploaded?.uploadURL) return;
      const ack = await apiRequest('/api/objects/acl', {
        method: 'POST',
        body: JSON.stringify({
          objectUrl: uploaded.uploadURL,
          visibility: 'public',
        }),
      });
      const ackData = await ack.json();
      if (ackData?.objectPath) {
        setPhotoUrl(ackData.objectPath);
      }
    } catch (e) {
      console.error('Upload finalize failed', e);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить фото',
        variant: 'destructive',
      });
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const yearNum = year ? parseInt(year, 10) : null;
      const body: any = {
        brand: brand.trim(),
        model: model.trim(),
        year: yearNum,
        plateNumber: plateNumber.trim().toUpperCase(),
        vin: vin.trim() || null,
        color: color.trim() || null,
        photoUrl: photoUrl || null,
        assignedPersonnelId: assignedPersonnelId || null,
      };
      const r = await apiRequest(
        isEdit ? `/api/vehicles/${initial!.id}` : '/api/vehicles',
        { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(body) },
      );
      return r.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['/api/vehicles'] });
      if (isEdit) qc.invalidateQueries({ queryKey: ['/api/vehicles', initial!.id] });
      toast({
        title: isEdit ? 'Сохранено' : 'Автомобиль добавлен',
        description: `${data.brand} ${data.model} · ${data.plateNumber}`,
      });
      onSuccess(data.id);
    },
    onError: (e: any) => {
      toast({
        title: 'Ошибка',
        description: e?.message || 'Не удалось сохранить',
        variant: 'destructive',
      });
    },
  });

  const canSubmit = brand.trim() && model.trim() && plateNumber.trim();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) mutation.mutate();
      }}
    >
      {/* Photo */}
      <div>
        <Label className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
          Основное фото
        </Label>
        <div className="mt-1 flex items-center gap-3">
          {photoUrl ? (
            <div className="relative">
              <img
                src={photoUrl}
                alt="vehicle"
                className="w-20 h-20 rounded-lg object-cover"
                style={{ border: '1px solid var(--corp-line)' }}
              />
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                data-testid="button-remove-photo"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: '#ef4444', color: '#fff' }}
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-muted)' }}
            >
              <Camera size={20} />
            </div>
          )}
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={10 * 1024 * 1024}
            allowedFileTypes={['image/*']}
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleUploadComplete}
            buttonClassName="text-[12px]"
          >
            {photoUrl ? 'Заменить фото' : 'Загрузить фото'}
          </ObjectUploader>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="vf-brand" className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
            Марка *
          </Label>
          <Input
            id="vf-brand"
            data-testid="input-brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Toyota"
            className="h-9 text-[13px] mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vf-model" className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
            Модель *
          </Label>
          <Input
            id="vf-model"
            data-testid="input-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Hilux"
            className="h-9 text-[13px] mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vf-year" className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
            Год
          </Label>
          <Input
            id="vf-year"
            data-testid="input-year"
            value={year}
            onChange={(e) => setYear(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder="2024"
            inputMode="numeric"
            className="h-9 text-[13px] mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vf-plate" className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
            Госномер *
          </Label>
          <Input
            id="vf-plate"
            data-testid="input-plate"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
            placeholder="A123BC 77"
            className="h-9 text-[13px] mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vf-vin" className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
            VIN
          </Label>
          <Input
            id="vf-vin"
            data-testid="input-vin"
            value={vin || ''}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            placeholder="JTHBA1D29A2000123"
            className="h-9 text-[13px] mt-1 font-mono"
          />
        </div>
        <div>
          <Label htmlFor="vf-color" className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
            Цвет
          </Label>
          <Input
            id="vf-color"
            data-testid="input-color"
            value={color || ''}
            onChange={(e) => setColor(e.target.value)}
            placeholder="Белый"
            className="h-9 text-[13px] mt-1"
          />
        </div>
      </div>

      <div>
        <Label className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
          Закреплённый водитель (из «Персонала»)
        </Label>
        <Select
          value={assignedPersonnelId || 'none'}
          onValueChange={(v) => setAssignedPersonnelId(v === 'none' ? '' : v)}
        >
          <SelectTrigger className="h-9 text-[13px] mt-1" data-testid="select-assigned-personnel">
            <SelectValue placeholder="Не назначен" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Не назначен</SelectItem>
            {personnelSorted.map((p) => {
              const fullName = `${p.lastName} ${p.firstName}${p.middleName ? ' ' + p.middleName : ''}`.trim();
              const inactive = (p.status || 'active') !== 'active';
              return (
                <SelectItem key={p.id} value={p.id}>
                  {fullName} · {p.specialization}{inactive ? ' (не активен)' : ''}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {personnelList.length === 0 ? (
          <p className="text-[11px] mt-1" style={{ color: 'var(--corp-muted)' }}>
            Список пуст. Добавьте сотрудника в разделе «Персонал».
          </p>
        ) : personnelSorted.length === 0 ? (
          <p className="text-[11px] mt-1" style={{ color: 'var(--corp-muted)' }}>
            Нет сотрудников с ролью «Водитель». Назначьте роль в карточке сотрудника
            (Персонал → карточка → блок «Роли»).
          </p>
        ) : null}
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-10"
          onClick={onCancel}
          data-testid="button-cancel"
        >
          Отмена
        </Button>
        <Button
          type="submit"
          className="flex-1 h-10"
          disabled={!canSubmit || mutation.isPending}
          data-testid="button-save"
        >
          {mutation.isPending && <Loader2 size={14} className="animate-spin mr-2" />}
          {isEdit ? 'Сохранить' : 'Добавить'}
        </Button>
      </div>
    </form>
  );
}
