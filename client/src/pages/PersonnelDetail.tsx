import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit, Trash2, Plus, User, Phone, Mail,
  Calendar, FileText, AlertTriangle, Download,
  Upload, DollarSign, Eye, X, KeyRound, Link2, Unlink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { format, differenceInDays, differenceInYears, differenceInMonths } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
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
import { CorpHeader, MoneyAED } from "@/components/corp-ui";
import { useLanguage } from "@/components/LanguageProvider";
import { fmtDate } from "@/lib/locale";

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
  userId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

interface UserLite {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive?: boolean | null;
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
  const { t, language } = useLanguage();
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

  const { has, hasAny } = usePermissions();
  // Источник правды — права. Любая роль с personnel.view/personnel.manage
  // (через персональный оверрайд) получает доступ к разделу.
  const canView = hasAny('personnel.view', 'personnel.manage');
  const canManage = has('personnel.manage');
  // Сохраняем имя isAdmin для совместимости со старым кодом ниже —
  // теперь это «может управлять персоналом».
  const isAdmin = canManage;

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
      toast({ title: t('success'), description: t('pd_personnelDeletedDesc') });
      setLocation("/personnel");
    },
    onError: (error) => {
      toast({ title: t('error'), description: error.message, variant: "destructive" });
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
        const err: any = new Error(json?.error || t('pd_roleChangeFailed'));
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
      // Изменение роли «Водитель» влияет на эффективные права привязанной
      // учётки — обновляем кэш прав и пользователя у админа.
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/me'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      if (data?.changed !== false) {
        toast({
          title: t('pd_doneToast'),
          description: data?.person?.isDriver ? t('pd_driverRoleAssignedDesc') : t('pd_driverRoleRemovedDesc'),
        });
      }
    },
    onError: (error: any) => {
      const linked = error?.payload?.vehicles as Array<{ brand: string; model: string; plateNumber: string }> | undefined;
      const linkedTxt = linked && linked.length > 0
        ? `: ${linked.map((v) => `${v.brand} ${v.model} (${v.plateNumber})`).join(', ')}`
        : '';
      toast({
        title: t('error'),
        description: (error?.message || t('pd_roleChangeFailed')) + linkedTxt,
        variant: "destructive",
      });
    },
  });

  const { data: roleAudit = [] } = useQuery<RoleAuditEntry[]>({
    queryKey: [`/api/personnel/${personnelId}/role-audit-log`],
    enabled: !!personnelId && canView,
  });

  // ===== Учётная запись (link / create / unlink) =====
  // Показываем UI только админу: создание/привязка учёток — ответственность админа.
  // (`isAdmin` уже объявлен выше — переиспользуем)

  // Все пользователи системы — нужны и для выбора «привязать существующую»,
  // и для отображения данных уже привязанной учётки (находим её в этом списке).
  // Endpoint /api/admin/users доступен только админам.
  const { data: allUsers = [] } = useQuery<UserLite[]>({
    queryKey: ['/api/admin/users'],
    enabled: isAdmin,
  });
  const linkedUser = person?.userId ? allUsers.find((u) => u.id === person.userId) : undefined;

  // Все personnel — чтобы понять, какие userId уже заняты другими карточками.
  const { data: allPersonnelForLink = [] } = useQuery<Array<{ id: string; userId?: string | null }>>({
    queryKey: ['/api/personnel'],
    enabled: isAdmin,
  });
  const usedUserIds = new Set(
    allPersonnelForLink
      .filter((p) => p.userId && p.id !== personnelId)
      .map((p) => p.userId as string),
  );
  const availableUsers = allUsers.filter((u) => !usedUserIds.has(u.id));

  // UI-стейт для секции «Учётная запись»
  const [accountMode, setAccountMode] = useState<'idle' | 'create' | 'link'>('idle');
  const [linkUserId, setLinkUserId] = useState<string>('');
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  // Создание роли `admin` через карточку персонала запрещено на бэке —
  // новые админы должны создаваться через админ-панель.
  const [createRole, setCreateRole] = useState<'director' | 'master' | 'worker' | 'client'>('worker');

  // Сбрасываем форму, как только меняется сотрудник или появляется привязка.
  useEffect(() => {
    setAccountMode('idle');
    setLinkUserId('');
    setCreateUsername('');
    setCreatePassword('');
    setCreateRole('worker');
  }, [personnelId, person?.userId]);

  const linkUserMutation = useMutation({
    mutationFn: async (userId: string | null) => {
      return await apiRequest(`/api/personnel/${personnelId}`, {
        method: 'PUT',
        body: JSON.stringify({ userId }),
      });
    },
    onSuccess: () => {
      toast({ title: t('pd_doneToast'), description: t('pd_accountLinkUpdatedDesc') });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/personnel'] });
      // Привязка отвязка учётки меняет состав «прав, действующих у этого
      // человека», поэтому сразу же освежаем сводку и текущего пользователя.
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/me'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setAccountMode('idle');
    },
    onError: (error: any) => {
      toast({ title: t('error'), description: error?.message || t('pd_accountLinkUpdateFailedDesc'), variant: 'destructive' });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/personnel/${personnelId}/create-user`, {
        method: 'POST',
        body: JSON.stringify({
          username: createUsername.trim(),
          password: createPassword,
          role: createRole,
        }),
      });
    },
    onSuccess: () => {
      toast({ title: t('pd_doneToast'), description: t('pd_accountCreatedDesc') });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/personnel'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      // Создание+линковка учётки могут затронуть моё представление о правах
      // (если привязали меня самого) — на всякий случай сбрасываем кэш прав.
      queryClient.invalidateQueries({ queryKey: ['/api/permissions/me'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setAccountMode('idle');
    },
    onError: (error: any) => {
      toast({ title: t('error'), description: error?.message || t('pd_accountCreateFailedDesc'), variant: 'destructive' });
    },
  });

  const [confirmUnlinkOpen, setConfirmUnlinkOpen] = useState(false);

  const roleLabel = (r: string) => ({
    admin: t('roleAdmin'), director: t('roleDirector'), master: t('roleMaster'), worker: t('roleWorker'), client: t('roleClient'),
  } as Record<string, string>)[r] || r;

  const deleteDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      return await apiRequest(`/api/personnel/documents/${docId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: t('success'), description: t('pd_documentDeletedDesc') });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/documents`] });
    },
    onError: (error) => {
      toast({ title: t('error'), description: error.message, variant: "destructive" });
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
      toast({ title: t('success'), description: t('pd_advanceCancelledDesc') });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances`] });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances/summary`] });
    },
    onError: (error) => {
      toast({ title: t('error'), description: error.message, variant: "destructive" });
    },
  });

  const deleteAdvanceMutation = useMutation({
    mutationFn: async (advanceId: string) => {
      return await apiRequest(`/api/personnel/advances/${advanceId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: t('success'), description: t('pd_advanceDeletedDesc') });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances`] });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}/advances/summary`] });
    },
    onError: (error) => {
      toast({ title: t('error'), description: error.message, variant: "destructive" });
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
      toast({ title: t('success'), description: t('pd_photoUploadedDesc') });
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${personnelId}`] });
    },
    onError: (error) => {
      toast({ title: t('error'), description: error.message, variant: "destructive" });
    },
  });

  const calculateExperience = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const years = differenceInYears(now, start);
    const months = differenceInMonths(now, start) % 12;
    if (years > 0) {
      const yearWord = language === 'ru'
        ? (years === 1 ? t('yearOne') : years < 5 ? t('yearFew') : t('yearMany'))
        : t('yearMany');
      return `${years} ${yearWord}${months > 0 ? ` ${months} ${t('monthShort')}` : ''}`;
    }
    return `${months} ${t('monthShort')}`;
  };

  const calculateAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const now = new Date();
    const years = differenceInYears(now, birth);
    const yearWord = language === 'ru'
      ? (years === 1 ? t('yearOne') : years < 5 ? t('yearFew') : t('yearMany'))
      : t('yearMany');
    return `${years} ${yearWord}`;
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
      'passport': t('pd_docPassport'),
      'visa': t('pd_docVisa'),
      'contract': t('pd_docContract'),
      'medical': t('pd_docMedical'),
      'insurance': t('pd_docInsurance'),
      'qualification': t('pd_docQualification'),
      'other': t('pd_docOther')
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
    const reason = prompt(t('pd_promptCancelReason'));
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
      toast({ title: t('error'), description: t('pd_uploadUrlFailedDesc'), variant: "destructive" });
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
        toast({ title: t('error'), description: t('pd_photoSaveFailedDesc'), variant: "destructive" });
      }
    } else {
      toast({ title: t('error'), description: t('pd_photoLoadFailedDesc'), variant: "destructive" });
    }
  };

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--corp-bg)' }}>
        <div className="max-w-md p-6 text-center" style={SECTION_STYLE}>
          <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>{t('noAccessSection').replace('{section}', t('sectionPersonnel'))}</p>
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
          <p className="text-[13px] mb-3" style={{ color: 'var(--corp-muted)' }}>{t('pd_personNotFound')}</p>
          <button
            type="button"
            onClick={() => setLocation('/personnel')}
            className="inline-flex items-center gap-1 h-9 px-4 text-[12px] font-semibold"
            style={GHOST_BTN}
          >
            {t('backToList')}
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
    person.status === 'active' ? t('statusActiveOption') :
    person.status === 'dismissed' ? t('statusDismissed') :
    person.status === 'vacation' ? t('statusVacation') : (person.status || '—');

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
                <Edit size={13} /> {t('edit')}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteDialog(true)}
                className="w-9 h-9 flex items-center justify-center"
                style={DANGER_BTN}
                title={t('delete')}
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
                {t('pd_uploadPhoto')}
              </ObjectUploader>
            )}

            <div className="text-center mt-4">
              <p className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>{person.specialization}</p>
              <div className="mt-2 flex items-center justify-center gap-1 flex-wrap">
                <StatusBadge tone={statusTone}>{statusText}</StatusBadge>
                {person.isDriver && (
                  <StatusBadge tone="accent">{t('driverRoleBadge')}</StatusBadge>
                )}
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="p-4" style={SECTION_STYLE}>
            <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>{t('pd_contactInformation')}</h3>
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
                  <span>{t('pd_ageLabel')}: {age}</span>
                </div>
              )}
            </div>
          </div>

          {/* Роли */}
          <div className="p-4" style={SECTION_STYLE} data-testid="card-roles">
            <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>{t('pd_rolesHeading')}</h3>
            <div className="flex items-center justify-between gap-3 py-1">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--corp-ink)' }}>{t('driverRoleBadge')}</p>
                <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                  {t('pd_driverDescription')}
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
                  {person.isDriver ? t('pd_assigned') : t('pd_notAssigned')}
                </StatusBadge>
              )}
            </div>
            {roleAudit.length > 0 && (
              <div className="mt-3 pt-3 space-y-1" style={{ borderTop: '1px solid var(--corp-line)' }}>
                <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                  {t('pd_changeLog')}
                </p>
                {roleAudit.slice(0, 5).map((a) => (
                  <div key={a.id} className="text-[11px] flex justify-between gap-2" data-testid={`role-audit-${a.id}`}>
                    <span style={{ color: 'var(--corp-ink-2)' }}>
                      {a.action === 'grant_driver' ? t('pd_driverGranted') : t('pd_driverRevoked')}
                      {a.actorName ? ` · ${a.actorName}` : ''}
                    </span>
                    <span style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                      {fmtDate(a.createdAt || undefined, language)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Учётная запись (только для админа) */}
          {isAdmin && (
            <div className="p-4" style={SECTION_STYLE} data-testid="card-account">
              <h3 className="text-[14px] font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--corp-ink)' }}>
                <KeyRound className="w-4 h-4" />
                {t('pd_accountTitle')}
              </h3>

              {person.userId ? (
                <div className="space-y-3">
                  {linkedUser ? (
                    <div className="space-y-1 text-[13px]">
                      <div className="flex justify-between gap-2">
                        <span style={{ color: 'var(--corp-muted)' }}>{t('pd_loginColon')}</span>
                        <span style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }} data-testid="text-account-username">
                          {linkedUser.username}
                        </span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span style={{ color: 'var(--corp-muted)' }}>{t('pd_nameColon')}</span>
                        <span style={{ color: 'var(--corp-ink)' }}>{linkedUser.name}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span style={{ color: 'var(--corp-muted)' }}>{t('pd_roleColon')}</span>
                        <StatusBadge tone="accent">{roleLabel(linkedUser.role)}</StatusBadge>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                      {t('pd_accountLinkedNotFound')}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2" style={{ borderTop: '1px solid var(--corp-line)' }}>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLocation('/permissions-and-access')}
                      data-testid="button-manage-permissions"
                    >
                      {t('pd_managePermissions')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setConfirmUnlinkOpen(true)}
                      disabled={linkUserMutation.isPending}
                      data-testid="button-unlink-account"
                    >
                      <Unlink className="w-3 h-3 mr-1" />
                      {t('pd_unlink')}
                    </Button>
                  </div>
                </div>
              ) : accountMode === 'idle' ? (
                <div className="space-y-3">
                  <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                    {t('pd_noAccountHint')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setAccountMode('create')} data-testid="button-create-account">
                      <Plus className="w-3 h-3 mr-1" />
                      {t('pd_createAccount')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAccountMode('link')}
                      disabled={availableUsers.length === 0}
                      data-testid="button-link-account"
                    >
                      <Link2 className="w-3 h-3 mr-1" />
                      {t('pd_linkExisting')}
                    </Button>
                  </div>
                  {availableUsers.length === 0 && (
                    <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                      {t('pd_noFreeAccounts')}
                    </p>
                  )}
                </div>
              ) : accountMode === 'create' ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-[12px]">{t('pd_loginExample')}</Label>
                    <Input
                      value={createUsername}
                      onChange={(e) => setCreateUsername(e.target.value)}
                      placeholder="ivanov@company.ae"
                      autoComplete="off"
                      data-testid="input-new-username"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px]">{t('pd_passwordHint')}</Label>
                    <Input
                      type="text"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder={t('pd_temporaryPassword')}
                      autoComplete="new-password"
                      data-testid="input-new-password"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px]">{t('pd_roleSelectLabel')}</Label>
                    <Select value={createRole} onValueChange={(v) => setCreateRole(v as any)}>
                      <SelectTrigger data-testid="select-new-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="worker">{t('roleWorker')}</SelectItem>
                        <SelectItem value="master">{t('roleMaster')}</SelectItem>
                        <SelectItem value="director">{t('roleDirector')}</SelectItem>
                        <SelectItem value="client">{t('roleClient')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => createUserMutation.mutate()}
                      disabled={
                        createUserMutation.isPending ||
                        createUsername.trim().length < 3 ||
                        createPassword.length < 6
                      }
                      data-testid="button-submit-create-account"
                    >
                      {createUserMutation.isPending ? t('pd_creating') : t('pd_createAndLink')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAccountMode('idle')}
                      disabled={createUserMutation.isPending}
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              ) : (
                /* link mode */
                <div className="space-y-3">
                  <div>
                    <Label className="text-[12px]">{t('pd_freeAccounts')}</Label>
                    <Select value={linkUserId} onValueChange={setLinkUserId}>
                      <SelectTrigger data-testid="select-link-user">
                        <SelectValue placeholder={t('pd_selectAccountPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.username} · {u.name} ({roleLabel(u.role)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => linkUserMutation.mutate(linkUserId)}
                      disabled={!linkUserId || linkUserMutation.isPending}
                      data-testid="button-submit-link-account"
                    >
                      {linkUserMutation.isPending ? t('pd_linking') : t('pd_link')}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setAccountMode('idle')}
                      disabled={linkUserMutation.isPending}
                    >
                      {t('cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="info">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info">{t('pd_tabInfo')}</TabsTrigger>
              <TabsTrigger value="documents">
                {t('pd_tabDocuments')}
                {documents.some(d => getDocumentStatus(d.expiryDate) !== 'normal') && (
                  <AlertTriangle className="w-3 h-3 ml-1" style={{ color: 'var(--corp-neg)' }} />
                )}
              </TabsTrigger>
              <TabsTrigger value="advances">
                {t('pd_tabAdvances')}
                <DollarSign className="w-3 h-3 ml-1" />
              </TabsTrigger>
            </TabsList>

            {/* Info tab */}
            <TabsContent value="info" className="space-y-4 mt-4">
              <div className="p-4" style={SECTION_STYLE}>
                <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>{t('pd_personalData')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label={t('pd_fullName')} value={fullName} />
                  {person.dateOfBirth && (
                    <InfoField label={t('pd_dateOfBirth')} value={fmtDate(person.dateOfBirth, language)} mono />
                  )}
                </div>
              </div>

              {person.emiratesId && (
                <div className="p-4" style={SECTION_STYLE}>
                  <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>Emirates ID</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField label={t('pd_numberLabel')} value={person.emiratesId} mono />
                    {person.emiratesIdIssueDate && (
                      <InfoField label={t('pd_issueDate')} value={fmtDate(person.emiratesIdIssueDate, language)} mono />
                    )}
                    {person.emiratesIdExpiryDate && (
                      <div>
                        <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>{t('pd_endDateLabel')}</p>
                        <p className="text-[13px] font-semibold mb-1" style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}>
                          {fmtDate(person.emiratesIdExpiryDate, language)}
                        </p>
                        {(() => {
                          const status = getDocumentStatus(person.emiratesIdExpiryDate);
                          if (status === 'normal') return null;
                          const tone: 'neg' | 'warn' = status === 'expired' || status === 'critical' ? 'neg' : 'warn';
                          const text =
                            status === 'expired' ? t('pd_expiredText') :
                            status === 'critical' ? t('pd_days14') : t('pd_days30');
                          return <StatusBadge tone={tone}>{text}</StatusBadge>;
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4" style={SECTION_STYLE}>
                <h3 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>{t('pd_workInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoField label={t('pd_specialization')} value={person.specialization} />
                  <InfoField label={t('pd_startDate')} value={fmtDate(person.startDate, language)} mono />
                  <InfoField label={t('pd_experience')} value={experience} />
                  {person.salary && (
                    <div>
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>{t('pd_salary')}</p>
                      <MoneyAED amount={person.salary} size={14} weight={700} tone="ink" />
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Documents tab */}
            <TabsContent value="documents" className="space-y-3 mt-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>{t('pd_personnelDocuments')}</h3>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowDocForm(true)}
                    className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold"
                    style={PRIMARY_BTN}
                  >
                    <Plus size={14} /> {t('pd_addDocument')}
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
                                  <span>{t('pd_issuedColon')}: <span style={{ fontFamily: 'var(--corp-mono)' }}>{fmtDate(doc.issueDate, language)}</span></span>
                                )}
                                {doc.expiryDate && (
                                  <span>{t('pd_expiresColon')}: <span style={{ fontFamily: 'var(--corp-mono)' }}>{fmtDate(doc.expiryDate, language)}</span></span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            {status !== 'normal' && (
                              <StatusBadge tone={status === 'expired' || status === 'critical' ? 'neg' : 'warn'}>
                                {status === 'expired' ? t('pd_expiredText') : status === 'critical' ? t('pd_days14') : t('pd_days30')}
                              </StatusBadge>
                            )}
                            {doc.fileUrl && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setSelectedDocument(doc.fileUrl || null)}
                                  className="w-8 h-8 flex items-center justify-center rounded"
                                  style={{ color: 'var(--corp-accent)' }}
                                  title={t('pd_view')}
                                >
                                  <Eye size={15} />
                                </button>
                                <a
                                  href={`/objects/${doc.fileUrl.split('/').slice(-2).join('/')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-8 h-8 flex items-center justify-center rounded"
                                  style={{ color: 'var(--corp-pos)' }}
                                  title={t('pd_download')}
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
                                  title={t('edit')}
                                >
                                  <Edit size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { setDocToDelete(doc.id); setShowDocDeleteDialog(true); }}
                                  className="w-8 h-8 flex items-center justify-center rounded"
                                  style={{ color: 'var(--corp-neg)' }}
                                  title={t('delete')}
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
                  <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>{t('pd_noDocuments')}</p>
                </div>
              )}
            </TabsContent>

            {/* Advances tab */}
            <TabsContent value="advances" className="space-y-3 mt-4">
              {/* Salary calc summary */}
              {advancesSummary && person.salary && (
                <div className="p-4" style={SECTION_STYLE}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>{t('pd_salaryCalculation')}</h3>
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
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>{t('pd_salary')}</p>
                      <MoneyAED amount={advancesSummary.salary.toFixed(2)} size={16} weight={700} tone="ink" />
                    </div>
                    <div className="p-3" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>{t('pd_advancesTaken')}</p>
                      <MoneyAED amount={advancesSummary.totalAdvances.toFixed(2)} size={16} weight={700} tone="neg" />
                    </div>
                    <div className="p-3" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>{t('pd_carryOverDebt')}</p>
                      <MoneyAED amount={advancesSummary.carryOver.toFixed(2)} size={16} weight={700} tone={advancesSummary.carryOver > 0 ? 'warn' : 'ink'} />
                    </div>
                    <div className="p-3" style={{ background: 'rgba(22,163,74,0.10)', borderRadius: 'var(--corp-r)' }}>
                      <p className="text-[10px] uppercase font-bold mb-1" style={{ color: 'var(--corp-pos)', letterSpacing: '0.04em' }}>{t('pd_toPay')}</p>
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
                    {t('pd_refresh')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAdvanceForm(true)}
                    className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold"
                    style={PRIMARY_BTN}
                  >
                    <Plus size={14} /> {t('pd_addAdvance')}
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
                              <StatusBadge tone="neg">{t('pd_cancelledStatus')}</StatusBadge>
                            )}
                          </div>
                          <p className="text-[11px] mt-1" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                            {fmtDate(advance.date, language)}
                          </p>
                          {advance.description && (
                            <p className="text-[12px] mt-2" style={{ color: 'var(--corp-ink-2)' }}>{advance.description}</p>
                          )}
                          {advance.cancellationReason && (
                            <p className="text-[12px] mt-2" style={{ color: 'var(--corp-neg)' }}>
                              {t('pd_cancellationReasonLabel')}: {advance.cancellationReason}
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
                              {t('pd_documentLabel')}
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
                              title={t('pd_cancelAdvanceTitle')}
                            >
                              <X size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAdvanceToDelete(advance.id); setShowAdvanceDeleteDialog(true); }}
                              className="w-8 h-8 flex items-center justify-center rounded"
                              style={{ color: 'var(--corp-neg)' }}
                              title={t('pd_deleteAdvanceTitle')}
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
                  <p className="text-[13px]" style={{ color: 'var(--corp-muted)' }}>{t('pd_noAdvances')}</p>
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
            <AlertDialogTitle>{t('pd_deletePersonnelConfTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pd_deletePersonnelConfDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePerson} style={{ background: 'var(--corp-neg)', color: '#fff' }}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDocDeleteDialog} onOpenChange={setShowDocDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pd_deleteDocumentConfTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pd_deleteDocumentConfDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDoc} style={{ background: 'var(--corp-neg)', color: '#fff' }}>
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUnlinkOpen} onOpenChange={setConfirmUnlinkOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pd_unlinkAccountConfTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pd_unlinkAccountConfDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmUnlinkOpen(false);
                linkUserMutation.mutate(null);
              }}
              data-testid="button-confirm-unlink"
            >
              {t('pd_unlink')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAdvanceDeleteDialog} onOpenChange={setShowAdvanceDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pd_deleteAdvanceConfTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pd_deleteAdvanceConfDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAdvance} style={{ background: 'var(--corp-neg)', color: '#fff' }}>
              {t('delete')}
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
              alt={t('pd_personnelPhotoAlt')}
              className="max-w-full max-h-full object-contain"
              onError={() => {
                toast({ title: t('error'), description: t('pd_photoLoadFailedDesc'), variant: "destructive" });
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
              title={t('pd_documentLabel')}
              onError={() => {
                toast({ title: t('error'), description: t('pd_documentLoadFailedDesc'), variant: "destructive" });
                setSelectedDocument(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
