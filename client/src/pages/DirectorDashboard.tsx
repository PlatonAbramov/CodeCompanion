import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/skeletons";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Bell, LogOut, Plus, Archive, Settings, BarChart3,
  ChevronRight, Edit2, Search, MoreHorizontal,
  Home as HomeIcon, Building2, DollarSign, User as UserIcon, Users as UsersIcon,
} from "lucide-react";
import { AssignClientModal } from '@/components/AssignClientModal';

interface Project {
  id: string;
  name: string;
  location?: string;
  totalCost: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

interface FinancialSummary {
  totalCost: string;
  totalAdvances: string;
  totalCustomerAdvances: string;
  totalRevenues: string;
  totalExpenses: string;
  currentProfit: string;
  projectedProfit: string;
  vladAdvances: string;
  platonAdvances: string;
  vladEarnings: string;
  platonEarnings: string;
}

interface Client {
  id: string;
  name: string;
  company?: string;
}

// === Helpers ================================================================
function fmtNum(n: number): string {
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ').replace(/\u00A0/g, ' ');
}

function fmtShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return fmtNum(n);
}

function fmtDateRu(s: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTodayRu() {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function MoneyAED({
  amount, size = 14, weight = 600, tone = 'ink',
}: {
  amount: number | string;
  size?: number;
  weight?: 400 | 500 | 600 | 700;
  tone?: 'ink' | 'pos' | 'neg' | 'muted' | 'inherit';
}) {
  const num = typeof amount === 'string' ? parseFloat(amount || '0') : amount;
  const color =
    tone === 'pos' ? 'var(--corp-pos)' :
    tone === 'neg' ? 'var(--corp-neg)' :
    tone === 'muted' ? 'var(--corp-muted)' :
    tone === 'inherit' ? 'inherit' :
    'var(--corp-ink)';
  return (
    <span style={{ fontFamily: 'var(--corp-mono)', fontSize: size, fontWeight: weight, color, whiteSpace: 'nowrap' }}>
      {fmtNum(num)}
      <span style={{ marginLeft: '0.35em', fontSize: '0.78em', opacity: 0.7, fontWeight: 500 }}>AED</span>
    </span>
  );
}

// === KPI Card ===============================================================
function KpiCard({
  label, value, badge, badgeTone = 'neutral', dark = false, onClick,
}: {
  label: string;
  value: React.ReactNode;
  badge?: string;
  badgeTone?: 'pos' | 'neg' | 'neutral';
  dark?: boolean;
  onClick?: () => void;
}) {
  const labelColor = dark ? 'rgba(255,255,255,0.55)' : 'var(--corp-muted)';
  const valueColor = dark ? '#ffffff' : 'var(--corp-ink)';
  const badgeBg = dark ? 'rgba(91,88,235,0.35)' :
    badgeTone === 'pos' ? 'var(--corp-pos-soft)' :
    badgeTone === 'neg' ? 'var(--corp-neg-soft)' :
    'var(--corp-surface-2)';
  const badgeColor = dark ? '#ffffff' :
    badgeTone === 'pos' ? 'var(--corp-pos)' :
    badgeTone === 'neg' ? 'var(--corp-neg)' :
    'var(--corp-ink-2)';
  return (
    <div
      onClick={onClick}
      className={`p-4 lg:p-5 transition-all ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        background: dark ? 'var(--corp-brand)' : 'var(--corp-surface)',
        border: dark ? 'none' : '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
        color: valueColor,
      }}
    >
      <p
        className="text-[10px] lg:text-[11px] font-bold uppercase"
        style={{ letterSpacing: '0.05em', color: labelColor }}
      >
        {label}
      </p>
      <div
        className="mt-2 lg:mt-2.5"
        style={{
          fontSize: 'clamp(20px, 4vw, 28px)', fontWeight: 700, letterSpacing: '-0.6px',
          fontFamily: 'var(--corp-mono)', lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {badge && (
        <div className="mt-2">
          <span
            className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: badgeBg, color: badgeColor }}
          >
            {badge}
          </span>
        </div>
      )}
    </div>
  );
}

// === Period segmented control ===============================================
function PeriodSegment({
  value, onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const items = ['День', 'Неделя', 'Месяц', 'Год'];
  return (
    <div
      className="inline-flex items-center p-1 gap-0.5"
      style={{
        background: 'var(--corp-surface-2)',
        borderRadius: 'var(--corp-r)',
      }}
    >
      {items.map(item => {
        const active = item === value;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className="px-3 py-1.5 text-[12px] font-semibold transition-all"
            style={{
              background: active ? 'var(--corp-surface)' : 'transparent',
              color: active ? 'var(--corp-ink)' : 'var(--corp-muted)',
              borderRadius: 'calc(var(--corp-r) - 2px)',
              boxShadow: active ? '0 1px 2px rgba(10,10,11,0.06)' : 'none',
              cursor: 'pointer',
            }}
            data-testid={`period-${item}`}
          >
            {item}
          </button>
        );
      })}
    </div>
  );
}

// === Mobile Hero (чёрная карточка прибыли с мини-графиком) ==================
function MobileHero({
  totalProfit, activeCount, awaitingPayment, growthPct,
}: {
  totalProfit: number;
  activeCount: number;
  awaitingPayment: number;
  growthPct: number;
}) {
  const positive = totalProfit >= 0;
  const heights = [16, 22, 18, 26, 24, 30, 36, 42];
  return (
    <div
      className="lg:hidden"
      style={{
        background: 'var(--corp-ink)',
        borderRadius: 'var(--corp-r-lg)',
        padding: 18,
        color: '#fff',
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] font-bold uppercase"
            style={{ letterSpacing: '0.06em', color: 'rgba(255,255,255,0.55)' }}
          >
            Общая прибыль
          </p>
          <div
            className="mt-2"
            style={{
              fontFamily: 'var(--corp-mono)', fontSize: 32, fontWeight: 700,
              lineHeight: 1.05, letterSpacing: '-0.6px',
            }}
          >
            {fmtNum(totalProfit)}
            <span
              style={{
                marginLeft: 8, fontSize: '0.42em', opacity: 0.55,
                fontWeight: 500, verticalAlign: 'middle',
              }}
            >
              AED
            </span>
          </div>
        </div>
        <svg width="84" height="46" viewBox="0 0 84 46" className="flex-shrink-0">
          <defs>
            <linearGradient id="heroBars" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#5b58eb" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          {heights.map((h, i) => (
            <rect
              key={i}
              x={i * 10 + 2}
              y={46 - h}
              width="6"
              height={h}
              rx="1.5"
              fill="url(#heroBars)"
            />
          ))}
        </svg>
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', margin: '14px 0' }} />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
            Активные
          </p>
          <div className="mt-1.5" style={{ fontFamily: 'var(--corp-mono)', fontSize: 20, fontWeight: 700 }}>
            {activeCount}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
            Ожидает
          </p>
          <div className="mt-1.5" style={{ fontFamily: 'var(--corp-mono)', fontSize: 20, fontWeight: 700 }}>
            {fmtShort(awaitingPayment)}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
            Маржа
          </p>
          <div
            className="mt-1.5"
            style={{
              fontFamily: 'var(--corp-mono)', fontSize: 20, fontWeight: 700,
              color: positive ? '#86efac' : '#fca5a5',
            }}
          >
            {positive ? '+' : ''}{growthPct.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// === Mobile Quick Actions (4 квадрата) ======================================
function MobileQuickActionTile({
  icon: Icon, label, onClick, testId,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-2 px-1 py-3 transition-colors"
      style={{
        background: 'var(--corp-surface)',
        border: '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
      }}
      data-testid={testId}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(91,88,235,0.10)', color: '#5b58eb' }}
      >
        <Icon size={18} />
      </span>
      <span className="text-[12px] font-semibold" style={{ color: 'var(--corp-ink)' }}>
        {label}
      </span>
    </button>
  );
}

// === Mobile Project Card (новый дизайн с аватаром-инициалами) ===============
function MobileProjectCardNew({
  project, onClick, clientsById,
}: {
  project: Project;
  onClick: () => void;
  clientsById: Map<string, Client>;
}) {
  const { fin, totalCost, usedRatio, currentProfit, profitable } = useProjectRowData(project);
  const clientName = (project as any).clientId
    ? clientsById.get((project as any).clientId)?.name || ''
    : '';
  const initials = (() => {
    const parts = project.name.trim().split(/\s+/).filter(Boolean);
    const letters = parts.length >= 2
      ? (parts[0][0] || '') + (parts[1][0] || '')
      : project.name.replace(/\s/g, '').slice(0, 2);
    return letters.toUpperCase();
  })();
  const endDate = project.endDate ? fmtDateRu(project.endDate) : '';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer p-3.5"
      style={{
        background: 'var(--corp-surface)',
        border: '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
      }}
      data-testid={`mobile-project-card-${project.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(91,88,235,0.12)', color: '#5b58eb' }}
        >
          <span className="text-[12px] font-bold" style={{ fontFamily: 'var(--corp-mono)' }}>
            {initials}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div
            className="text-[15px] font-bold leading-tight"
            style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
          >
            {project.name}
          </div>
          <div className="text-[12px] mt-1" style={{ color: 'var(--corp-muted)' }}>
            {clientName && <>{clientName} · </>}
            {endDate && (
              <>до <span style={{ fontFamily: 'var(--corp-mono)' }}>{endDate}</span></>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--corp-surface-3)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${usedRatio}%`, background: profitable ? 'var(--corp-pos)' : 'var(--corp-neg)' }}
          />
        </div>
        <span
          className="text-[12px] font-semibold"
          style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-muted)', minWidth: 36, textAlign: 'right' }}
        >
          {Math.round(usedRatio)}%
        </span>
      </div>
    </div>
  );
}

// === Project row data hook (shared) =========================================
function useProjectRowData(project: Project) {
  const { data: fin } = useQuery<FinancialSummary>({
    queryKey: ['/api/projects', project.id, 'financial-summary'],
  });
  const totalCost = parseFloat(project.totalCost || '0');
  const expenses = parseFloat(fin?.totalExpenses || '0');
  const advances = parseFloat(fin?.totalAdvances || '0');
  const usedRatio = totalCost > 0 ? Math.min(100, ((expenses + advances) / totalCost) * 100) : 0;
  const currentProfit = parseFloat(fin?.currentProfit || '0');
  const profitable = currentProfit >= 0;
  return { fin, totalCost, usedRatio, currentProfit, profitable };
}

// === Project table row (desktop only, valid <tr>) ===========================
function ProjectsTableRow({
  project, onClick, onEdit, showEdit, clientsById,
}: {
  project: Project;
  onClick: () => void;
  onEdit: (p: Project) => void;
  showEdit: boolean;
  clientsById: Map<string, Client>;
}) {
  const { fin, totalCost, usedRatio, currentProfit, profitable } = useProjectRowData(project);
  const clientName = (project as any).clientId
    ? clientsById.get((project as any).clientId)?.name || '—'
    : '—';

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors"
      style={{ borderTop: '1px solid var(--corp-line)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <td className="px-4 py-3.5">
        <div className="font-semibold text-[13px]" style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}>
          {project.name}
        </div>
        {project.location && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--corp-muted)' }}>
            {project.location}
          </div>
        )}
      </td>
      <td className="px-4 py-3.5 text-[13px]" style={{ color: 'var(--corp-ink-2)' }}>{clientName}</td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--corp-surface-3)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${usedRatio}%`, background: profitable ? 'var(--corp-pos)' : 'var(--corp-neg)' }}
            />
          </div>
          <span
            className="text-[11px] font-semibold"
            style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-muted)', minWidth: 30, textAlign: 'right' }}
          >
            {Math.round(usedRatio)}%
          </span>
        </div>
      </td>
      <td className="px-4 py-3.5 text-right">
        <MoneyAED amount={totalCost} size={13} weight={600} />
      </td>
      <td className="px-4 py-3.5 text-right">
        {fin
          ? <MoneyAED amount={currentProfit} size={13} weight={700} tone={profitable ? 'pos' : 'neg'} />
          : <span className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>—</span>}
      </td>
      <td className="px-4 py-3.5 text-[12px]" style={{ color: 'var(--corp-ink-3)', fontFamily: 'var(--corp-mono)' }}>
        {project.endDate ? fmtDateRu(project.endDate) : '—'}
      </td>
      <td className="px-2 py-3.5 text-right">
        {showEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(project); }}
            className="h-8 w-8 rounded-md inline-flex items-center justify-center transition-colors"
            style={{ color: 'var(--corp-muted)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--corp-surface-3)';
              e.currentTarget.style.color = 'var(--corp-ink-2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--corp-muted)';
            }}
            data-testid={`button-edit-project-${project.id}`}
          >
            <MoreHorizontal size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}

// === Project mobile card (mobile only, valid <div>) =========================
function ProjectsMobileCard({
  project, isFirst, onClick, onEdit, showEdit, clientsById,
}: {
  project: Project;
  isFirst: boolean;
  onClick: () => void;
  onEdit: (p: Project) => void;
  showEdit: boolean;
  clientsById: Map<string, Client>;
}) {
  const { fin, totalCost, usedRatio, currentProfit, profitable } = useProjectRowData(project);
  const clientName = (project as any).clientId
    ? clientsById.get((project as any).clientId)?.name || '—'
    : '—';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer p-4 transition-colors"
      style={{ borderTop: isFirst ? 'none' : '1px solid var(--corp-line)' }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-[14px] truncate" style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}>
            {project.name}
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--corp-muted)' }}>
            {clientName} · до {project.endDate ? fmtDateRu(project.endDate) : '—'}
          </div>
        </div>
        {showEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(project); }}
            className="h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ color: 'var(--corp-muted)' }}
            data-testid={`button-edit-project-mobile-${project.id}`}
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--corp-surface-3)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${usedRatio}%`, background: profitable ? 'var(--corp-pos)' : 'var(--corp-neg)' }}
          />
        </div>
        <span
          className="text-[11px] font-semibold"
          style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-muted)', minWidth: 30, textAlign: 'right' }}
        >
          {Math.round(usedRatio)}%
        </span>
      </div>
      <div className="flex items-center justify-between text-[12px]">
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--corp-muted)' }}>Бюджет</span>
          <MoneyAED amount={totalCost} size={12} weight={600} />
        </div>
        {fin && (
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'var(--corp-muted)' }}>Прибыль</span>
            <MoneyAED amount={currentProfit} size={12} weight={700} tone={profitable ? 'pos' : 'neg'} />
          </div>
        )}
      </div>
    </div>
  );
}

// === Page ===================================================================
export default function DirectorDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState('Месяц');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isAssignClientModalOpen, setIsAssignClientModalOpen] = useState(false);
  const [clientAssignmentProjectId, setClientAssignmentProjectId] = useState<string>("");
  const [projectForm, setProjectForm] = useState({
    name: '', location: '', clientId: '', totalCost: '', startDate: '', endDate: ''
  });

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: financialData } = useQuery({
    queryKey: ['/api/financial-overview'],
  });

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
  });

  const clientsById = new Map(clients.map(c => [c.id, c]));

  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateModalOpen(false);
      setProjectForm({ name: '', location: '', clientId: '', totalCost: '', startDate: '', endDate: '' });
      toast({ title: "Успешно", description: "Проект создан" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось создать проект", variant: "destructive" });
    },
  });

  const editProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/projects/${editingProject?.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditModalOpen(false);
      setEditingProject(null);
      setProjectForm({ name: '', location: '', clientId: '', totalCost: '', startDate: '', endDate: '' });
      toast({ title: "Успешно", description: "Проект обновлен" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить проект", variant: "destructive" });
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.clientId) {
      toast({ title: "Ошибка", description: "Необходимо выбрать заказчика", variant: "destructive" });
      return;
    }
    createProjectMutation.mutate({
      name: projectForm.name,
      totalCost: projectForm.totalCost,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate || null,
      clientId: projectForm.clientId,
    });
  };

  const handleEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    editProjectMutation.mutate(projectForm);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      location: project.location || '',
      clientId: '',
      totalCost: project.totalCost,
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  const activeProjects = projects.filter((p) => p.status === 'active');
  const archivedProjects = projects.filter((p) => p.status === 'archived');
  const activeProjectsCount = activeProjects.length;
  const archivedProjectsCount = archivedProjects.length;
  const totalRevenue = parseFloat((financialData as any)?.totalRevenue || '0');
  const totalExpenses = parseFloat((financialData as any)?.totalExpenses || '0');
  const totalAdvances = parseFloat((financialData as any)?.totalAdvances || '0');
  const totalCustomerAdvances = parseFloat((financialData as any)?.totalCustomerAdvances || '0');
  const awaitingPayment = Math.max(0, totalRevenue - totalCustomerAdvances);
  const totalProfit = totalRevenue - totalExpenses;
  const isMaster = user?.role === 'master';
  const canEdit = user?.role === 'admin' || user?.role === 'director';
  const recentProjects = activeProjects.slice(0, 5);

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background: 'var(--corp-bg)',
        fontFamily: 'var(--corp-font)',
        color: 'var(--corp-ink)',
      }}
    >
      {/* === Мобильная шапка (домик + приветствие + bell + gear) ====== */}
      <header
        className="lg:hidden sticky top-0 z-40"
        style={{
          background: 'var(--corp-bg)',
        }}
      >
        <div className="px-4 pt-3 pb-2 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--corp-ink)', color: '#fff' }}
          >
            <HomeIcon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              Добрый день,
            </p>
            <p
              className="text-[16px] font-bold leading-tight truncate"
              style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
            >
              {user?.name || 'Пользователь'}
            </p>
          </div>
          <LanguageSwitcher />
          <button
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--corp-surface)', border: '1px solid var(--corp-line)', color: 'var(--corp-ink-2)' }}
            data-testid="button-notifications-mobile"
            aria-label="Уведомления"
          >
            <Bell size={17} />
          </button>
          {(user?.role === 'admin' || user?.role === 'director') && (
            <button
              type="button"
              onClick={() => setLocation(user?.role === 'admin' ? '/admin' : '/analytics')}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--corp-surface)', border: '1px solid var(--corp-line)', color: 'var(--corp-ink-2)' }}
              data-testid="button-settings-mobile"
              aria-label="Настройки"
            >
              <Settings size={17} />
            </button>
          )}
        </div>
      </header>

      {/* === Десктопная шапка ========================================= */}
      <header
        className="hidden lg:block sticky top-0 z-40"
        style={{
          background: 'var(--corp-surface)',
          borderBottom: '1px solid var(--corp-line)',
        }}
      >
        <div className="px-4 lg:px-6 h-14 flex items-center gap-3">
          <h2
            className="text-[14px] font-bold flex-shrink-0"
            style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
          >
            Обзор
          </h2>

          <div
            className="hidden md:flex items-center gap-2 flex-1 max-w-[320px] h-8 px-3"
            style={{
              background: 'var(--corp-surface-2)',
              borderRadius: 'var(--corp-r)',
              color: 'var(--corp-muted)',
            }}
          >
            <Search size={14} />
            <span className="text-[12px] flex-1 truncate">Поиск по проектам, расходам…</span>
          </div>

          <div className="flex-1 md:hidden" />

          <div className="flex items-center gap-1 flex-shrink-0">
            {!isMaster && (
              <HeaderIconButton
                onClick={() => setLocation('/analytics')}
                testId="button-analytics"
                title="Аналитика"
              >
                <BarChart3 size={17} />
              </HeaderIconButton>
            )}
            <HeaderIconButton title="Уведомления">
              <Bell size={17} />
            </HeaderIconButton>
            <LanguageSwitcher />
            {user?.role === 'admin' && (
              <HeaderIconButton
                onClick={() => setLocation('/admin')}
                testId="button-admin-panel"
                title="Админ-панель"
              >
                <Settings size={17} />
              </HeaderIconButton>
            )}

            <button
              type="button"
              onClick={() => setLocation('/expenses')}
              className="ml-1 inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
              style={{
                background: 'var(--corp-ink)',
                color: 'var(--corp-brand-text)',
                borderRadius: 'var(--corp-r)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-ink-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-ink)'; }}
              data-testid="button-quick-expense"
            >
              <Plus size={13} />
              <span className="hidden sm:inline">Расход</span>
            </button>

            <HeaderIconButton onClick={() => logout()} testId="button-logout" title="Выйти">
              <LogOut size={17} />
            </HeaderIconButton>
          </div>
        </div>
      </header>

      <main className="px-4 lg:px-6 pt-3 lg:pt-6">
        {/* === Мобильный hero + быстрые действия (lg:hidden) ===== */}
        <div className="lg:hidden mb-5">
          <MobileHero
            totalProfit={totalProfit}
            activeCount={activeProjectsCount}
            awaitingPayment={awaitingPayment}
            growthPct={totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0}
          />
        </div>

        {!isMaster && (
          <div className="lg:hidden grid grid-cols-4 gap-2 mb-5">
            {canEdit ? (
              <MobileQuickActionTile
                icon={Building2}
                label="Проект"
                onClick={() => setIsCreateModalOpen(true)}
                testId="mobile-action-project"
              />
            ) : (
              <MobileQuickActionTile
                icon={Building2}
                label="Проекты"
                onClick={() => setLocation('/director')}
                testId="mobile-action-project"
              />
            )}
            <MobileQuickActionTile
              icon={DollarSign}
              label="Расход"
              onClick={() => setLocation('/add-expense')}
              testId="mobile-action-expense"
            />
            <MobileQuickActionTile
              icon={UserIcon}
              label="Заказч."
              onClick={() => setLocation('/clients')}
              testId="mobile-action-clients"
            />
            <MobileQuickActionTile
              icon={UsersIcon}
              label="Подряд."
              onClick={() => setLocation('/contractors')}
              testId="mobile-action-contractors"
            />
          </div>
        )}

        {isMaster && (
          <div className="lg:hidden grid grid-cols-3 gap-2 mb-5">
            <MobileQuickActionTile
              icon={Building2}
              label="Проекты"
              onClick={() => setLocation('/master')}
              testId="mobile-action-project"
            />
            <MobileQuickActionTile
              icon={DollarSign}
              label="Расход"
              onClick={() => setLocation('/add-expense')}
              testId="mobile-action-expense"
            />
            <MobileQuickActionTile
              icon={UsersIcon}
              label="Подряд."
              onClick={() => setLocation('/contractors')}
              testId="mobile-action-contractors"
            />
          </div>
        )}

        {/* === Десктоп: приветствие + период (hidden lg:block) === */}
        <div className="hidden lg:flex items-end justify-between gap-3 flex-wrap mb-5 lg:mb-6">
          <div>
            <p
              className="text-[10px] lg:text-[11px] font-bold uppercase"
              style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
            >
              Рабочее пространство · {fmtTodayRu()}
            </p>
            <h1
              className="mt-1.5 font-bold"
              style={{
                fontSize: 'clamp(22px, 4vw, 28px)',
                letterSpacing: '-0.8px',
                color: 'var(--corp-ink)',
              }}
            >
              Добрый день, {user?.name?.split(' ')[0] || 'друг'}
            </h1>
          </div>
          {!isMaster && (
            <PeriodSegment value={period} onChange={setPeriod} />
          )}
        </div>

        {/* === Десктоп: KPI row (hidden lg:grid) ================ */}
        <div className="hidden lg:grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-3.5 mb-5 lg:mb-6">
          {!isMaster && (
            <KpiCard
              dark
              label="Чистая прибыль"
              value={
                <>
                  {fmtNum(totalProfit)}
                  <span style={{ fontSize: '0.55em', opacity: 0.55, marginLeft: 6, fontWeight: 500 }}>AED</span>
                </>
              }
              badge={totalProfit >= 0 ? 'Положительный' : 'Минус'}
            />
          )}
          <KpiCard
            label="Активные проекты"
            value={activeProjectsCount}
            badge={`${activeProjectsCount} в работе`}
            badgeTone="pos"
            onClick={() => setLocation('/director')}
          />
          {!isMaster && (
            <KpiCard
              label="Ожидает оплаты"
              value={
                <>
                  {fmtShort(awaitingPayment)}
                  <span style={{ fontSize: '0.55em', opacity: 0.55, marginLeft: 6, fontWeight: 500 }}>AED</span>
                </>
              }
              badge={`Аванс: ${fmtShort(totalCustomerAdvances)}`}
              badgeTone="neutral"
            />
          )}
          {!isMaster && (
            <KpiCard
              label="Расходы · всего"
              value={
                <>
                  {fmtNum(totalExpenses)}
                  <span style={{ fontSize: '0.55em', opacity: 0.55, marginLeft: 6, fontWeight: 500 }}>AED</span>
                </>
              }
              badge={`Авансы: ${fmtShort(totalAdvances)}`}
              badgeTone="neg"
            />
          )}
          {isMaster && (
            <KpiCard
              label="Архив"
              value={archivedProjectsCount}
              badge="завершённые"
              badgeTone="neutral"
              onClick={() => setLocation('/archived-projects')}
            />
          )}
        </div>

        {/* === Архив-баннер (только если есть и не показан в KPI) === */}
        {!isMaster && archivedProjectsCount > 0 && (
          <button
            type="button"
            onClick={() => setLocation('/archived-projects')}
            className="w-full mb-5 p-3 flex items-center gap-3 transition-all"
            style={{
              background: 'var(--corp-surface-2)',
              border: '1px solid var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
              cursor: 'pointer',
            }}
            data-testid="button-archived-projects"
          >
            <span
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--corp-surface-3)', color: 'var(--corp-ink-3)' }}
            >
              <Archive size={16} />
            </span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>Архив</p>
              <p className="text-[14px] font-semibold" style={{ color: 'var(--corp-ink)' }}>
                Архивные проекты ·{' '}
                <span style={{ fontFamily: 'var(--corp-mono)' }}>{archivedProjectsCount}</span>
              </p>
            </div>
            <ChevronRight size={18} style={{ color: 'var(--corp-muted)' }} />
          </button>
        )}

        {/* === Заголовок секции (мобайл) ========================= */}
        <div className="lg:hidden flex items-center justify-between mb-3">
          <h3
            className="text-[11px] font-bold uppercase"
            style={{ color: 'var(--corp-muted)', letterSpacing: '0.06em' }}
          >
            Проекты
          </h3>
          <button
            type="button"
            onClick={() => setLocation('/projects-list')}
            className="inline-flex items-center gap-1 text-[13px] font-semibold"
            style={{ color: 'var(--corp-accent)' }}
            data-testid="button-all-projects-mobile"
          >
            Все <span style={{ fontFamily: 'var(--corp-mono)' }}>{activeProjectsCount}</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* === Заголовок секции (десктоп) ======================== */}
        <div className="hidden lg:flex items-center justify-between mb-3">
          <h3
            className="text-[14px] font-bold"
            style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
          >
            Последние проекты
          </h3>
          {canEdit && (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold transition-colors"
                  style={{
                    background: 'var(--corp-accent)',
                    color: '#ffffff',
                    borderRadius: 'var(--corp-r)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-accent-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-accent)'; }}
                  data-testid="button-create-project"
                >
                  <Plus size={13} />
                  Новый проект
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('createProject')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Название проекта *</Label>
                    <Input
                      id="name"
                      placeholder="Введите название проекта"
                      value={projectForm.name}
                      onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientId">Заказчик *</Label>
                    <Select
                      value={projectForm.clientId}
                      onValueChange={(value) => setProjectForm({ ...projectForm, clientId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите заказчика" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company || client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="totalCost">Общая стоимость (AED) *</Label>
                    <Input
                      id="totalCost"
                      type="number"
                      placeholder="Введите общую стоимость"
                      value={projectForm.totalCost}
                      onChange={(e) => setProjectForm({ ...projectForm, totalCost: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="startDate">Дата начала *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={projectForm.startDate}
                      onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Срок завершения (опционально)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={projectForm.endDate}
                      onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary text-white"
                    disabled={createProjectMutation.isPending}
                  >
                    {createProjectMutation.isPending ? t('loading') : t('createProject')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Edit Project Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактировать проект</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditProject} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Название проекта</Label>
                <Input
                  id="edit-name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Местоположение</Label>
                <Input
                  id="edit-location"
                  value={projectForm.location}
                  onChange={(e) => setProjectForm({ ...projectForm, location: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-totalCost">Общая стоимость</Label>
                <Input
                  id="edit-totalCost"
                  type="number"
                  value={projectForm.totalCost}
                  onChange={(e) => setProjectForm({ ...projectForm, totalCost: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-startDate">Дата начала</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-endDate">Дата окончания</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (editingProject) {
                      setClientAssignmentProjectId(editingProject.id);
                      setIsAssignClientModalOpen(true);
                    }
                  }}
                >
                  Назначить заказчика
                </Button>
                <Button
                  type="submit"
                  className="w-full bg-primary text-white"
                  disabled={editProjectMutation.isPending}
                >
                  {editProjectMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {isLoading && projects.length === 0 ? (
          <ListSkeleton count={4} />
        ) : recentProjects.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              background: 'var(--corp-surface)',
              border: '1px dashed var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
          >
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--corp-ink-2)' }}>
              Пока нет активных проектов
            </p>
            <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              Создайте первый проект, чтобы начать работу
            </p>
          </div>
        ) : (
          <>
            {/* Десктопная таблица */}
            <div
              className="hidden lg:block"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
                overflow: 'hidden',
              }}
            >
              <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--corp-surface-2)' }}>
                    {[
                      { label: 'Проект', align: 'left' },
                      { label: 'Заказчик', align: 'left' },
                      { label: 'Прогресс', align: 'left' },
                      { label: 'Бюджет', align: 'right' },
                      { label: 'Прибыль', align: 'right' },
                      { label: 'Срок', align: 'left' },
                      { label: '', align: 'right' },
                    ].map((h, i) => (
                      <th
                        key={i}
                        className="px-4 py-2.5 text-[10px] font-bold uppercase"
                        style={{
                          textAlign: h.align as any,
                          color: 'var(--corp-muted)',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.map((project) => (
                    <ProjectsTableRow
                      key={project.id}
                      project={project}
                      onClick={() => setLocation(`/projects/${project.id}`)}
                      onEdit={openEditModal}
                      showEdit={canEdit}
                      clientsById={clientsById}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Мобильный список — отдельные карточки с аватарами */}
            <div className="lg:hidden flex flex-col gap-2.5">
              {recentProjects.map((project) => (
                <MobileProjectCardNew
                  key={project.id}
                  project={project}
                  onClick={() => setLocation(`/projects/${project.id}`)}
                  clientsById={clientsById}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <AssignClientModal
        isOpen={isAssignClientModalOpen}
        onClose={() => setIsAssignClientModalOpen(false)}
        projectId={clientAssignmentProjectId}
      />
    </div>
  );
}

function HeaderIconButton({
  children, onClick, testId, title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  testId?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      title={title}
      className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
      style={{ color: 'var(--corp-ink-2)', background: 'transparent' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
