import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  MoreVertical, Download, Eye, Plus, Edit,
  FileText, Trash2, ChevronDown, ChevronUp, ChevronRight,
  History, Archive, ArchiveRestore, Upload, ArrowUpDown,
  Calendar, DollarSign, User, Users, CheckCircle, AlertCircle,
  Search, Bell, Pencil, Receipt
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { FileUploader } from "@/components/FileUploader";
import { AssignClientModal } from "@/components/AssignClientModal";
import { VoiceExpenseButton } from "@/components/VoiceExpenseButton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { CorpHeader, MoneyAED, fmtNum } from "@/components/corp-ui";
import { fmtDate } from "@/lib/locale";

interface Project {
  id: string;
  name: string;
  location?: string;
  totalCost: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

interface FinancialSummary {
  totalCost: string;
  totalAdvances: string;
  totalCustomerAdvances: string;
  totalRevenues: string;
  totalExpenses: string;
  totalOwnerInvestments: string;
  currentProfit: string;
  projectedProfit: string;
  vladEarnings?: string;
  platonEarnings?: string;
  vladAdvances?: string;
  platonAdvances?: string;
}

interface Expense {
  id: string;
  category: string;
  amount: string;
  description?: string;
  createdAt: string;
  user: { name: string };
  contractor?: {
    name: string;
    company?: string;
  };
}

interface Document {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
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
const DARK_BTN: React.CSSProperties = {
  background: 'var(--corp-ink)',
  color: '#fff',
  borderRadius: 'var(--corp-r)',
};

function Row({
  label, amount, tone = 'ink', onClick, actions,
}: {
  label: string;
  amount: string;
  tone?: 'ink' | 'pos' | 'neg';
  onClick?: () => void;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className="flex justify-between items-center px-3 py-2.5 transition-colors"
      style={{
        background: 'var(--corp-surface-2)',
        borderRadius: 'var(--corp-r)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      <div className="flex items-center flex-1 min-w-0">
        <span className="text-[13px]" style={{ color: 'var(--corp-ink-2)' }}>{label}</span>
        {actions && <div className="flex items-center ml-2 flex-shrink-0">{actions}</div>}
      </div>
      <MoneyAED amount={amount} size={14} weight={700} tone={tone} />
    </div>
  );
}

function getCategoryLabel(category: string, t: (k: string) => string) {
  const categories: Record<string, string> = {
    'materials': t('materials'),
    'labor': t('prDet_catLabor'),
    'transport': t('transport'),
    'equipment': t('prDet_catEquipment'),
    'other': t('other')
  };
  return categories[category] || category;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getProjectInitials(name: string): string {
  if (!name) return '??';
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getStatusInfo(status: string | undefined, t: (k: string) => string): { label: string; bg: string; color: string; dot: string } {
  switch (status) {
    case 'completed':
      return { label: t('completed'), bg: 'rgba(22,163,74,0.12)', color: '#15803d', dot: '#16a34a' };
    case 'paused':
      return { label: t('prDet_statusPaused'), bg: 'rgba(100,116,139,0.14)', color: '#475569', dot: '#64748b' };
    case 'archived':
      return { label: t('archive'), bg: 'rgba(100,116,139,0.10)', color: '#64748b', dot: '#94a3b8' };
    case 'active':
    default:
      return { label: t('active'), bg: 'rgba(245,158,11,0.14)', color: '#b45309', dot: '#f59e0b' };
  }
}

function MobileProjectHero({
  project,
  financialSummary,
  teamCount,
  t,
  language,
}: {
  project: Project;
  financialSummary?: FinancialSummary;
  teamCount: number;
  t: (k: string) => string;
  language: any;
}) {
  const initials = getProjectInitials(project.name);
  const status = getStatusInfo(project.status, t);

  const totalCost = parseFloat(project.totalCost || '0');
  const totalExpenses = parseFloat(financialSummary?.totalExpenses || '0');
  const currentProfit = parseFloat(financialSummary?.currentProfit || '0');
  const isOverBudget = currentProfit < 0;
  const ratio = totalCost > 0 ? Math.min(100, (totalExpenses / totalCost) * 100) : 0;
  const progressPct = Math.round(ratio);
  const progressColor = isOverBudget ? 'var(--corp-neg)' : 'var(--corp-pos)';

  const dateRange = project.startDate && project.endDate
    ? `${fmtDate(project.startDate, language)} → ${fmtDate(project.endDate, language)}`
    : project.startDate
      ? fmtDate(project.startDate, language)
      : project.endDate
        ? `→ ${fmtDate(project.endDate, language)}`
        : null;

  return (
    <div
      className="lg:hidden p-4"
      style={{
        background: 'var(--corp-surface)',
        border: '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
      }}
      data-testid="mobile-project-hero"
    >
      {/* Top row: status pill + avatar */}
      <div className="flex items-start justify-between gap-3">
        <div
          className="inline-flex items-center gap-1.5 h-6 px-2.5"
          style={{
            background: status.bg,
            color: status.color,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: status.dot }}
          />
          {status.label}
        </div>
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 48,
            height: 48,
            background: 'rgba(91,88,235,0.10)',
            color: 'var(--corp-accent)',
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.02em',
          }}
        >
          {initials}
        </div>
      </div>

      {/* Project info */}
      <div className="mt-2">
        {project.location && (
          <div
            className="text-[11px] font-bold uppercase mb-1"
            style={{ color: 'var(--corp-muted)', letterSpacing: '0.06em' }}
          >
            {project.location}
          </div>
        )}
        <div
          className="text-[22px] font-bold leading-tight"
          style={{ color: 'var(--corp-ink)', letterSpacing: '-0.4px' }}
        >
          {project.name}
        </div>
      </div>

      {/* Progress bar */}
      {financialSummary && totalCost > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <div
            className="flex-1 h-1.5 overflow-hidden"
            style={{ background: 'var(--corp-line)', borderRadius: 999 }}
          >
            <div
              className="h-full"
              style={{
                width: `${ratio}%`,
                background: progressColor,
                borderRadius: 999,
                transition: 'width .3s ease',
              }}
            />
          </div>
          <span
            className="text-[12px] font-semibold flex-shrink-0"
            style={{
              color: 'var(--corp-ink-2)',
              fontFamily: 'var(--corp-mono)',
              minWidth: 38,
              textAlign: 'right',
            }}
          >
            {progressPct}%
          </span>
        </div>
      )}

      {/* Bottom info row: dates + team */}
      {(dateRange || teamCount > 0) && (
        <div
          className="mt-3 pt-3 flex items-center gap-4 flex-wrap"
          style={{ borderTop: '1px solid var(--corp-line)' }}
        >
          {dateRange && (
            <div className="flex items-center gap-1.5">
              <Calendar size={13} style={{ color: 'var(--corp-muted)' }} />
              <span
                className="text-[12px]"
                style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}
              >
                {dateRange}
              </span>
            </div>
          )}
          {teamCount > 0 && (
            <div className="flex items-center gap-1.5">
              <Users size={13} style={{ color: 'var(--corp-muted)' }} />
              <span className="text-[12px]" style={{ color: 'var(--corp-ink-2)' }}>
                <span style={{ fontFamily: 'var(--corp-mono)' }}>{teamCount}</span> {t('prDet_peopleShort')}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ====== DESKTOP HELPERS =================================== */

function StatusPill({ status, size = 'md', t }: { status?: string; size?: 'sm' | 'md'; t: (k: string) => string }) {
  const s = getStatusInfo(status, t);
  const small = size === 'sm';
  return (
    <span
      className="inline-flex items-center gap-1.5"
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 999,
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        height: small ? 20 : 24,
        padding: small ? '0 8px' : '0 10px',
      }}
    >
      <span
        className="rounded-full"
        style={{ background: s.dot, width: 6, height: 6 }}
      />
      {s.label}
    </span>
  );
}

function ProgressRing({ value, color, size = 96 }: { value: number; color: string; size?: number }) {
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--corp-line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset .4s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-[18px] font-bold"
          style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)', letterSpacing: '-0.5px' }}
        >
          {Math.round(value)}%
        </span>
      </div>
    </div>
  );
}

function DesktopFinanceRow({
  label,
  amount,
  tone = 'ink',
  isLast,
}: {
  label: string;
  amount: string | number;
  tone?: 'ink' | 'pos' | 'neg';
  isLast?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between py-2.5"
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--corp-line)' }}
    >
      <span className="text-[13px]" style={{ color: 'var(--corp-ink-2)' }}>{label}</span>
      <MoneyAED amount={String(amount)} size={14} weight={700} tone={tone} />
    </div>
  );
}

function TeamMemberRow({ name, role }: { name: string; role: string }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 28,
          height: 28,
          background: 'rgba(91,88,235,0.10)',
          color: 'var(--corp-accent)',
          borderRadius: '50%',
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {initial}
      </div>
      <span className="text-[13px]" style={{ color: 'var(--corp-ink)' }}>
        <span style={{ fontWeight: 600 }}>{name}</span>
        <span style={{ color: 'var(--corp-muted)', marginLeft: 6 }}>·</span>
        <span style={{ color: 'var(--corp-muted)', marginLeft: 6 }}>{role}</span>
      </span>
    </div>
  );
}

function MobileActionTile({
  onClick,
  icon,
  label,
  variant,
  testId,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  variant: 'primary' | 'ghost';
  testId?: string;
}) {
  const isPrimary = variant === 'primary';
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex items-center justify-center gap-2 h-12 px-3 text-[13px] font-semibold transition-colors active:scale-[0.98]"
      style={{
        background: isPrimary ? 'var(--corp-accent)' : 'var(--corp-surface)',
        color: isPrimary ? '#ffffff' : 'var(--corp-ink)',
        border: isPrimary ? 'none' : '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
      }}
    >
      <span
        className="inline-flex items-center justify-center"
        style={{ color: isPrimary ? '#ffffff' : 'var(--corp-ink-2)' }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

export default function ProjectDetail() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFinancialSummaryOpen, setIsFinancialSummaryOpen] = useState(false);
  const [isDocumentsOpen, setIsDocumentsOpen] = useState(false);
  const [isAssignClientModalOpen, setIsAssignClientModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateSheetDialogOpen, setIsCreateSheetDialogOpen] = useState(false);
  const [selectedInvoiceDoc, setSelectedInvoiceDoc] = useState<Document | null>(null);
  const [sheetName, setSheetName] = useState("");
  const [parseResult, setParseResult] = useState<any>(null);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const [expensesSortBy, setExpensesSortBy] = useState<'date' | 'amount'>('date');
  const [expensesSortOrder, setExpensesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expensesFilterByUser, setExpensesFilterByUser] = useState<string>('all');
  const [isCompleteProjectDialogOpen, setIsCompleteProjectDialogOpen] = useState(false);
  const [isPaymentsOpen, setIsPaymentsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'documents' | 'team' | 'timeline'>('overview');

  const projectId = location.split('/')[2];

  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
  });

