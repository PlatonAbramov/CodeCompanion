import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  MoreVertical, Download, Eye, Plus, Edit,
  FileText, Trash2, ChevronDown, ChevronUp,
  History, Archive, ArchiveRestore, Upload, ArrowUpDown,
  Calendar, DollarSign, User, Users, CheckCircle, AlertCircle
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
import { CorpHeader, MoneyAED, fmtNum, fmtDateRu } from "@/components/corp-ui";

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

function getCategoryLabel(category: string) {
  const categories: Record<string, string> = {
    'materials': 'Материалы',
    'labor': 'Работа',
    'transport': 'Транспорт',
    'equipment': 'Оборудование',
    'other': 'Прочее'
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

function getStatusInfo(status?: string): { label: string; bg: string; color: string; dot: string } {
  switch (status) {
    case 'completed':
      return { label: 'Завершён', bg: 'rgba(22,163,74,0.12)', color: '#15803d', dot: '#16a34a' };
    case 'paused':
      return { label: 'На паузе', bg: 'rgba(100,116,139,0.14)', color: '#475569', dot: '#64748b' };
    case 'archived':
      return { label: 'Архив', bg: 'rgba(100,116,139,0.10)', color: '#64748b', dot: '#94a3b8' };
    case 'active':
    default:
      return { label: 'В работе', bg: 'rgba(245,158,11,0.14)', color: '#b45309', dot: '#f59e0b' };
  }
}

function MobileProjectHero({
  project,
  financialSummary,
  teamCount,
}: {
  project: Project;
  financialSummary?: FinancialSummary;
  teamCount: number;
}) {
  const initials = getProjectInitials(project.name);
  const status = getStatusInfo(project.status);

  const totalCost = parseFloat(project.totalCost || '0');
  const totalExpenses = parseFloat(financialSummary?.totalExpenses || '0');
  const currentProfit = parseFloat(financialSummary?.currentProfit || '0');
  const isOverBudget = currentProfit < 0;
  const ratio = totalCost > 0 ? Math.min(100, (totalExpenses / totalCost) * 100) : 0;
  const progressPct = Math.round(ratio);
  const progressColor = isOverBudget ? 'var(--corp-neg)' : 'var(--corp-pos)';

  const dateRange = project.startDate && project.endDate
    ? `${fmtDateRu(project.startDate)} → ${fmtDateRu(project.endDate)}`
    : project.startDate
      ? fmtDateRu(project.startDate)
      : project.endDate
        ? `→ ${fmtDateRu(project.endDate)}`
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
                <span style={{ fontFamily: 'var(--corp-mono)' }}>{teamCount}</span> чел.
              </span>
            </div>
          )}
        </div>
      )}
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
  const { t } = useLanguage();
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

  const projectId = location.split('/')[2];

  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
  });

  const { data: financialSummary } = useQuery<FinancialSummary>({
    queryKey: ['/api/projects', projectId, 'financial-summary'],
    enabled: user?.role === 'admin' || user?.role === 'director',
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['/api/projects', projectId, 'expenses'],
    enabled: user?.role === 'admin' || user?.role === 'director',
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ['/api/projects', projectId, 'documents'],
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
      toast({ title: 'Успех', description: 'Проект удален успешно' });
      setLocation('/');
    },
    onError: (error) => {
      console.error('Delete project error:', error);
      toast({ title: 'Ошибка', description: 'Не удалось удалить проект', variant: 'destructive' });
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
        title: "Лист реализации создан",
        description: `Успешно создан лист "${result.sheet.name}" с ${result.parsedItems} позициями из ${result.format} документа`,
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
        title: "Ошибка создания листа",
        description: error.error || "Не удалось создать лист реализации из инвойса",
        variant: "destructive"
      });
    }
  });

  const handleCreateSheetFromInvoice = (doc: Document) => {
    if (!doc.fileName.toLowerCase().startsWith('invoice')) {
      toast({
        title: "Ошибка",
        description: "Можно создавать лист реализации только из документов, начинающихся с 'invoice'",
        variant: "destructive"
      });
      return;
    }
    setSelectedInvoiceDoc(doc);
    setSheetName(`Лист реализации - ${doc.name}`);
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
        title: "Успешно",
        description: project?.status === 'archived' ? "Проект разархивирован" : "Проект архивирован",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
    },
    onError: (error) => {
      console.error('Archive project error:', error);
      toast({ title: "Ошибка", description: "Не удалось изменить статус проекта", variant: "destructive" });
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

  const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingToPay = Number(project.totalCost) - totalPaid;

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }} data-page-header>
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
                  История изменений
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleArchive()} data-testid="menu-archive">
                  {project.status === 'archived' ? (
                    <>
                      <ArchiveRestore className="h-4 w-4 mr-2" />
                      Разархивировать
                    </>
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Архивировать
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsDeleteDialogOpen(true)}
                  style={{ color: 'var(--corp-neg)' }}
                  data-testid="menu-delete-project"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить проект
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : undefined
        }
      />

      <div className="p-4 space-y-3">
        {/* === MOBILE HERO CARD (lg:hidden) ====================== */}
        <MobileProjectHero
          project={project}
          financialSummary={financialSummary}
          teamCount={uniqueUsers.length}
        />

        {/* === MOBILE 2x2 ACTION GRID (lg:hidden) ================ */}
        <div className="lg:hidden grid grid-cols-2 gap-2">
          {user?.role !== 'client' && (
            <MobileActionTile
              onClick={() => setLocation(`/add-expense?projectId=${projectId}`)}
              icon={<Plus size={16} />}
              label="Расход"
              variant="primary"
              testId="button-add-expense-mobile"
            />
          )}
          <MobileActionTile
            onClick={() => setLocation(`/projects/${projectId}/implementation-sheets`)}
            icon={<FileText size={16} />}
            label="Лист реализ."
            variant="ghost"
            testId="button-impl-sheets-mobile"
          />
          {isAdminOrDirector && (
            <MobileActionTile
              onClick={() => setIsAssignClientModalOpen(true)}
              icon={<User size={16} />}
              label="Заказчик"
              variant="ghost"
              testId="button-assign-client-mobile"
            />
          )}
          {isAdminOrDirector && project?.status !== 'archived' && financialSummary && (
            <MobileActionTile
              onClick={() => setIsCompleteProjectDialogOpen(true)}
              icon={<CheckCircle size={16} />}
              label="Завершить"
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
          {user?.role !== 'client' && (
            <button
              type="button"
              onClick={() => setLocation(`/add-expense?projectId=${projectId}`)}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 text-[13px] font-semibold transition-colors"
              style={PRIMARY_BTN}
              data-testid="button-add-expense"
            >
              <Plus size={16} />
              Добавить расход
            </button>
          )}

          <button
            type="button"
            onClick={() => setLocation(`/projects/${projectId}/implementation-sheets`)}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 text-[13px] font-semibold transition-colors"
            style={GHOST_BTN}
            data-testid="button-implementation-sheets"
          >
            <FileText size={16} style={{ color: 'var(--corp-pos)' }} />
            Листы реализации
          </button>

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
                Назначить заказчика
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
                  Проект завершён
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
                  <Row label="Стоимость проекта по договору" amount={financialSummary.totalCost} tone="ink" />

                  <Row
                    label="Аванс от заказчика"
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
                    label="Взятые авансы (Влад + Платон)"
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
                    label="Вложили из своих (Влад + Платон)"
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
                    label="Расходы на проект"
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
                      Прибыль на данный момент
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
                      Прогнозируемая прибыль
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
                        title: "Экспорт в PDF",
                        description: "Функция экспорта в PDF будет реализована в следующем обновлении",
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
                    Информация о платежах
                  </h3>
                  <div className="w-8 h-8 flex items-center justify-center" style={{ color: 'var(--corp-ink-3)' }}>
                    {isPaymentsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="space-y-2 mt-3">
                  <Row label="Стоимость проекта" amount={project.totalCost} tone="ink" />
                  <Row label="Оплачено" amount={String(totalPaid)} tone="pos" />
                  <Row label="Осталось заплатить" amount={String(remainingToPay)} tone={remainingToPay > 0 ? 'neg' : 'pos'} />
                </div>

                {clientPayments.length > 0 && (
                  <div className="mt-5">
                    <h4 className="text-[12px] font-bold uppercase mb-2" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                      История платежей
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
                              {fmtDateRu(payment.paymentDate)}
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

        {/* Project Documents */}
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
                {isAdminOrDirector && (
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
                  <p className="text-center py-6 text-[13px]" style={{ color: 'var(--corp-muted)' }}>Нет документов</p>
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
                            title="Просмотр документа"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadDocument(doc)}
                            className="w-8 h-8 flex items-center justify-center rounded"
                            style={{ color: 'var(--corp-pos)' }}
                            title="Скачать документ"
                          >
                            <Download size={15} />
                          </button>
                          {isAdminOrDirector && doc.fileName.toLowerCase().startsWith('invoice') && (
                            <button
                              type="button"
                              onClick={() => handleCreateSheetFromInvoice(doc)}
                              className="w-8 h-8 flex items-center justify-center rounded"
                              style={{ color: '#9333ea' }}
                              title="Создать лист реализации из инвойса"
                            >
                              <Upload size={15} />
                            </button>
                          )}
                          {isAdminOrDirector && (
                            <button
                              type="button"
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="w-8 h-8 flex items-center justify-center rounded"
                              style={{ color: 'var(--corp-neg)' }}
                              title="Удалить документ"
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

        {/* Project Expenses */}
        {isAdminOrDirector && (
          <div className="p-4" style={SECTION_STYLE}>
            <Collapsible open={isExpensesOpen} onOpenChange={setIsExpensesOpen}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <h3 className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>Расходы на проект</h3>
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
                    <button
                      type="button"
                      onClick={() => setLocation(`/add-expense?projectId=${projectId}`)}
                      className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold"
                      style={PRIMARY_BTN}
                    >
                      <Plus size={14} /> Добавить расход
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocation(`/expenses/${projectId}`)}
                      className="inline-flex items-center gap-1 h-9 px-3 text-[12px] font-semibold"
                      style={GHOST_BTN}
                    >
                      <Edit size={14} /> Управление
                    </button>
                  </div>

                  {expenses.length > 0 ? (
                    <div>
                      <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[11px] font-bold uppercase" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                            История расходов
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
                                <SelectItem value="all">Все пользователи ({expenses.length})</SelectItem>
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
                                  {getCategoryLabel(expense.category)}
                                </span>
                                <span className="text-[11px]" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                                  {fmtDateRu(expense.createdAt)}
                                </span>
                              </div>
                              <p className="text-[12px] truncate" style={{ color: 'var(--corp-ink-3)' }}>
                                {expense.description || 'Без описания'}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <User size={10} style={{ color: 'var(--corp-muted)' }} />
                                <span className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                                  {expense.user?.name || 'Неизвестно'}
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
                            Показать все ({filteredAndSortedExpenses.length})
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-center py-6 text-[13px]" style={{ color: 'var(--corp-muted)' }}>Нет расходов по проекту</p>
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
            <AlertDialogTitle>Удалить проект</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить проект безвозвратно? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProject}
              style={{ background: 'var(--corp-neg)', color: '#fff' }}
              data-testid="button-confirm-delete"
            >
              Удалить проект
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Implementation Sheet from Invoice */}
      <Dialog open={isCreateSheetDialogOpen} onOpenChange={setIsCreateSheetDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать лист реализации из инвойса</DialogTitle>
            <DialogDescription>
              Автоматически создать лист реализации на основе загруженного инвойса "{selectedInvoiceDoc?.name}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div className="p-4" style={SECTION_STYLE}>
              <h4 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>Как это работает</h4>
              <div className="space-y-2 text-[13px]">
                {[
                  'Система автоматически извлечет таблицу из PDF, XLSX или CSV',
                  'Создаст позиции с наименованием, количеством, ценой и суммой',
                  'Лист реализации будет готов для работы',
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
                <Label htmlFor="sheet-name">Название листа реализации</Label>
                <Input
                  id="sheet-name"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="Введите название листа..."
                  data-testid="input-sheet-name"
                  required
                />
              </div>

              <Alert>
                <CheckCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Поддерживаемые форматы:</strong> PDF, XLSX, XLS, CSV
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
                          <div className="font-medium">Рекомендации:</div>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Проверьте, что файл содержит таблицу с данными</li>
                            <li>Убедитесь, что есть колонки с наименованием работ</li>
                            <li>Попробуйте другой формат файла (XLSX вместо PDF)</li>
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
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={createSheetFromInvoiceMutation.isPending || !selectedInvoiceDoc || !sheetName.trim()}
                  className="flex-1 h-10 text-[13px] font-semibold transition-colors disabled:opacity-50"
                  style={PRIMARY_BTN}
                  data-testid="button-create-sheet"
                >
                  {createSheetFromInvoiceMutation.isPending ? "Создание..." : "Создать лист"}
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
              Завершение проекта
            </DialogTitle>
            <DialogDescription>
              Расчет итоговой прибыли по проекту "{project?.name}"
            </DialogDescription>
          </DialogHeader>

          {financialSummary && (
            <div className="space-y-3">
              <div className="p-4" style={SECTION_STYLE}>
                <h4 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>Итоги по проекту</h4>
                <div className="space-y-2">
                  <Row label="Стоимость проекта" amount={financialSummary.totalCost} tone="ink" />
                  <Row label="Получено от заказчика" amount={financialSummary.totalCustomerAdvances} tone="pos" />
                  <Row label="Общие расходы" amount={financialSummary.totalExpenses} tone="neg" />
                  <Row label="Взято авансов" amount={financialSummary.totalAdvances} tone="neg" />
                  <div style={{ height: 1, background: 'var(--corp-line)', margin: '8px 0' }} />
                  {(() => {
                    const profit = parseFloat(financialSummary.totalCustomerAdvances) - parseFloat(financialSummary.totalExpenses);
                    return (
                      <div className="flex justify-between items-center px-3 py-3" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}>
                        <span className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)' }}>Итоговая прибыль</span>
                        <MoneyAED amount={profit} size={18} weight={700} tone={profit >= 0 ? 'pos' : 'neg'} />
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-4" style={SECTION_STYLE}>
                <h4 className="text-[14px] font-bold mb-3" style={{ color: 'var(--corp-ink)' }}>Распределение прибыли</h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3" style={{ background: 'rgba(37,99,235,0.06)', borderRadius: 'var(--corp-r)' }}>
                    <div className="text-[11px] mb-1" style={{ color: 'var(--corp-ink-3)' }}>Заработок Влада</div>
                    <MoneyAED
                      amount={financialSummary.vladEarnings || '0'}
                      size={20}
                      weight={700}
                      tone={parseFloat(financialSummary.vladEarnings || '0') >= 0 ? 'pos' : 'neg'}
                    />
                    {parseFloat(financialSummary.vladEarnings || '0') < 0 && (
                      <div className="text-[10px] mt-1" style={{ color: 'var(--corp-neg)' }}>К доплате</div>
                    )}
                  </div>
                  <div className="p-3" style={{ background: 'rgba(147,51,234,0.06)', borderRadius: 'var(--corp-r)' }}>
                    <div className="text-[11px] mb-1" style={{ color: 'var(--corp-ink-3)' }}>Заработок Платона</div>
                    <MoneyAED
                      amount={financialSummary.platonEarnings || '0'}
                      size={20}
                      weight={700}
                      tone={parseFloat(financialSummary.platonEarnings || '0') >= 0 ? 'pos' : 'neg'}
                    />
                    {parseFloat(financialSummary.platonEarnings || '0') < 0 && (
                      <div className="text-[10px] mt-1" style={{ color: 'var(--corp-neg)' }}>К доплате</div>
                    )}
                  </div>
                </div>

                <div className="text-[12px] p-3" style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)', color: 'var(--corp-ink-3)' }}>
                  <div className="font-semibold mb-1" style={{ color: 'var(--corp-ink-2)' }}>Расчёт:</div>
                  <div>• Доступно к распределению: {fmtNum(parseFloat(financialSummary.totalCustomerAdvances) - parseFloat(financialSummary.totalExpenses))} AED</div>
                  <div>• На каждого: {fmtNum((parseFloat(financialSummary.totalCustomerAdvances) - parseFloat(financialSummary.totalExpenses)) / 2)} AED</div>
                  <div>• Влад взял авансом: {fmtNum(parseFloat(financialSummary.vladAdvances || '0'))} AED</div>
                  <div>• Платон взял авансом: {fmtNum(parseFloat(financialSummary.platonAdvances || '0'))} AED</div>
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
              Закрыть
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
              Архивировать проект
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
