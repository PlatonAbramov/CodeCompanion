import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit, Trash2, Plus, User, Phone, Mail,
  Calendar, FileText, AlertTriangle, Download,
  Upload, DollarSign, Eye, X
} from "lucide-react";
import { format, differenceInDays, differenceInYears, differenceInMonths } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { PersonnelForm } from "@/components/PersonnelForm";
import { PersonnelDocumentForm } from "@/components/PersonnelDocumentForm";
import { PersonnelAdvanceForm } from "@/components/PersonnelAdvanceForm";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CorpHeader, MoneyAED, fmtDateRu } from "@/components/corp-ui";

interface Personnel {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  emiratesId?: string;
  emiratesIdIssueDate?: string;
  emiratesIdExpiryDate?: string;
  specialization: string;
  startDate: string;
  salary?: string;
  status?: string;
  photoUrl?: string;
  isDriver?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface RoleAuditEntry {
  id: string;
  action: string;
  actorName: string | null;
  createdAt: string | null;
  details?: any;
}

interface PersonnelDocument {
  id: string;
  personnelId: string;
  documentType: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fileUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface PersonnelAdvance {
  id: string;
  personnelId: string;
  amount: string;
  date: string;
  description?: string;
  fileUrl?: string;
  projectId?: string;
  status: string;
  createdBy: string;
  createdAt: string;
  cancelledBy?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

const SECTION_STYLE: React.CSSProperties = {
  background: 'var(--corp-surface)',
  border: '1px solid var(--corp-line)',
  borderRadius: 'var(--corp-r-lg)',
};
const PRIMARY_BTN: React.CSSProperties = {
  background: 'var(--corp-accent)',
  color: '#fff',
  borderRadius: 'var(--corp-r)',
};
const GHOST_BTN: React.CSSProperties = {
  background: 'var(--corp-surface-2)',
  color: 'var(--corp-ink-2)',
  borderRadius: 'var(--corp-r)',
};
const DANGER_BTN: React.CSSProperties = {
  background: 'var(--corp-neg)',
  color: '#fff',
  borderRadius: 'var(--corp-r)',
};

function StatusBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'pos' | 'neg' | 'warn' | 'accent' | 'neutral' }) {
  const cfg =
    tone === 'pos' ? { bg: 'rgba(22,163,74,0.10)', color: 'var(--corp-pos)' } :
    tone === 'neg' ? { bg: 'rgba(220,38,38,0.10)', color: 'var(--corp-neg)' } :
    tone === 'warn' ? { bg: 'rgba(245,158,11,0.10)', color: '#f59e0b' } :
    tone === 'accent' ? { bg: 'rgba(37,99,235,0.10)', color: 'var(--corp-accent)' } :
    { bg: 'var(--corp-surface-2)', color: 'var(--corp-ink-3)' };
  return (
    <span
      className="inline-flex items-center px-2 h-5 text-[10px] font-bold uppercase whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color, borderRadius: 'var(--corp-r-sm)', letterSpacing: '0.04em' }}
    >
      {children}
    </span>
  );
}

function InfoField({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>{label}</p>
      <p className="text-[13px] font-semibold" style={{ color: 'var(--corp-ink)', fontFamily: mono ? 'var(--corp-mono)' : undefined }}>
        {value}
      </p>
    </div>
  );
}

export function PersonnelDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/personnel/:id");
  const [, setLocation] = useLocation();
  const personnelId = params?.id;