  const { has, hasAny } = usePermissions();

  // Гейтинг данных по эффективным правам (role + overrides), а не по роли.
  // Серверные эндпоинты тоже проверяют права, но фронт не должен дёргать
  // запросы, которые гарантированно вернут 403.
  const canViewFinances = has('finances.view_summary');
  const canViewExpenses = hasAny('expenses.view_all', 'expenses.view_own');
  const canViewDocuments = has('documents.view');
  const canCreateExpense = has('expenses.create');
  const canUploadDocs = has('documents.upload');
  const canDeleteDocs = has('documents.delete');
  const canViewImplSheets = has('implementation_sheets.view');

  const { data: financialSummary } = useQuery<FinancialSummary>({
    queryKey: ['/api/projects', projectId, 'financial-summary'],
    enabled: !!projectId && canViewFinances,
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['/api/projects', projectId, 'expenses'],
    enabled: !!projectId && canViewExpenses,
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['/api/projects', projectId, 'documents'],
    enabled: !!projectId && canViewDocuments,
  });

  const { data: clientPayments = [] } = useQuery<Array<{
    id: string;
    amount: number;
    description?: string;
    paymentDate: string;
    paymentMethod?: string;
    clientId: string;
    clientName: string;
  }>>({
    queryKey: ['/api/projects', projectId, 'client-payments'],
    enabled: user?.role === 'client',
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (files: Array<{
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
    }>) => {
      const promises = files.map(file =>
        apiRequest('/api/documents', {
          method: 'POST',
          body: JSON.stringify({
            projectId: projectId,
            name: file.fileName,
            fileName: file.fileName,
            fileUrl: file.fileUrl,
            fileSize: file.fileSize,
            mimeType: file.mimeType
          })
        })
      );
      return Promise.all(promises.map(p => p.then(res => res.json())));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'documents'] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-client-projects"] });
      toast({
        title: t('success') || 'Success',
        description: t('documentsUploaded') || 'Documents uploaded successfully',
      });
    },
    onError: (error) => {
      console.error('Document creation error:', error);
      toast({
        title: t('error') || 'Error',
        description: t('uploadFailed') || 'Failed to create documents',
        variant: 'destructive',
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const res = await apiRequest(`/api/documents/${documentId}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'documents'] });
      toast({
        title: t('success') || 'Success',
        description: t('documentDeleted') || 'Document deleted successfully',
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: t('error') || 'Error',
        description: t('deleteFailed') || 'Failed to delete document',
        variant: 'destructive',
      });
    }
  });

  const handleFilesUpload = (files: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>) => {
    createDocumentMutation.mutate(files);
  };

  const handleDeleteDocument = (documentId: string) => {
    if (window.confirm(t('confirmDelete') || 'Are you sure you want to delete this document?')) {
      deleteMutation.mutate(documentId);
    }
  };

  const handleViewDocument = (doc: Document) => {
    window.open(doc.fileUrl, '_blank');
  };

  const handleDownloadDocument = (doc: Document) => {
    const link = document.createElement('a');
    link.href = doc.fileUrl;
    link.download = doc.name;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(`/api/projects/${projectId}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t('success'), description: t('prDet_projectDeletedDesc') });
      setLocation('/');
    },
    onError: (error) => {
      console.error('Delete project error:', error);
      toast({ title: t('error'), description: t('prDet_projectDeleteFailedDesc'), variant: 'destructive' });
    }
  });

  const handleDeleteProject = () => {
    deleteProjectMutation.mutate();
    setIsDeleteDialogOpen(false);
  };

  const createSheetFromInvoiceMutation = useMutation({
    mutationFn: async (data: { name: string; documentId: string }) => {
      const response = await fetch(`/api/projects/${projectId}/implementation-sheets/parse-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw errorData;
      }
      return response.json();
    },
    onSuccess: (result: any) => {
      toast({
        title: t('prDet_sheetCreatedTitle'),
        description: t('prDet_sheetCreatedDescTpl')
          .replace('{name}', result.sheet.name)
          .replace('{count}', String(result.parsedItems))
          .replace('{format}', result.format),
      });
      setIsCreateSheetDialogOpen(false);
      setSheetName("");
      setSelectedInvoiceDoc(null);
      setParseResult(null);
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/implementation-sheets`] });
      queryClient.invalidateQueries({ queryKey: ["/api/my-client-projects"] });
    },
    onError: (error: any) => {
      console.error("Parse error:", error);
      setParseResult(error);
      toast({
        title: t('prDet_sheetCreateErrorTitle'),
        description: error.error || t('prDet_sheetCreateErrorDesc'),
        variant: "destructive"
      });
    }
  });

  const handleCreateSheetFromInvoice = (doc: Document) => {
    if (!doc.fileName.toLowerCase().startsWith('invoice')) {
      toast({
        title: t('error'),
        description: t('prDet_invoiceOnlyDesc'),
        variant: "destructive"
      });
      return;
    }
    setSelectedInvoiceDoc(doc);
    setSheetName(t('prDet_sheetNameTpl').replace('{name}', doc.name));
    setIsCreateSheetDialogOpen(true);
  };

  const handleSubmitCreateSheet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceDoc || !sheetName.trim()) return;
    createSheetFromInvoiceMutation.mutate({
      name: sheetName.trim(),
      documentId: selectedInvoiceDoc.id
    });
  };

  const archiveProjectMutation = useMutation({
    mutationFn: async (archive: boolean) => {
      const res = await apiRequest(`/api/projects/${projectId}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ archive })
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: project?.status === 'archived' ? t('prDet_projectUnarchivedDesc') : t('prDet_projectArchivedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      console.error('Archive project error:', error);
      toast({ title: t('error'), description: t('prDet_archiveChangeFailed'), variant: "destructive" });
    }
  });

  const handleArchive = () => {
    archiveProjectMutation.mutate(project?.status !== 'archived');
  };

  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';

  const filteredAndSortedExpenses = expenses
    .filter(expense => {
      if (expensesFilterByUser === 'all') return true;
      return expense.user?.name === expensesFilterByUser;
    })
    .sort((a, b) => {
      let aValue, bValue;
      if (expensesSortBy === 'date') {
        aValue = new Date(a.createdAt).getTime();
        bValue = new Date(b.createdAt).getTime();
      } else {
        aValue = parseFloat(a.amount);
        bValue = parseFloat(b.amount);
      }
      const modifier = expensesSortOrder === 'asc' ? 1 : -1;
      return (aValue - bValue) * modifier;
    });

  const uniqueUsers = Array.from(
    new Set(expenses.map(expense => expense.user?.name).filter(Boolean))
  ).sort();

  const goBack = () => {
    if (user?.role === 'admin' || user?.role === 'director') {
      setLocation('/director');
    } else {
      setLocation('/master');
    }
  };

  if (!project) {
    return <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }} />;
  }

  // Минимальный экран карточки проекта для роли «Рабочий» БЕЗ доп. прав:
  // имя, статус и кнопка «Листы реализации». Если рабочему через
  // персональные оверрайды выданы права (expenses.*, documents.*, finances.*),
  // показываем полноценный экран — переключение делается ниже.
  const workerHasExtraAccess = canViewFinances || canViewExpenses || canViewDocuments || canCreateExpense || canUploadDocs;
  if (user?.role === 'worker' && !workerHasExtraAccess) {
    return (
      <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }}>
        <CorpHeader title={project.name} subtitle={project.location || undefined} onBack={goBack} />
        <div className="p-4 space-y-3">
          <div className="p-4" style={SECTION_STYLE}>
            <div className="flex items-center justify-between">
              <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>{t('prDet_statusLabel')}</span>
              <span
                className="text-[11px] font-bold uppercase px-2 py-1"
                style={{
                  background: project.status === 'active' ? 'rgba(16,185,129,0.10)' : 'rgba(148,163,184,0.10)',
                  color: project.status === 'active' ? 'var(--corp-pos)' : 'var(--corp-muted)',
                  borderRadius: 'var(--corp-r-sm)',
                  letterSpacing: '0.04em',
                }}
              >
                {project.status === 'active' ? t('prDet_statusActiveWord') : project.status === 'archived' ? t('prDet_statusArchivedWord') : project.status}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLocation(`/projects/${projectId}/implementation-sheets`)}
            className="w-full p-4 text-left flex items-center justify-between"
            style={SECTION_STYLE}
            data-testid="button-implementation-sheets-worker"
          >
            <span className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>
              {t('prDet_implSheetsTitle')}
            </span>
            <ChevronRight size={18} style={{ color: 'var(--corp-muted)' }} />
          </button>
        </div>
      </div>
    );
  }

  const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingToPay = Number(project.totalCost) - totalPaid;

  // Computed values for desktop dashboard
  const desktopInitials = getProjectInitials(project.name);
  const desktopTotalCost = parseFloat(project.totalCost || '0');
  const desktopTotalExpenses = parseFloat(financialSummary?.totalExpenses || '0');
  const desktopCurrentProfit = parseFloat(financialSummary?.currentProfit || '0');
  const desktopRatio = desktopTotalCost > 0 ? Math.min(100, (desktopTotalExpenses / desktopTotalCost) * 100) : 0;
  const desktopIsOverBudget = desktopCurrentProfit < 0;
  const desktopRingColor = desktopIsOverBudget ? 'var(--corp-neg)' : 'var(--corp-pos)';
  const desktopProjectIdShort = project.id.slice(0, 4).toUpperCase();
  const desktopDaysLeft = (() => {
    if (!project.endDate) return null;
    const ms = new Date(project.endDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  })();
  const desktopRecentExpenses = filteredAndSortedExpenses.slice(0, 5);

  // Состав вкладок зависит от эффективных прав. «Обзор» / «Команда» / «Хронология»
  // показываем всем; «Расходы» — при canViewExpenses; «Документы» — при canViewDocuments.
  const tabsConfig = [
    { key: 'overview' as const, label: t('prDet_tabOverview'), count: undefined as number | undefined },
    ...(canViewExpenses ? [{ key: 'expenses' as const, label: t('expenses'), count: expenses.length }] : []),
    ...(canViewDocuments ? [{ key: 'documents' as const, label: t('documents'), count: documents.length }] : []),
    { key: 'team' as const, label: t('prDet_teamLabel'), count: uniqueUsers.length },
    { key: 'timeline' as const, label: t('prDet_timelineLabel'), count: undefined },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }} data-page-header>
      {/* === MOBILE HEADER (lg:hidden) ============================ */}
      <div className="lg:hidden">
        <CorpHeader
          title={project.name}
          subtitle={project.location || undefined}
          onBack={goBack}
          action={
            isAdminOrDirector ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ color: 'var(--corp-ink-2)' }}
                    data-testid="button-project-menu"
                  >
                    <MoreVertical size={18} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocation(`/history/${projectId}`)} data-testid="menu-history">
                    <History className="h-4 w-4 mr-2" />
                    {t('prDet_changesHistory')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchive()} data-testid="menu-archive">
                    {project.status === 'archived' ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        {t('prDet_unarchive')}
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        {t('prDet_archiveAction')}
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    style={{ color: 'var(--corp-neg)' }}
                    data-testid="menu-delete-project"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('prDet_deleteProject')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : undefined
          }
        />
      </div>

      {/* === DESKTOP HEADER (hidden lg:block) ===================== */}
      <div className="hidden lg:block" style={{ background: 'var(--corp-surface)' }}>
        {/* Top utility bar */}
        <div
          className="px-8 h-14 flex items-center gap-4"
          style={{ borderBottom: '1px solid var(--corp-line)' }}
        >
          <nav className="flex items-center gap-2 text-[13px]">
            <button
              type="button"
              onClick={goBack}
              className="hover:underline"
              style={{ color: 'var(--corp-muted)' }}
              data-testid="breadcrumb-projects"
            >
              {t('prDet_projectsCrumb')}
            </button>
            <ChevronRight size={14} style={{ color: 'var(--corp-muted)' }} />
            <span style={{ color: 'var(--corp-ink)', fontWeight: 600 }}>{project.name}</span>
          </nav>

          <div className="flex-1" />

          <div className="relative max-w-md flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--corp-muted)' }}
            />
            <input
              type="text"
              placeholder={t('prDet_searchPlaceholder')}
              className="w-full h-9 pl-9 pr-12 text-[13px] outline-none"
              style={{
                background: 'var(--corp-surface-2)',
                color: 'var(--corp-ink)',
                border: '1px solid transparent',
                borderRadius: 'var(--corp-r)',
              }}
              data-testid="input-search-desktop"
            />
            <kbd
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-semibold"
              style={{
                background: 'var(--corp-surface)',
                color: 'var(--corp-muted)',
                border: '1px solid var(--corp-line)',
                borderRadius: 4,
                fontFamily: 'var(--corp-mono)',
              }}
            >
              ⌘K
            </kbd>
          </div>

          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--corp-surface-2)]"
            style={{ color: 'var(--corp-ink-2)' }}
            data-testid="button-bell-desktop"
          >
            <Bell size={16} />
          </button>

          {canCreateExpense && (
            <button
              type="button"
              onClick={() => setLocation(`/add-expense?projectId=${projectId}`)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-semibold transition-colors"
              style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-topbar-add-expense"
            >
              <Plus size={14} />
              {t('prDet_expenseShort')}
            </button>
          )}
        </div>

        {/* Hero block */}
        <div className="px-8 pt-6 pb-4 flex items-start gap-5">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 80,
              height: 80,
              background: 'rgba(91,88,235,0.10)',
              color: 'var(--corp-accent)',
              borderRadius: 16,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.02em',
            }}
          >
            {desktopInitials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <StatusPill status={project.status} t={t} />
              <span
                className="text-[12px]"
                style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)', letterSpacing: '0.02em' }}
              >
                #PRJ-{desktopProjectIdShort}
              </span>
            </div>
            <h1
              className="text-[32px] font-bold leading-tight truncate"
              style={{ color: 'var(--corp-ink)', letterSpacing: '-0.6px' }}
              data-testid="text-project-title-desktop"
            >
              {project.name}
              {project.location ? (
                <span style={{ color: 'var(--corp-muted)', fontWeight: 600 }}> · {project.location}</span>
              ) : null}
            </h1>
            <div
              className="text-[13px] mt-1.5 flex items-center gap-2 flex-wrap"
              style={{ color: 'var(--corp-muted)' }}
            >
              {project.endDate && (
                <span style={{ fontFamily: 'var(--corp-mono)' }}>{t('prDet_untilWord')} {fmtDate(project.endDate, language)}</span>
              )}
              {project.endDate && uniqueUsers.length > 0 && <span>·</span>}
              {uniqueUsers.length > 0 && (
                <span>
                  <span style={{ fontFamily: 'var(--corp-mono)' }}>{uniqueUsers.length}</span> {t('prDet_participants')}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isAdminOrDirector && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 h-10 px-3.5 text-[13px] font-semibold transition-colors"
                    style={{
                      background: 'var(--corp-surface)',
                      color: 'var(--corp-ink)',
                      border: '1px solid var(--corp-line)',
                      borderRadius: 'var(--corp-r)',
                    }}
                    data-testid="button-edit-desktop"
                  >
                    <Pencil size={14} />
                    {t('edit')}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setLocation(`/history/${projectId}`)} data-testid="menu-history-desktop">
                    <History className="h-4 w-4 mr-2" />
                    {t('prDet_changesHistory')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchive()} data-testid="menu-archive-desktop">
                    {project.status === 'archived' ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        {t('prDet_unarchive')}
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        {t('prDet_archiveAction')}
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsDeleteDialogOpen(true)}
                    style={{ color: 'var(--corp-neg)' }}
                    data-testid="menu-delete-project-desktop"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('prDet_deleteProject')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {canCreateExpense && (
              <button
                type="button"
                onClick={() => setLocation(`/add-expense?projectId=${projectId}`)}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 text-[13px] font-semibold transition-colors"
                style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-accent-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-accent)'; }}
                data-testid="button-hero-add-expense"
              >
                <Plus size={14} />
                {t('prDet_expenseShort')}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          className="px-8 flex items-end gap-6"
          style={{ borderBottom: '1px solid var(--corp-line)' }}
        >
          {tabsConfig.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className="h-12 inline-flex items-center text-[13px] font-semibold transition-colors"
                style={{
                  color: isActive ? 'var(--corp-ink)' : 'var(--corp-muted)',
                  borderBottom: isActive ? '2px solid var(--corp-ink)' : '2px solid transparent',
                  marginBottom: -1,
                }}
                data-testid={`tab-${tab.key}`}
              >
                {tab.label}
                {tab.count != null && (
                  <span
                    className="ml-1.5"
                    style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-muted)' }}
                  >
                    · {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* === DESKTOP CONTENT (hidden lg:block) ==================== */}
      <div className="hidden lg:block px-8 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-3 gap-5">
            {/* LEFT (2 cols) */}
            <div className="col-span-2 space-y-5">
              {/* Прогресс проекта */}
              <div
                className="p-5"
                style={{
                  background: 'var(--corp-surface)',
                  border: '1px solid var(--corp-line)',
                  borderRadius: 'var(--corp-r-lg)',
                }}
              >
                <h3
                  className="text-[14px] font-bold mb-4"
                  style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
                >
                  {t('prDet_projectProgress')}
                </h3>
                <div className="flex items-center gap-6">
                  <ProgressRing value={desktopRatio} color={desktopRingColor} size={96} />
                  <div className="grid grid-cols-3 gap-6 flex-1">
                    {project.startDate && (
                      <div>
                        <div
                          className="text-[10px] font-bold uppercase mb-1"
                          style={{ color: 'var(--corp-muted)', letterSpacing: '0.06em' }}
                        >
                          {t('prDet_start')}
                        </div>
                        <div
                          className="text-[15px] font-bold"
                          style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}
                        >
                          {fmtDate(project.startDate, language)}
                        </div>
                      </div>
                    )}
                    {project.endDate && (
                      <div>
                        <div
                          className="text-[10px] font-bold uppercase mb-1"
                          style={{ color: 'var(--corp-muted)', letterSpacing: '0.06em' }}
                        >
                          {t('prDet_deadlineWord')}
                        </div>
                        <div
                          className="text-[15px] font-bold"
                          style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}
                        >
                          {fmtDate(project.endDate, language)}
                        </div>
                      </div>
                    )}
                    {desktopDaysLeft != null && (
                      <div>
                        <div
                          className="text-[10px] font-bold uppercase mb-1"
                          style={{ color: 'var(--corp-muted)', letterSpacing: '0.06em' }}
                        >
                          {t('prDet_daysLeft')}
                        </div>
                        <div
                          className="text-[15px] font-bold"
                          style={{
                            color: desktopDaysLeft < 7 ? 'var(--corp-neg)' : 'var(--corp-ink)',
                            fontFamily: 'var(--corp-mono)',
                          }}
                        >
                          {desktopDaysLeft}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Последние расходы */}
              {isAdminOrDirector && (
                <div
                  className="p-5"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                  }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3
                      className="text-[14px] font-bold"
                      style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
                    >
                      {t('recentExpenses')}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('expenses')}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold"
                      style={{ color: 'var(--corp-accent)' }}
                      data-testid="button-all-expenses-overview"
                    >
                      {t('all')} <ChevronRight size={14} />
                    </button>
                  </div>
                  {desktopRecentExpenses.length === 0 ? (
                    <p className="text-center py-6 text-[13px]" style={{ color: 'var(--corp-muted)' }}>
                      {t('prDet_noExpensesYet')}
                    </p>
                  ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--corp-line)' }}>
                      {desktopRecentExpenses.map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center gap-3 py-3"
                          style={{ borderTop: 'none' }}
                        >
                          <div
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                              width: 32,
                              height: 32,
                              background: 'var(--corp-surface-2)',
                              color: 'var(--corp-ink-2)',
                              borderRadius: 'var(--corp-r)',
                            }}
                          >
                            <Receipt size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-[13px] font-semibold truncate"
                              style={{ color: 'var(--corp-ink)' }}
                            >
                              {expense.description || getCategoryLabel(expense.category, t)}
                            </div>
                            <div
                              className="text-[11px] truncate"
                              style={{ color: 'var(--corp-muted)' }}
                            >
                              {getCategoryLabel(expense.category, t)} · {expense.user?.name || t('unknownUser')} ·{' '}
                              <span style={{ fontFamily: 'var(--corp-mono)' }}>{fmtDate(expense.createdAt, language)}</span>
                            </div>
                          </div>
                          <MoneyAED amount={expense.amount} size={14} weight={700} tone="neg" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT (1 col) */}
            <div className="col-span-1 space-y-5">
              {/* Финансы */}
              {financialSummary && isAdminOrDirector && (
                <div
                  className="p-5"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                  }}
                >
                  <h3
                    className="text-[11px] font-bold uppercase mb-3"
                    style={{ color: 'var(--corp-muted)', letterSpacing: '0.06em' }}
                  >
                    {t('prDet_finances')}
                  </h3>
                  <DesktopFinanceRow label={t('cost')} amount={financialSummary.totalCost} tone="ink" />
                  <DesktopFinanceRow label={t('prDet_received')} amount={financialSummary.totalCustomerAdvances} tone="pos" />
                  <DesktopFinanceRow label={t('expenses')} amount={financialSummary.totalExpenses} tone="neg" />
                  <DesktopFinanceRow label={t('prDet_teamAdvances')} amount={financialSummary.totalAdvances} tone="neg" />
                  <DesktopFinanceRow
                    label={t('profit')}
                    amount={financialSummary.currentProfit}
                    tone={parseFloat(financialSummary.currentProfit) >= 0 ? 'pos' : 'neg'}
                    isLast
                  />
                </div>
              )}

              {/* Команда */}
              {uniqueUsers.length > 0 && (
                <div
                  className="p-5"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                  }}
                >
                  <h3
                    className="text-[11px] font-bold uppercase mb-2"
                    style={{ color: 'var(--corp-muted)', letterSpacing: '0.06em' }}
                  >
                    {t('prDet_teamLabel')}
                  </h3>
                  <div>
                    {uniqueUsers.map((name) => (
                      <TeamMemberRow key={name as string} name={name as string} role={t('prDet_memberRole')} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* === DESKTOP: Documents tab — полноценный UI ============ */}
        {activeTab === 'documents' && canViewDocuments && (
          <div
            className="p-5"
            style={{
              background: 'var(--corp-surface)',
              border: '1px solid var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>
                {t('documents')}
              </h3>
              {canUploadDocs && (
                <FileUploader
                  onUpload={handleFilesUpload}
                  maxFiles={5}
                  maxFileSize={50 * 1024 * 1024}
                  accept="*/*"
                >
                  <Plus size={14} className="mr-1" />
                  {t('addDocument') || 'Add Document'}
                </FileUploader>
              )}
            </div>
            {documents.length === 0 ? (
              <p className="text-center py-8 text-[13px]" style={{ color: 'var(--corp-muted)' }}>
                {t('prDet_noDocuments')}
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center p-3 gap-3"
                    style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}
                  >
                    <div
                      className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(37,99,235,0.10)', borderRadius: 'var(--corp-r-sm)' }}
                    >
                      <FileText size={16} style={{ color: 'var(--corp-accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>{doc.name}</p>
                      <p className="text-[11px] truncate" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                        {formatFileSize(doc.fileSize)} • {doc.mimeType}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleViewDocument(doc)}
                        className="w-8 h-8 flex items-center justify-center rounded"
                        style={{ color: 'var(--corp-accent)' }}
                        title={t('prDet_viewDoc')}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadDocument(doc)}
                        className="w-8 h-8 flex items-center justify-center rounded"
                        style={{ color: 'var(--corp-pos)' }}
                        title={t('prDet_downloadDoc')}
                      >
                        <Download size={15} />
                      </button>
                      {isAdminOrDirector && doc.fileName.toLowerCase().startsWith('invoice') && (
                        <button
                          type="button"
                          onClick={() => handleCreateSheetFromInvoice(doc)}
                          className="w-8 h-8 flex items-center justify-center rounded"
                          style={{ color: '#9333ea' }}
                          title={t('prDet_createSheetFromInvoiceTitle')}
                        >
                          <Upload size={15} />
                        </button>
                      )}
                      {canDeleteDocs && (
                        <button
                          type="button"
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="w-8 h-8 flex items-center justify-center rounded"
                          style={{ color: 'var(--corp-neg)' }}
                          title={t('prDet_deleteDoc')}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === DESKTOP: остальные не-overview вкладки ============== */}
        {activeTab !== 'overview' && activeTab !== 'documents' && (
          <div
            className="p-6 text-center text-[13px]"
            style={{
              background: 'var(--corp-surface)',
              border: '1px solid var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
              color: 'var(--corp-muted)',
            }}
          >
            {activeTab === 'expenses' && (
              <button
                type="button"
                onClick={() => setLocation(`/expenses/${projectId}`)}
                className="inline-flex items-center gap-2 text-[13px] font-semibold"
                style={{ color: 'var(--corp-accent)' }}
              >
                {t('prDet_openFullExpenses')} <ChevronRight size={14} />
              </button>
            )}
            {activeTab === 'team' && (
              <span>{t('prDet_membersInOverviewNote')}</span>
            )}
            {activeTab === 'timeline' && (
              <button
                type="button"
                onClick={() => setLocation(`/history/${projectId}`)}
                className="inline-flex items-center gap-2 text-[13px] font-semibold"
                style={{ color: 'var(--corp-accent)' }}
              >
                {t('prDet_openChangesHistory')} <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* === MOBILE CONTENT (lg:hidden) =========================== */}
      <div className="lg:hidden p-4 space-y-3">
        {/* === MOBILE HERO CARD (lg:hidden) ====================== */}
        <MobileProjectHero
          project={project}
          financialSummary={financialSummary}
          teamCount={uniqueUsers.length}
          t={t}
          language={language}
        />

        {/* === MOBILE 2x2 ACTION GRID (lg:hidden) ================ */}
        <div className="lg:hidden grid grid-cols-2 gap-2">
          {canCreateExpense && (
            <MobileActionTile
              onClick={() => setLocation(`/add-expense?projectId=${projectId}`)}
              icon={<Plus size={16} />}
              label={t('prDet_expenseShort')}
              variant="primary"
              testId="button-add-expense-mobile"
            />
          )}
          {canViewImplSheets && (
            <MobileActionTile
              onClick={() => setLocation(`/projects/${projectId}/implementation-sheets`)}
              icon={<FileText size={16} />}
              label={t('prDet_implSheetShort')}
              variant="ghost"
              testId="button-impl-sheets-mobile"
            />
          )}
          {isAdminOrDirector && (
            <MobileActionTile
              onClick={() => setIsAssignClientModalOpen(true)}
              icon={<User size={16} />}
              label={t('customer')}
              variant="ghost"
              testId="button-assign-client-mobile"
            />
          )}
          {isAdminOrDirector && project?.status !== 'archived' && financialSummary && (
            <MobileActionTile
              onClick={() => setIsCompleteProjectDialogOpen(true)}
              icon={<CheckCircle size={16} />}
              label={t('prDet_complete')}
              variant="ghost"
              testId="button-complete-mobile"
            />
          )}
        </div>

        {isAdminOrDirector && (
          <div className="lg:hidden flex justify-end">
            <VoiceExpenseButton
              currentProjectId={projectId}
              onExpenseCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'expenses'] });
                queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
              }}
            />
          </div>
        )}

        {/* === DESKTOP ACTION BUTTONS (hidden lg:flex) ============ */}
        <div className="hidden lg:flex flex-col gap-2">
          {canCreateExpense && (
            <button
              type="button"
              onClick={() => setLocation(`/add-expense?projectId=${projectId}`)}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 text-[13px] font-semibold transition-colors"
              style={PRIMARY_BTN}
              data-testid="button-add-expense"
            >
              <Plus size={16} />
              {t('addExpense')}
            </button>
          )}

          {canViewImplSheets && (
            <button
              type="button"
              onClick={() => setLocation(`/projects/${projectId}/implementation-sheets`)}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 text-[13px] font-semibold transition-colors"
              style={GHOST_BTN}
              data-testid="button-implementation-sheets"
            >
              <FileText size={16} style={{ color: 'var(--corp-pos)' }} />
              {t('prDet_implSheetsTitle')}
            </button>
          )}

          {isAdminOrDirector && (
            <>
              <button
                type="button"
                onClick={() => setIsAssignClientModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 h-11 px-4 text-[13px] font-semibold transition-colors"
                style={GHOST_BTN}
                data-testid="button-assign-client"
              >
                <Plus size={16} style={{ color: 'var(--corp-accent)' }} />
                {t('assignCustomer')}
              </button>

              {project?.status !== 'archived' && financialSummary && (
                <button
                  type="button"
                  onClick={() => setIsCompleteProjectDialogOpen(true)}
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 text-[13px] font-semibold transition-colors"
                  style={{ background: 'rgba(22,163,74,0.10)', color: 'var(--corp-pos)', borderRadius: 'var(--corp-r)' }}
                  data-testid="button-complete-project"
                >
                  <CheckCircle size={16} />
                  {t('prDet_projectCompletedBtn')}
                </button>
              )}

              <div className="flex justify-end mt-1">
                <VoiceExpenseButton
                  currentProjectId={projectId}
                  onExpenseCreated={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'expenses'] });
                    queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Financial Summary */}
        {financialSummary && isAdminOrDirector && (
          <div className="p-4" style={SECTION_STYLE}>
            <Collapsible open={isFinancialSummaryOpen} onOpenChange={setIsFinancialSummaryOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>
                    {t('financialSummary')}
                  </h3>
                  <div className="w-8 h-8 flex items-center justify-center" style={{ color: 'var(--corp-ink-3)' }}>
                    {isFinancialSummaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="space-y-2 mt-3">
                  <Row label={t('prDet_costByContract')} amount={financialSummary.totalCost} tone="ink" />

                  <Row
                    label={t('prDet_customerAdvanceLabel')}
                    amount={financialSummary.totalCustomerAdvances}
                    tone="pos"
                    onClick={() => setLocation(`/customer-advances/${projectId}`)}
                    actions={isAdminOrDirector ? (
                      <>
                        <button
                          type="button"
                          className="p-1 rounded"
                          style={{ color: 'var(--corp-accent)' }}
                          onClick={(e) => { e.stopPropagation(); setLocation(`/add-customer-advance/${projectId}`); }}
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded ml-1"
                          style={{ color: 'var(--corp-ink-3)' }}
                          onClick={(e) => { e.stopPropagation(); setLocation(`/customer-advances/${projectId}`); }}
                        >
                          <Edit size={14} />
                        </button>
                      </>
                    ) : undefined}
                  />

                  <Row
                    label={t('prDet_takenAdvancesLabel')}
                    amount={financialSummary.totalAdvances}
                    tone="neg"
                    onClick={() => setLocation(`/advances/${projectId}`)}
                    actions={isAdminOrDirector ? (
                      <>
                        <button
                          type="button"
                          className="p-1 rounded"
                          style={{ color: 'var(--corp-accent)' }}
                          onClick={(e) => { e.stopPropagation(); setLocation(`/add-advance/${projectId}`); }}
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded ml-1"
                          style={{ color: 'var(--corp-ink-3)' }}
                          onClick={(e) => { e.stopPropagation(); setLocation(`/advances/${projectId}`); }}
                        >
                          <Edit size={14} />
                        </button>
                      </>
                    ) : undefined}
                  />

                  <Row
                    label={t('prDet_ownInvestmentsLabel')}
                    amount={financialSummary.totalOwnerInvestments}
                    tone="neg"
                    onClick={() => setLocation(`/owner-investments/${projectId}`)}
                    actions={isAdminOrDirector ? (
                      <>
                        <button
                          type="button"
                          className="p-1 rounded"
                          style={{ color: 'var(--corp-accent)' }}
                          onClick={(e) => { e.stopPropagation(); setLocation(`/add-owner-investment/${projectId}`); }}
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded ml-1"
                          style={{ color: 'var(--corp-ink-3)' }}
                          onClick={(e) => { e.stopPropagation(); setLocation(`/owner-investments/${projectId}`); }}
                        >
                          <Edit size={14} />
                        </button>
                      </>
                    ) : undefined}
                  />

                  <Row
                    label={t('prDet_projectExpensesLabel')}
                    amount={financialSummary.totalExpenses}
                    tone="neg"
                    onClick={() => setLocation(`/expenses/${projectId}`)}
                    actions={isAdminOrDirector ? (
                      <>
                        <button
                          type="button"
                          className="p-1 rounded"
                          style={{ color: 'var(--corp-accent)' }}
                          onClick={(e) => { e.stopPropagation(); setLocation(`/add-expense?projectId=${projectId}`); }}
                        >
                          <Plus size={14} />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded ml-1"
                          style={{ color: 'var(--corp-ink-3)' }}
                          onClick={(e) => { e.stopPropagation(); setLocation(`/expenses/${projectId}`); }}
                        >
                          <Edit size={14} />
                        </button>
                      </>
                    ) : undefined}
                  />

                  <div style={{ height: 1, background: 'var(--corp-line)', margin: '8px 0' }} />

                  <div
                    className="flex justify-between items-center px-3 py-3"
                    style={{ background: 'rgba(37,99,235,0.06)', borderRadius: 'var(--corp-r)', border: '1px solid rgba(37,99,235,0.18)' }}
                  >
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--corp-accent)' }}>
                      {t('prDet_currentProfitLabel')}
                    </span>
                    <MoneyAED
                      amount={financialSummary.currentProfit}
                      size={16}
                      weight={700}
                      tone={parseFloat(financialSummary.currentProfit) >= 0 ? 'pos' : 'neg'}
                    />
                  </div>

                  <div
                    className="flex justify-between items-center px-3 py-3"
                    style={{ background: 'rgba(22,163,74,0.06)', borderRadius: 'var(--corp-r)', border: '1px solid rgba(22,163,74,0.18)' }}
                  >
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--corp-pos)' }}>
                      {t('prDet_projectedProfitLabel')}
                    </span>
                    <MoneyAED
                      amount={financialSummary.projectedProfit}
                      size={16}
                      weight={700}
                      tone={parseFloat(financialSummary.projectedProfit) >= 0 ? 'pos' : 'neg'}
                    />
                  </div>
                </div>

                {isAdminOrDirector && (
                  <button
                    type="button"
                    className="w-full mt-4 inline-flex items-center justify-center gap-2 h-9 text-[12px] font-semibold transition-colors"
                    style={GHOST_BTN}
                    onClick={() => {
                      toast({
                        title: t('exportPDF'),
                        description: t('prDet_pdfExportSoon'),
                      });
                    }}
                  >
                    <Download size={14} />
                    {t('exportPDF')}
                  </button>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Client Payment Information */}
        {user?.role === 'client' && project && (
          <div className="p-4" style={SECTION_STYLE}>
            <Collapsible open={isPaymentsOpen} onOpenChange={setIsPaymentsOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>
                    {t('prDet_paymentsInfo')}
                  </h3>
                  <div className="w-8 h-8 flex items-center justify-center" style={{ color: 'var(--corp-ink-3)' }}>
                    {isPaymentsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="space-y-2 mt-3">
                  <Row label={t('prDet_costOfProject')} amount={project.totalCost} tone="ink" />
                  <Row label={t('paid')} amount={String(totalPaid)} tone="pos" />
                  <Row label={t('prDet_remainingToPay')} amount={String(remainingToPay)} tone={remainingToPay > 0 ? 'neg' : 'pos'} />
                </div>

                {clientPayments.length > 0 && (
                  <div className="mt-5">
                    <h4 className="text-[12px] font-bold uppercase mb-2" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                      {t('prDet_paymentsHistory')}
                    </h4>
                    <div className="space-y-2">
                      {clientPayments.map((payment) => (
                        <div
                          key={payment.id}
                          className="p-3"
                          style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <MoneyAED amount={payment.amount} size={14} weight={700} tone="pos" />
                                {payment.paymentMethod && (
                                  <span
                                    className="text-[10px] px-2 py-0.5"
                                    style={{ background: 'var(--corp-surface)', color: 'var(--corp-ink-3)', borderRadius: 'var(--corp-r-sm)' }}
                                  >
                                    {payment.paymentMethod}
                                  </span>
                                )}
                              </div>
                              {payment.description && (
                                <p className="text-[12px] mt-1" style={{ color: 'var(--corp-ink-3)' }}>{payment.description}</p>
                              )}
                            </div>
                            <span
                              className="text-[11px]"
                              style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)', whiteSpace: 'nowrap' }}
                            >
                              {fmtDate(payment.paymentDate, language)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}

        {/* Project Documents — гейтим всю секцию по documents.view */}
        {canViewDocuments && (
        <div className="p-4" style={SECTION_STYLE}>
          <Collapsible open={isDocumentsOpen} onOpenChange={setIsDocumentsOpen}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between cursor-pointer">
                <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>{t('documents')}</h3>
                <div className="w-8 h-8 flex items-center justify-center" style={{ color: 'var(--corp-ink-3)' }}>
                  {isDocumentsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="mt-3">
                {canUploadDocs && (
                  <div className="mb-3 flex justify-end">
                    <FileUploader
                      onUpload={handleFilesUpload}
                      maxFiles={5}
                      maxFileSize={50 * 1024 * 1024}
                      accept="*/*"
                    >
                      <Plus size={14} className="mr-1" />
                      {t('addDocument') || 'Add Document'}
                    </FileUploader>
                  </div>
                )}
                {documents.length === 0 ? (
                  <p className="text-center py-6 text-[13px]" style={{ color: 'var(--corp-muted)' }}>{t('prDet_noDocuments')}</p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center p-3 gap-3"
                        style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}
                      >
                        <div
                          className="w-9 h-9 flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(37,99,235,0.10)', borderRadius: 'var(--corp-r-sm)' }}
                        >
                          <FileText size={16} style={{ color: 'var(--corp-accent)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>{doc.name}</p>
                          <p className="text-[11px] truncate" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                            {formatFileSize(doc.fileSize)} • {doc.mimeType}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleViewDocument(doc)}
                            className="w-8 h-8 flex items-center justify-center rounded"
                            style={{ color: 'var(--corp-accent)' }}
                            title={t('prDet_viewDoc')}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            className="w-8 h-8 flex items-center justify-center rounded"
                            style={{ color: 'var(--corp-pos)' }}
                            title={t('prDet_downloadDoc')}
                          >
                            <Download size={15} />
                          </button>
                          {isAdminOrDirector && doc.fileName.toLowerCase().startsWith('invoice') && (
                            <button
                              type="button"
                              onClick={() => handleCreateSheetFromInvoice(doc)}
                              className="w-8 h-8 flex items-center justify-center rounded"
                              style={{ color: '#9333ea' }}
                              title={t('prDet_createSheetFromInvoiceTitle')}
                            >
                              <Upload size={15} />
                            </button>
                          )}
                          {canDeleteDocs && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="w-8 h-8 flex items-center justify-center rounded"
                              style={{ color: 'var(--corp-neg)' }}
                              title={t('prDet_deleteDoc')}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
        )}

        {/* Project Expenses — гейтим по expenses.view_all/own */}
        {canViewExpenses && (
          <div className="p-4" style={SECTION_STYLE}>
            <Collapsible open={isExpensesOpen} onOpenChange={setIsExpensesOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>{t('prDet_projectExpensesLabel')}</h3>
                    {financialSummary && (
                      <MoneyAED amount={financialSummary.totalExpenses} size={13} weight={700} tone="neg" />
                    )}
                  </div>
                  <div className="w-8 h-8 flex items-center justify-center" style={{ color: 'var(--corp-ink-3)' }}>
                    {isExpensesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-3">
                  <div className="mb-3 flex justify-end gap-2">
                    {canCreateExpense && (
                      <button
                        type="button"
                        onClick={() => setLocation(`/add-expense?projectId=${projectId}`)}
                        className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold"
                        style={PRIMARY_BTN}
                      >
                        <Plus size={14} /> {t('addExpense')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLocation(`/expenses/${projectId}`)}
                      className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold"
                      style={GHOST_BTN}
                    >
                      <Edit size={14} /> {t('prDet_manage')}
                    </button>
                  </div>

                  {expenses.length > 0 ? (
                    <div>
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[11px] font-bold uppercase" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                            {t('prDet_expensesHistory')}
                          </h4>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (expensesSortBy === 'date') {
                                  setExpensesSortOrder(expensesSortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setExpensesSortBy('date');
                                  setExpensesSortOrder('desc');
                                }
                              }}
                              className="inline-flex items-center gap-0.5 h-7 px-2 text-[11px] font-semibold"
                              style={expensesSortBy === 'date' ? DARK_BTN : GHOST_BTN}
                            >
                              <Calendar size={11} />
                              {expensesSortBy === 'date' && (
                                <ArrowUpDown size={10} className={`ml-0.5 ${expensesSortOrder === 'desc' ? 'rotate-180' : ''}`} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (expensesSortBy === 'amount') {
                                  setExpensesSortOrder(expensesSortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setExpensesSortBy('amount');
                                  setExpensesSortOrder('desc');
                                }
                              }}
                              className="inline-flex items-center gap-0.5 h-7 px-2 text-[11px] font-semibold"
                              style={expensesSortBy === 'amount' ? DARK_BTN : GHOST_BTN}
                            >
                              <DollarSign size={11} />
                              {expensesSortBy === 'amount' && (
                                <ArrowUpDown size={10} className={`ml-0.5 ${expensesSortOrder === 'desc' ? 'rotate-180' : ''}`} />
                              )}
                            </button>
                          </div>
                        </div>

                        {uniqueUsers.length > 1 && (
                          <div className="flex items-center gap-2">
                            <User size={13} style={{ color: 'var(--corp-ink-3)' }} />
                            <Select value={expensesFilterByUser} onValueChange={setExpensesFilterByUser}>
                              <SelectTrigger className="h-8 text-[12px] flex-1 max-w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{t('prDet_allUsersTpl').replace('{count}', String(expenses.length))}</SelectItem>
                                {uniqueUsers.map(userName => {
                                  const cnt = expenses.filter(e => e.user?.name === userName).length;
                                  return (
                                    <SelectItem key={userName} value={userName!}>
                                      {userName} ({cnt})
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 max-h-72 overflow-y-auto">
                        {filteredAndSortedExpenses.slice(0, 10).map((expense) => (
                          <div
                            key={expense.id}
                            className="flex items-center justify-between p-3 gap-3"
                            style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink)' }}>
                                  {getCategoryLabel(expense.category, t)}
                                </span>
                                <span className="text-[11px]" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                                  {fmtDate(expense.createdAt, language)}
                                </span>
                              </div>
                              <p className="text-[12px] truncate" style={{ color: 'var(--corp-ink-3)' }}>
                                {expense.description || t('prDet_noDescription')}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <User size={10} style={{ color: 'var(--corp-muted)' }} />
                                <span className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                                  {expense.user?.name || t('unknownUser')}
                                </span>
                              </div>
                            </div>
                            <MoneyAED amount={expense.amount} size={14} weight={700} tone="neg" />
                          </div>
                        ))}
                        {filteredAndSortedExpenses.length > 10 && (
                          <button
                            type="button"
                            className="w-full text-[12px] py-2 transition-colors"
                            style={{ color: 'var(--corp-ink-3)' }}
                            onClick={() => setLocation(`/expenses/${projectId}`)}
                          >
                            {t('prDet_showAllTpl').replace('{count}', String(filteredAndSortedExpenses.length))}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-6 text-[13px]" style={{ color: 'var(--corp-muted)' }}>{t('prDet_noProjectExpenses')}</p>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>

      {/* Assign Client Modal */}
      <AssignClientModal
        isOpen={isAssignClientModalOpen}
        onClose={() => setIsAssignClientModalOpen(false)}
        projectId={projectId}
      />

      {/* Delete Project */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('prDet_deleteProject')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('prDet_deleteProjectConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              style={{ background: 'var(--corp-neg)', color: '#fff' }}
              data-testid="button-confirm-delete"
            >
              {t('prDet_deleteProject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Implementation Sheet from Invoice */}
      <Dialog open={isCreateSheetDialogOpen} onOpenChange={setIsCreateSheetDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('prDet_createSheetFromInvoiceTitle')}</DialogTitle>
            <DialogDescription>
              {t('prDet_autoCreateSheetDescTpl').replace('{name}', selectedInvoiceDoc?.name || '')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="p-4" style={SECTION_STYLE}>
              <h4 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>{t('prDet_howItWorks')}</h4>
              <div className="space-y-2 text-[13px]">
                {[
                  t('prDet_step1'),
                  t('prDet_step2'),
                  t('prDet_step3'),
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold flex-shrink-0"
                      style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)', borderRadius: '50%', fontFamily: 'var(--corp-mono)' }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ color: 'var(--corp-ink-2)' }}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmitCreateSheet} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sheet-name">{t('prDet_sheetNameLabel')}</Label>
                <Input
                  id="sheet-name"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder={t('prDet_sheetNamePlaceholder')}
                  data-testid="input-sheet-name"
                  required
                />
              </div>

              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>{t('prDet_supportedFormats')}</strong> PDF, XLSX, XLS, CSV
                </AlertDescription>
              </Alert>

              {parseResult && parseResult.error && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <div className="font-medium">{parseResult.error}</div>
                      {parseResult.details && (
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {parseResult.details.map((detail: string, index: number) => (
                            <li key={index}>{detail}</li>
                          ))}
                        </ul>
                      )}
                      {parseResult.suggestColumnMapping && (
                        <div className="mt-2 text-sm">
                          <div className="font-medium">{t('prDet_recommendations')}</div>
                          <ul className="list-disc list-inside space-y-1">
                            <li>{t('prDet_recCheck')}</li>
                            <li>{t('prDet_recColumns')}</li>
                            <li>{t('prDet_recOtherFormat')}</li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateSheetDialogOpen(false)}
                  className="flex-1 h-10 text-[13px] font-semibold transition-colors"
                  style={GHOST_BTN}
                  data-testid="button-cancel"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={createSheetFromInvoiceMutation.isPending || !selectedInvoiceDoc || !sheetName.trim()}
                  className="flex-1 h-10 text-[13px] font-semibold transition-colors disabled:opacity-50"
                  style={PRIMARY_BTN}
                  data-testid="button-create-sheet"
                >
                  {createSheetFromInvoiceMutation.isPending ? t('creatingShort') : t('prDet_createSheet')}
                </button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Project */}
      <Dialog open={isCompleteProjectDialogOpen} onOpenChange={setIsCompleteProjectDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" style={{ color: 'var(--corp-pos)' }} />
              {t('prDet_projectCompletion')}
            </DialogTitle>
            <DialogDescription>
              {t('prDet_finalProfitCalcTpl').replace('{name}', project?.name || '')}
            </DialogDescription>
          </DialogHeader>

          {financialSummary && (
            <div className="space-y-3">
              <div className="p-4" style={SECTION_STYLE}>
                <h4 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>{t('prDet_projectTotals')}</h4>
                <div className="space-y-2">
                  <Row label={t('prDet_costOfProject')} amount={financialSummary.totalCost} tone="ink" />
                  <Row label={t('prDet_receivedFromCustomer')} amount={financialSummary.totalCustomerAdvances} tone="pos" />
                  <Row label={t('totalExpenses')} amount={financialSummary.totalExpenses} tone="neg" />
                  <Row label={t('prDet_advancesTaken')} amount={financialSummary.totalAdvances} tone="neg" />
                  <div style={{ height: 1, background: 'var(--corp-line)', margin: '8px 0' }} />
                  {(() => {
                    const profit = parseFloat(financialSummary.totalCustomerAdvances) - parseFloat(financialSummary.totalExpenses);
                    return (
                      <div className="flex justify-between items-center px-3 py-3" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                        <span className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>{t('prDet_finalProfit')}</span>
                        <MoneyAED amount={profit} size={18} weight={700} tone={profit >= 0 ? 'pos' : 'neg'} />
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-4" style={SECTION_STYLE}>
                <h4 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>{t('prDet_profitDistribution')}</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3" style={{ background: 'rgba(37,99,235,0.06)', borderRadius: 'var(--corp-r)' }}>
                    <div className="text-[11px] mb-1" style={{ color: 'var(--corp-ink-3)' }}>{t('prDet_vladEarnings')}</div>
                    <MoneyAED
                      amount={financialSummary.vladEarnings || '0'}
                      size={20}
                      weight={700}
                      tone={parseFloat(financialSummary.vladEarnings || '0') >= 0 ? 'pos' : 'neg'}
                    />
                    {parseFloat(financialSummary.vladEarnings || '0') < 0 && (
                      <div className="text-[10px] mt-1" style={{ color: 'var(--corp-neg)' }}>{t('prDet_owedAdditional')}</div>
                    )}
                  </div>
                  <div className="p-3" style={{ background: 'rgba(147,51,234,0.06)', borderRadius: 'var(--corp-r)' }}>
                    <div className="text-[11px] mb-1" style={{ color: 'var(--corp-ink-3)' }}>{t('prDet_platonEarnings')}</div>
                    <MoneyAED
                      amount={financialSummary.platonEarnings || '0'}
                      size={20}
                      weight={700}
                      tone={parseFloat(financialSummary.platonEarnings || '0') >= 0 ? 'pos' : 'neg'}
                    />
                    {parseFloat(financialSummary.platonEarnings || '0') < 0 && (
                      <div className="text-[10px] mt-1" style={{ color: 'var(--corp-neg)' }}>{t('prDet_owedAdditional')}</div>
                    )}
                  </div>
                </div>

                <div className="text-[12px] p-3" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)', color: 'var(--corp-ink-3)' }}>
                  <div className="font-semibold mb-1" style={{ color: 'var(--corp-ink-2)' }}>{t('prDet_calculation')}</div>
                  <div>• {t('prDet_availableToDistribute')} {fmtNum(parseFloat(financialSummary.totalCustomerAdvances) - parseFloat(financialSummary.totalExpenses))} AED</div>
                  <div>• {t('prDet_perPerson')} {fmtNum((parseFloat(financialSummary.totalCustomerAdvances) - parseFloat(financialSummary.totalExpenses)) / 2)} AED</div>
                  <div>• {t('prDet_vladAdvanceTaken')} {fmtNum(parseFloat(financialSummary.vladAdvances || '0'))} AED</div>
                  <div>• {t('prDet_platonAdvanceTaken')} {fmtNum(parseFloat(financialSummary.platonAdvances || '0'))} AED</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCompleteProjectDialogOpen(false)}
              className="flex-1 h-10 text-[13px] font-semibold transition-colors"
              style={GHOST_BTN}
            >
              {t('close')}
            </button>
            <button
              type="button"
              onClick={() => {
                handleArchive();
                setIsCompleteProjectDialogOpen(false);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 h-10 text-[13px] font-semibold transition-colors"
              style={{ background: 'var(--corp-pos)', color: '#fff', borderRadius: 'var(--corp-r)' }}
            >
              <Archive className="w-4 h-4" />
              {t('prDet_archiveProject')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