  const [showEditForm, setShowEditForm] = useState(false);
  const [showDocForm, setShowDocForm] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<PersonnelDocument | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [showDocDeleteDialog, setShowDocDeleteDialog] = useState(false);
  const [docToDelete, setDocToDelete] = useState<string | null>(null);
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showAdvanceDeleteDialog, setShowAdvanceDeleteDialog] = useState(false);
  const [advanceToDelete, setAdvanceToDelete] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPhoto) setSelectedPhoto(null);
        else if (selectedDocument) setSelectedDocument(null);
      }
    };
    if (selectedPhoto || selectedDocument) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [selectedPhoto, selectedDocument]);

  const isAdmin = user?.role === 'admin';
  const canView = user?.role === 'admin' || user?.role === 'director';

  const { data: person, isLoading: isLoadingPerson } = useQuery<Personnel>({
    queryKey: [`/api/personnel/${personnelId}`],
    enabled: !!personnelId && canView,
  });

  const { data: documents = [], isLoading: isLoadingDocs } = useQuery<PersonnelDocument[]>({
    queryKey: [`/api/personnel/${personnelId}/documents`],
    enabled: !!personnelId && canView,
  });

  const { data: advances = [], isLoading: isLoadingAdvances } = useQuery<PersonnelAdvance[]>({
    queryKey: [`/api/personnel/${personnelId}/advances`],
    enabled: !!personnelId && canView,
  });

  const { data: advancesSummary } = useQuery<{
    totalAdvances: number;
    salary: number;
    toPay: number;
    carryOver: number;
  }>({
    queryKey: [`/api/personnel/${personnelId}/advances/summary`, selectedMonth.toISOString()],
    enabled: !!personnelId && canView,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/personnel/${personnelId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Успешно", description: "Сотрудник удален" });
      setLocation("/personnel");
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  // Изменение роли «Водитель»
  const driverRoleMutation = useMutation({
    mutationFn: async (isDriver: boolean) => {
      const r = await fetch(`/api/personnel/${personnelId}/driver-role`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDriver }),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        const err: any = new Error(json?.error || 'Не удалось изменить роль');
        err.payload = json;
        err.status = r.status;
        throw err;
      }
      return json;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/personnel'] });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/role-audit-log`] });
      if (data?.changed !== false) {
        toast({
          title: "Готово",
          description: data?.person?.isDriver ? 'Назначена роль «Водитель»' : 'Снята роль «Водитель»',
        });
      }
    },
    onError: (error: any) => {
      const linked = error?.payload?.vehicles as Array<{ brand: string; model: string; plateNumber: string }> | undefined;
      const linkedTxt = linked && linked.length > 0
        ? `: ${linked.map((v) => `${v.brand} ${v.model} (${v.plateNumber})`).join(', ')}`
        : '';
      toast({
        title: "Ошибка",
        description: (error?.message || 'Не удалось изменить роль') + linkedTxt,
        variant: "destructive",
      });
    },
  });

  const { data: roleAudit = [] } = useQuery<RoleAuditEntry[]>({
    queryKey: [`/api/personnel/${personnelId}/role-audit-log`],
    enabled: !!personnelId && canView,
  });

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      return await apiRequest(`/api/personnel/documents/${docId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Успешно", description: "Документ удален" });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/documents`] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const cancelAdvanceMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await apiRequest(`/api/personnel/advances/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
    },
    onSuccess: () => {
      toast({ title: "Успешно", description: "Аванс отменен" });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances`] });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances/summary`] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const deleteAdvanceMutation = useMutation({
    mutationFn: async (advanceId: string) => {
      return await apiRequest(`/api/personnel/advances/${advanceId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Успешно", description: "Аванс удален" });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances`] });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances/summary`] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      return await apiRequest(`/api/personnel/${personnelId}/photo`, {
        method: "POST",
        body: JSON.stringify({ photoUrl }),
      });
    },
    onSuccess: () => {
      toast({ title: "Успешно", description: "Фото загружено" });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}`] });
    },
    onError: (error) => {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    },
  });

  const calculateExperience = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const years = differenceInYears(now, start);
    const months = differenceInMonths(now, start) % 12;
    if (years > 0) {
      return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'} ${months > 0 ? `${months} мес.` : ''}`;
    }
    return `${months} мес.`;
  };

  const calculateAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const now = new Date();
    const years = differenceInYears(now, birth);
    return `${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`;
  };

  const getDocumentStatus = (expiryDate?: string) => {
    if (!expiryDate) return 'normal';
    const now = new Date();
    const expiry = new Date(expiryDate);
    const days = differenceInDays(expiry, now);
    if (days <= 0) return 'expired';
    if (days <= 14) return 'critical';
    if (days <= 30) return 'warning';
    return 'normal';
  };

  const getDocumentTypeName = (type: string) => {
    const types: Record<string, string> = {
      'emirates_id': 'Emirates ID',
      'passport': 'Паспорт',
      'visa': 'Виза',
      'contract': 'Трудовой договор',
      'medical': 'Медицинская карта',
      'insurance': 'Страховка',
      'qualification': 'Квалификация',
      'other': 'Другое'
    };
    return types[type] || type;
  };

  const handleDeletePerson = () => {
    deleteMutation.mutate();
    setShowDeleteDialog(false);
  };

  const handleDeleteDoc = () => {
    if (docToDelete) {
      deleteDocMutation.mutate(docToDelete);
      setShowDocDeleteDialog(false);
      setDocToDelete(null);
    }
  };

  const handleCancelAdvance = (advanceId: string) => {
    const reason = prompt("Укажите причину отмены аванса:");
    if (reason) {
      cancelAdvanceMutation.mutate({ id: advanceId, reason });
    }
  };

  const handleDeleteAdvance = () => {
    if (advanceToDelete) {
      deleteAdvanceMutation.mutate(advanceToDelete);
      setShowAdvanceDeleteDialog(false);
      setAdvanceToDelete(null);
    }
  };

  const handlePhotoUpload = async () => {
    try {
      const response = await apiRequest("/api/objects/upload", { method: "POST" });
      const data = await response.json();
      if (!data || !data.uploadURL) throw new Error("No upload URL received from server");
      return { method: "PUT" as const, url: data.uploadURL };
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось получить URL для загрузки", variant: "destructive" });
      throw error;
    }
  };

  const handlePhotoComplete = async (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const file = result.successful[0];
      const uploadURL = file.uploadURL;
      try {
        await uploadPhotoMutation.mutateAsync(uploadURL);
      } catch (error) {
        toast({ title: "Ошибка", description: "Не удалось сохранить фото", variant: "destructive" });
      }
    } else {
      toast({ title: "Ошибка", description: "Не удалось загрузить фото", variant: "destructive" });
    }
  };

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--corp-bg)' }}>
        <div className="max-w-md p-6 text-center" style={SECTION_STYLE}>
          <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>Нет доступа к разделу «Персонал»</p>
        </div>
      </div>
    );
  }

  if (isLoadingPerson || isLoadingDocs) {
    return <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }} />;
  }

  if (!person) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--corp-bg)' }}>
        <div className="max-w-md p-6 text-center" style={SECTION_STYLE}>
          <p className="text-[13px] mb-3" style={{ color: 'var(--corp-muted)' }}>Сотрудник не найден</p>
          <button
            type="button"
            onClick={() => setLocation('/personnel')}
            className="inline-flex items-center gap-1 h-9 px-4 text-[12px] font-semibold"
            style={GHOST_BTN}
          >
            Вернуться к списку
          </button>
        </div>
      </div>
    );
  }

  const experience = calculateExperience(person.startDate);
  const age = person.dateOfBirth ? calculateAge(person.dateOfBirth) : null;
  const fullName = `${person.lastName} ${person.firstName}${person.middleName ? ' ' + person.middleName : ''}`;
  const statusTone: 'pos' | 'neg' | 'warn' | 'neutral' =
    person.status === 'active' ? 'pos' :
    person.status === 'dismissed' ? 'neg' :
    person.status === 'vacation' ? 'warn' : 'neutral';
  const statusText =
    person.status === 'active' ? 'Активен' :
    person.status === 'dismissed' ? 'Уволен' :
    person.status === 'vacation' ? 'Отпуск' : (person.status || '—');

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }} data-page-header>
      <CorpHeader
        title={fullName}
        subtitle={person.specialization}
        onBack={() => setLocation('/personnel')}
        action={
          isAdmin ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowEditForm(true)}
                className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold"
                style={PRIMARY_BTN}
              >
                <Edit size={13} /> Редактировать
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="w-9 h-9 flex items-center justify-center"
                style={DANGER_BTN}
                title="Удалить"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : undefined
        }
      />

      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Photo card */}
          <div className="p-6 flex flex-col items-center" style={SECTION_STYLE}>
            <div className="relative group mb-4">
              {person.photoUrl ? (
                <div className="relative">
                  <img
                    src={`/objects/${person.photoUrl.split('/').slice(-2).join('/')}`}
                    alt={fullName}
                    className="w-32 h-32 rounded-full object-cover cursor-pointer"
                    style={{ border: '2px solid var(--corp-line)' }}
                    onClick={() => setSelectedPhoto(person.photoUrl || null)}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <div
                    className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => setSelectedPhoto(person.photoUrl || null)}
                  >
                    <Eye className="w-7 h-7 text-white" />
                  </div>
                </div>
              ) : (
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-3)' }}
                >
                  <User className="w-16 h-16" />
                </div>
              )}
            </div>

            {isAdmin && (
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={5242880}
                onGetUploadParameters={handlePhotoUpload}
                onComplete={handlePhotoComplete}
              >
                <Upload className="w-4 h-4 mr-2" />
                Загрузить фото
              </ObjectUploader>
            )}

            <div className="text-center mt-4">
              <p className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>{person.specialization}</p>
              <div className="mt-2 flex items-center justify-center gap-1 flex-wrap">
                <StatusBadge tone={statusTone}>{statusText}</StatusBadge>
                {person.isDriver && (
                  <StatusBadge tone="accent">Водитель</StatusBadge>
                )}
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="p-4" style={SECTION_STYLE}>
            <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>Контактная информация</h3>
            <div className="space-y-2 text-[13px]">
              {person.phone && (
                <div className="flex items-center gap-2" style={{ color: 'var(--corp-ink-2)' }}>
                  <Phone size={14} style={{ color: 'var(--corp-ink-3)' }} />
                  <span style={{ fontFamily: 'var(--corp-mono)' }}>{person.phone}</span>
                </div>
              )}
              {person.email && (
                <div className="flex items-center gap-2" style={{ color: 'var(--corp-ink-2)' }}>
                  <Mail size={14} style={{ color: 'var(--corp-ink-3)' }} />
                  <span style={{ fontFamily: 'var(--corp-mono)' }}>{person.email}</span>
                </div>
              )}
              {age && (
                <div className="flex items-center gap-2" style={{ color: 'var(--corp-ink-2)' }}>
                  <Calendar size={14} style={{ color: 'var(--corp-ink-3)' }} />
                  <span>Возраст: {age}</span>
                </div>
              )}
            </div>
          </div>

          {/* Роли */}
          <div className="p-4" style={SECTION_STYLE} data-testid="card-roles">
            <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>Роли</h3>
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--corp-ink)' }}>Водитель</p>
                <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                  Доступ к фотоконтролю автомобиля
                </p>
              </div>
              {(user?.role === 'admin' || user?.role === 'director') ? (
                <label className="inline-flex items-center cursor-pointer select-none" data-testid="toggle-driver-role">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={!!person.isDriver}
                    disabled={driverRoleMutation.isPending}
                    onChange={(e) => driverRoleMutation.mutate(e.target.checked)}
                  />
                  <div
                    className="w-10 h-6 rounded-full transition-all relative"
                    style={{
                      background: person.isDriver ? 'var(--corp-accent)' : 'var(--corp-surface-2)',
                      border: '1px solid var(--corp-line)',
                      opacity: driverRoleMutation.isPending ? 0.6 : 1,
                    }}
                  >
                    <div
                      className="absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white transition-all"
                      style={{
                        left: person.isDriver ? '20px' : '2px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>
                </label>
              ) : (
                <StatusBadge tone={person.isDriver ? 'accent' : 'neutral'}>
                  {person.isDriver ? 'Назначен' : 'Не назначен'}
                </StatusBadge>
              )}
            </div>
            {roleAudit.length > 0 && (
              <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid var(--corp-line)' }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                  Журнал изменений
                </p>
                {roleAudit.slice(0, 5).map((a) => (
                  <div key={a.id} className="text-[11px] flex justify-between gap-2" data-testid={`role-audit-${a.id}`}>
                    <span style={{ color: 'var(--corp-ink-2)' }}>
                      {a.action === 'grant_driver' ? 'Назначена «Водитель»' : 'Снята «Водитель»'}
                      {a.actorName ? ` · ${a.actorName}` : ''}
                    </span>
                    <span style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                      {fmtDateRu(a.createdAt || undefined)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">Информация</TabsTrigger>
              <TabsTrigger value="documents">
                Документы
                {documents.some(d => getDocumentStatus(d.expiryDate) !== 'normal') && (
                  <AlertTriangle className="w-3 h-3 ml-1" style={{ color: 'var(--corp-neg)' }} />
                )}
              </TabsTrigger>
              <TabsTrigger value="advances">
                Авансы
                <DollarSign className="w-3 h-3 ml-1" />
              </TabsTrigger>
            </TabsList>

            {/* Info tab */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="p-4" style={SECTION_STYLE}>
                <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>Личные данные</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="ФИО" value={fullName} />
                  {person.dateOfBirth && (
                    <InfoField label="Дата рождения" value={fmtDateRu(person.dateOfBirth)} mono />
                  )}
                </div>
              </div>

              {person.emiratesId && (
                <div className="p-4" style={SECTION_STYLE}>
                  <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>Emirates ID</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField label="Номер" value={person.emiratesId} mono />
                    {person.emiratesIdIssueDate && (
                      <InfoField label="Дата выдачи" value={fmtDateRu(person.emiratesIdIssueDate)} mono />
                    )}
                    {person.emiratesIdExpiryDate && (
                      <div>
                        <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>Дата окончания</p>
                        <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}>
                          {fmtDateRu(person.emiratesIdExpiryDate)}
                        </p>
                        {(() => {
                          const status = getDocumentStatus(person.emiratesIdExpiryDate);
                          if (status === 'normal') return null;
                          const tone: 'neg' | 'warn' = status === 'expired' || status === 'critical' ? 'neg' : 'warn';
                          const text =
                            status === 'expired' ? 'Истёк' :
                            status === 'critical' ? '≤14 дней' : '≤30 дней';
                          return <StatusBadge tone={tone}>{text}</StatusBadge>;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4" style={SECTION_STYLE}>
                <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>Рабочая информация</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label="Специализация" value={person.specialization} />
                  <InfoField label="Дата начала работы" value={fmtDateRu(person.startDate)} mono />
                  <InfoField label="Стаж работы" value={experience} />
                  {person.salary && (
                    <div>
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>Зарплата</p>
                      <MoneyAED amount={person.salary} size={14} weight={700} tone="ink" />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Documents tab */}
            <TabsContent value="documents" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>Документы сотрудника</h3>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowDocForm(true)}
                    className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold"
                    style={PRIMARY_BTN}
                  >
                    <Plus size={14} /> Добавить документ
                  </button>
                )}
              </div>

              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map(doc => {
                    const status = getDocumentStatus(doc.expiryDate);
                    return (
                      <div key={doc.id} className="p-4" style={SECTION_STYLE}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'rgba(37,99,235,0.10)', color: 'var(--corp-accent)' }}
                            >
                              <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[13px] font-semibold" style={{ color: 'var(--corp-ink)' }}>{getDocumentTypeName(doc.documentType)}</p>
                              {doc.documentNumber && (
                                <p className="text-[11px]" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                                  № {doc.documentNumber}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1 text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                                {doc.issueDate && (
                                  <span>Выдан: <span style={{ fontFamily: 'var(--corp-mono)' }}>{fmtDateRu(doc.issueDate)}</span></span>
                                )}
                                {doc.expiryDate && (
                                  <span>Истекает: <span style={{ fontFamily: 'var(--corp-mono)' }}>{fmtDateRu(doc.expiryDate)}</span></span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {status !== 'normal' && (
                              <StatusBadge tone={status === 'expired' || status === 'critical' ? 'neg' : 'warn'}>
                                {status === 'expired' ? 'Истёк' : status === 'critical' ? '≤14 дней' : '≤30 дней'}
                              </StatusBadge>
                            )}
                            {doc.fileUrl && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDocument(doc.fileUrl || null)}
                                  className="w-8 h-8 flex items-center justify-center rounded"
                                  style={{ color: 'var(--corp-accent)' }}
                                  title="Просмотр"
                                >
                                  <Eye size={15} />
                                </button>
                                <a
                                  href={`/objects/${doc.fileUrl.split('/').slice(-2).join('/')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-8 h-8 flex items-center justify-center rounded"
                                  style={{ color: 'var(--corp-pos)' }}
                                  title="Скачать"
                                >
                                  <Download size={15} />
                                </a>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedDoc(doc); setShowDocForm(true); }}
                                  className="w-8 h-8 flex items-center justify-center rounded"
                                  style={{ color: 'var(--corp-ink-3)' }}
                                  title="Редактировать"
                                >
                                  <Edit size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setDocToDelete(doc.id); setShowDocDeleteDialog(true); }}
                                  className="w-8 h-8 flex items-center justify-center rounded"
                                  style={{ color: 'var(--corp-neg)' }}
                                  title="Удалить"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center" style={SECTION_STYLE}>
                  <FileText size={28} className="mx-auto mb-2" style={{ color: 'var(--corp-muted)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>Документы не добавлены</p>
                </div>
              )}
            </TabsContent>

            {/* Advances tab */}
            <TabsContent value="advances" className="space-y-3 mt-4">
              {/* Salary calc summary */}
              {advancesSummary && person.salary && (
                <div className="p-4" style={SECTION_STYLE}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>Расчёт зарплаты</h3>
                    <input
                      type="month"
                      value={selectedMonth.toISOString().slice(0, 7)}
                      onChange={(e) => setSelectedMonth(new Date(e.target.value))}
                      className="px-2 py-1 text-[12px]"
                      style={{
                        background: 'var(--corp-surface-2)',
                        border: '1px solid var(--corp-line)',
                        borderRadius: 'var(--corp-r-sm)',
                        color: 'var(--corp-ink-2)',
                        fontFamily: 'var(--corp-mono)',
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>Зарплата</p>
                      <MoneyAED amount={advancesSummary.salary.toFixed(2)} size={16} weight={700} tone="ink" />
                    </div>
                    <div className="p-3" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>Взято авансов</p>
                      <MoneyAED amount={advancesSummary.totalAdvances.toFixed(2)} size={16} weight={700} tone="neg" />
                    </div>
                    <div className="p-3" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>Долг с пр. месяца</p>
                      <MoneyAED amount={advancesSummary.carryOver.toFixed(2)} size={16} weight={700} tone={advancesSummary.carryOver > 0 ? 'warn' : 'ink'} />
                    </div>
                    <div className="p-3" style={{ background: 'rgba(22,163,74,0.10)', borderRadius: 'var(--corp-r)' }}>
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-pos)', letterSpacing: '0.04em' }}>К выплате</p>
                      <MoneyAED amount={advancesSummary.toPay.toFixed(2)} size={16} weight={700} tone="pos" />
                    </div>
                  </div>
                </div>
              )}

              {/* Add advance buttons */}
              {(isAdmin || user?.role === 'director') && (
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances`] })}
                    className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold"
                    style={GHOST_BTN}
                  >
                    Обновить
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdvanceForm(true)}
                    className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold"
                    style={PRIMARY_BTN}
                  >
                    <Plus size={14} /> Добавить аванс
                  </button>
                </div>
              )}

              {isLoadingAdvances ? (
                <div className="p-8" style={SECTION_STYLE} />
              ) : advances.length > 0 ? (
                <div className="space-y-2">
                  {advances.map((advance) => (
                    <div key={advance.id} className="p-4" style={SECTION_STYLE}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <MoneyAED amount={advance.amount} size={16} weight={700} tone={advance.status === 'cancelled' ? 'ink' : 'neg'} />
                            {advance.status === 'cancelled' && (
                              <StatusBadge tone="neg">Отменён</StatusBadge>
                            )}
                          </div>
                          <p className="text-[11px] mt-1" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                            {fmtDateRu(advance.date)}
                          </p>
                          {advance.description && (
                            <p className="text-[12px] mt-2" style={{ color: 'var(--corp-ink-2)' }}>{advance.description}</p>
                          )}
                          {advance.cancellationReason && (
                            <p className="text-[12px] mt-2" style={{ color: 'var(--corp-neg)' }}>
                              Причина отмены: {advance.cancellationReason}
                            </p>
                          )}
                          {advance.fileUrl && (
                            <a
                              href={`/objects/${advance.fileUrl.split('/').slice(-2).join('/')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[12px] mt-2 hover:underline"
                              style={{ color: 'var(--corp-accent)' }}
                            >
                              <FileText size={11} />
                              Документ
                            </a>
                          )}
                        </div>

                        {isAdmin && advance.status === 'active' && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => handleCancelAdvance(advance.id)}
                              className="w-8 h-8 flex items-center justify-center rounded"
                              style={{ color: '#f59e0b' }}
                              title="Отменить аванс"
                            >
                              <X size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAdvanceToDelete(advance.id); setShowAdvanceDeleteDialog(true); }}
                              className="w-8 h-8 flex items-center justify-center rounded"
                              style={{ color: 'var(--corp-neg)' }}
                              title="Удалить аванс"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center" style={SECTION_STYLE}>
                  <DollarSign size={28} className="mx-auto mb-2" style={{ color: 'var(--corp-muted)' }} />
                  <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>Авансы не найдены</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Forms and dialogs */}
      {showEditForm && (
        <PersonnelForm
          person={person}
          open={showEditForm}
          onClose={() => setShowEditForm(false)}
          onSuccess={() => {
            setShowEditForm(false);
            queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}`] });
          }}
        />
      )}

      {showDocForm && (
        <PersonnelDocumentForm
          personnelId={personnelId!}
          document={selectedDoc}
          open={showDocForm}
          onClose={() => { setShowDocForm(false); setSelectedDoc(null); }}
          onSuccess={() => {
            setShowDocForm(false);
            setSelectedDoc(null);
            queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/documents`] });
          }}
        />
      )}

      {showAdvanceForm && (
        <PersonnelAdvanceForm
          personnelId={personnelId!}
          open={showAdvanceForm}
          onClose={() => setShowAdvanceForm(false)}
          onSuccess={() => {
            setShowAdvanceForm(false);
            queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances`] });
            queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances/summary`] });
          }}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить сотрудника?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Сотрудник и все его документы будут удалены.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePerson} style={{ background: 'var(--corp-neg)', color: '#fff' }}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDocDeleteDialog} onOpenChange={setShowDocDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить документ?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Документ будет удалён.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDoc} style={{ background: 'var(--corp-neg)', color: '#fff' }}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAdvanceDeleteDialog} onOpenChange={setShowAdvanceDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить аванс?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие необратимо. Аванс будет полностью удалён из системы.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAdvance} style={{ background: 'var(--corp-neg)', color: '#fff' }}>
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Photo viewer */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 z-10"
              onClick={() => setSelectedPhoto(null)}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <img
              src={`/objects/${selectedPhoto.split('/').slice(-2).join('/')}`}
              alt="Фото сотрудника"
              className="max-w-full max-h-full object-contain"
              onError={() => {
                toast({ title: "Ошибка", description: "Не удалось загрузить фото", variant: "destructive" });
                setSelectedPhoto(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Document viewer */}
      {selectedDocument && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDocument(null)}
        >
          <div className="relative w-full h-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-2 right-2 w-9 h-9 flex items-center justify-center rounded-full bg-black bg-opacity-50 hover:bg-opacity-75 z-10"
              onClick={() => setSelectedDocument(null)}
            >
              <X className="w-5 h-5 text-white" />
            </button>
            <iframe
              src={`/objects/${selectedDocument.split('/').slice(-2).join('/')}`}
              className="w-full h-full border-none rounded"
              title="Документ"
              onError={() => {
                toast({ title: "Ошибка", description: "Не удалось загрузить документ", variant: "destructive" });
                setSelectedDocument(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
