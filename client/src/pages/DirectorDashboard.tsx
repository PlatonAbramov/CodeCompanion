import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
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
  ChevronDown, ChevronUp, ChevronRight, Edit2,
  Building2, Coins, Users, HardHat,
} from "lucide-react";
import { AssignClientModal } from '@/components/AssignClientModal';
import { BottomNavigation } from "@/components/BottomNavigation";

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

// === Helpers ================================================================
const NBSP = '\u00A0';

function formatNumberRu(n: number): string {
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ').replace(/\u00A0/g, ' ');
}

function MoneyAED({
  amount,
  size = 14,
  weight = 600,
  tone = 'ink',
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
      {formatNumberRu(num)}
      <span style={{ marginLeft: '0.35em', fontSize: '0.78em', opacity: 0.7, fontWeight: 500 }}>AED</span>
    </span>
  );
}

function formatDateRu(dateString: string) {
  return new Date(dateString).toLocaleDateString('ru-RU');
}

// === Project card ===========================================================
function ProjectCard({
  project,
  onClick,
  onEdit,
  isExpanded,
  onToggleExpand,
  showEditButton = true,
}: {
  project: Project;
  onClick: () => void;
  onEdit: (project: Project) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showEditButton?: boolean;
  userRole?: string;
}) {
  const { data: financialSummary } = useQuery<FinancialSummary>({
    queryKey: ['/api/projects', project.id, 'financial-summary'],
  });

  const totalCost = parseFloat(project.totalCost || '0');
  const expenses = parseFloat(financialSummary?.totalExpenses || '0');
  const advances = parseFloat(financialSummary?.totalAdvances || '0');
  const usedRatio = totalCost > 0 ? Math.min(100, ((expenses + advances) / totalCost) * 100) : 0;
  const currentProfit = parseFloat(financialSummary?.currentProfit || '0');
  const profitable = currentProfit >= 0;

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(project);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand();
  };

  // Цветной индикатор статуса в углу карточки
  const statusColor =
    project.status === 'active' ? 'var(--corp-pos)' :
    project.status === 'archived' ? 'var(--corp-muted)' :
    'var(--corp-warn)';

  return (
    <div
      onClick={onClick}
      className="cursor-pointer transition-all"
      style={{
        background: 'var(--corp-surface)',
        border: '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(10,10,11,0.16)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--corp-line)'; }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <div
              className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
              style={{ background: statusColor }}
            />
            <div className="min-w-0 flex-1">
              <h4
                className="text-[15px] font-semibold mb-0.5 truncate"
                style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}
              >
                {project.name}
              </h4>
              {project.location && (
                <p className="text-[12px] truncate" style={{ color: 'var(--corp-muted)' }}>
                  {project.location}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {showEditButton && (
              <button
                type="button"
                onClick={handleEditClick}
                className="h-8 w-8 rounded-md flex items-center justify-center transition-colors"
                style={{ color: 'var(--corp-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--corp-surface-2)';
                  e.currentTarget.style.color = 'var(--corp-ink-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--corp-muted)';
                }}
                data-testid={`button-edit-project-${project.id}`}
              >
                <Edit2 size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={handleExpandClick}
              className="h-8 w-8 rounded-md flex items-center justify-center transition-colors"
              style={{ color: 'var(--corp-muted)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--corp-surface-2)';
                e.currentTarget.style.color = 'var(--corp-ink-2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--corp-muted)';
              }}
              data-testid={`button-expand-project-${project.id}`}
            >
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Прогресс-полоса: использовано бюджета (расходы+авансы) */}
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--corp-surface-3)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${usedRatio}%`,
                background: profitable ? 'var(--corp-pos)' : 'var(--corp-neg)',
              }}
            />
          </div>
          <span
            className="text-[11px] font-semibold"
            style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-muted)', minWidth: 30, textAlign: 'right' }}
          >
            {Math.round(usedRatio)}%
          </span>
        </div>

        {/* Сводка одной строкой: бюджет и прибыль */}
        <div className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-1.5">
            <span style={{ color: 'var(--corp-muted)' }}>Бюджет</span>
            <MoneyAED amount={totalCost} size={12} weight={600} />
          </div>
          {financialSummary && (
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--corp-muted)' }}>Прибыль</span>
              <MoneyAED amount={currentProfit} size={12} weight={700} tone={profitable ? 'pos' : 'neg'} />
            </div>
          )}
        </div>

        {/* Раскрытая детализация */}
        {isExpanded && financialSummary && (
          <div
            className="mt-4 pt-4 space-y-3"
            style={{ borderTop: '1px solid var(--corp-line)' }}
          >
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Аванс заказчика" amount={financialSummary.totalCustomerAdvances} tone="pos" />
              <DetailItem label="Расходы" amount={financialSummary.totalExpenses} tone="neg" />
              <DetailItem label="Взятые авансы" amount={financialSummary.totalAdvances} tone="neg" />
              <DetailItem label="Прогноз прибыли" amount={financialSummary.projectedProfit} tone={parseFloat(financialSummary.projectedProfit) >= 0 ? 'pos' : 'neg'} />
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '1px solid var(--corp-line)' }}>
              <DetailItem label="Заработок Влада" amount={financialSummary.vladEarnings} tone={parseFloat(financialSummary.vladEarnings) >= 0 ? 'pos' : 'neg'} />
              <DetailItem label="Заработок Платона" amount={financialSummary.platonEarnings} tone={parseFloat(financialSummary.platonEarnings) >= 0 ? 'pos' : 'neg'} />
            </div>
          </div>
        )}

        {/* Дата создания */}
        <div
          className="mt-3 pt-3 text-[11px]"
          style={{ borderTop: '1px solid var(--corp-line-2)', color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}
        >
          {formatDateRu(project.createdAt)}
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, amount, tone = 'ink' }: { label: string; amount: string; tone?: 'ink' | 'pos' | 'neg' }) {
  return (
    <div>
      <p className="text-[11px] mb-0.5" style={{ color: 'var(--corp-muted)' }}>{label}</p>
      <MoneyAED amount={amount} size={13} weight={700} tone={tone} />
    </div>
  );
}

// === Quick action button ====================================================
function QuickAction({
  icon: Icon,
  label,
  onClick,
  testId,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="flex flex-col items-center gap-1.5 py-3 px-2 transition-all min-h-[72px]"
      style={{
        background: 'var(--corp-surface)',
        border: '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(10,10,11,0.16)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--corp-line)'; }}
    >
      <span
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: 'var(--corp-accent-soft)', color: 'var(--corp-accent)' }}
      >
        <Icon size={16} />
      </span>
      <span className="text-[11px] font-semibold leading-tight text-center" style={{ color: 'var(--corp-ink-2)' }}>
        {label}
      </span>
    </button>
  );
}

// === Page ===================================================================
export default function DirectorDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isAssignClientModalOpen, setIsAssignClientModalOpen] = useState(false);
  const [clientAssignmentProjectId, setClientAssignmentProjectId] = useState<string>("");
  const [projectForm, setProjectForm] = useState({
    name: '',
    location: '',
    clientId: '',
    totalCost: '',
    startDate: '',
    endDate: ''
  });

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: financialData } = useQuery({
    queryKey: ['/api/financial-overview'],
  });

  const { data: clients = [] } = useQuery<Array<{ id: string, name: string, company?: string }>>({
    queryKey: ['/api/clients'],
  });

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

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) newSet.delete(projectId);
      else newSet.add(projectId);
      return newSet;
    });
  };

  const activeProjects = projects.filter((p) => p.status === 'active');
  const archivedProjects = projects.filter((p) => p.status === 'archived');
  const activeProjectsCount = activeProjects.length;
  const archivedProjectsCount = archivedProjects.length;
  const totalRevenue = (financialData as any)?.totalRevenue || 0;
  const totalExpenses = (financialData as any)?.totalExpenses || 0;
  const totalAdvances = (financialData as any)?.totalAdvances || 0;
  const totalProfit = totalRevenue - totalExpenses;
  const isMaster = user?.role === 'master';
  const canEdit = user?.role === 'admin' || user?.role === 'director';
  const userInitial = (user?.name || 'U').trim().charAt(0).toUpperCase();
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 6) return 'Доброй ночи';
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  })();

  return (
    <div
      className="min-h-screen pb-24"
      style={{
        background: 'var(--corp-bg)',
        fontFamily: 'var(--corp-font)',
        color: 'var(--corp-ink)',
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'var(--corp-surface)',
          borderBottom: '1px solid var(--corp-line)',
        }}
      >
        <div className="px-4 py-3 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[15px] font-bold flex-shrink-0"
            style={{ background: 'var(--corp-brand)', color: 'var(--corp-brand-text)' }}
          >
            {userInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium" style={{ color: 'var(--corp-muted)' }}>
              {greeting},
            </p>
            <h2
              className="text-[15px] font-bold truncate"
              style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
            >
              {user?.name}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!isMaster && (
              <HeaderIconButton
                onClick={() => setLocation('/analytics')}
                testId="button-analytics"
                title="Аналитика"
              >
                <BarChart3 size={18} />
              </HeaderIconButton>
            )}
            <HeaderIconButton title="Уведомления">
              <Bell size={18} />
            </HeaderIconButton>
            {user?.role === 'admin' && (
              <HeaderIconButton
                onClick={() => setLocation('/admin')}
                testId="button-admin-panel"
                title="Админ-панель"
              >
                <Settings size={18} />
              </HeaderIconButton>
            )}
            <HeaderIconButton onClick={() => logout()} testId="button-logout" title="Выйти">
              <LogOut size={18} />
            </HeaderIconButton>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4">
        {/* KPI hero */}
        <div
          className="p-5 mb-4"
          style={{
            background: 'var(--corp-brand)',
            color: 'var(--corp-brand-text)',
            borderRadius: 'var(--corp-r-xl)',
          }}
        >
          <div>
            <p
              className="text-[11px] font-bold uppercase"
              style={{ letterSpacing: '0.1em', opacity: 0.55 }}
            >
              {isMaster ? 'Активные проекты' : 'Общая прибыль'}
            </p>
            {isMaster ? (
              <p
                className="mt-2"
                style={{
                  fontSize: 36, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1,
                  fontFamily: 'var(--corp-mono)',
                }}
              >
                {activeProjectsCount}
              </p>
            ) : (
              <p
                className="mt-2"
                style={{
                  fontSize: 32, fontWeight: 700, letterSpacing: '-1px', lineHeight: 1,
                  fontFamily: 'var(--corp-mono)',
                  color: totalProfit >= 0 ? '#7eecaa' : '#ff8480',
                }}
              >
                {formatNumberRu(totalProfit)}
                <span style={{ fontSize: 14, opacity: 0.5, fontWeight: 500, marginLeft: 6 }}>AED</span>
              </p>
            )}
          </div>
          <div
            className="flex gap-3 mt-4 pt-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
          >
            <KpiSubMetric
              label="Активные"
              value={String(activeProjectsCount)}
              accent={isMaster}
            />
            {!isMaster && (
              <KpiSubMetric
                label="Расходы"
                value={`${(totalExpenses / 1000).toFixed(0)}k`}
                tone="neg"
              />
            )}
            {!isMaster && (
              <KpiSubMetric
                label="Авансы"
                value={`${(totalAdvances / 1000).toFixed(0)}k`}
              />
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {canEdit && (
            <QuickAction
              icon={Building2}
              label="Проект"
              onClick={() => setIsCreateModalOpen(true)}
              testId="quick-new-project"
            />
          )}
          <QuickAction
            icon={Coins}
            label="Расход"
            onClick={() => setLocation('/expenses')}
            testId="quick-expenses"
          />
          {!isMaster && (
            <QuickAction
              icon={Users}
              label="Заказчики"
              onClick={() => setLocation('/clients')}
              testId="quick-clients"
            />
          )}
          <QuickAction
            icon={HardHat}
            label="Подрядч."
            onClick={() => setLocation('/contractors')}
            testId="quick-contractors"
          />
        </div>

        {/* Архив-баннер */}
        {archivedProjectsCount > 0 && (
          <button
            type="button"
            onClick={() => setLocation('/archived-projects')}
            className="w-full mb-4 p-3 flex items-center gap-3 transition-all"
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

        {/* Заголовок проектов */}
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-[17px] font-bold"
            style={{ color: 'var(--corp-ink)', letterSpacing: '-0.3px' }}
          >
            {t('projects')}
          </h3>
          {canEdit && (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold transition-colors"
                  style={{
                    background: 'var(--corp-ink)',
                    color: 'var(--corp-brand-text)',
                    borderRadius: 'var(--corp-r)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-ink-2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-ink)'; }}
                  data-testid="button-create-project"
                >
                  <Plus size={14} />
                  Создать
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
                        {clients.map((client: any) => (
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
        ) : activeProjects.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              background: 'var(--corp-surface)',
              border: '1px dashed var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
          >
            <div
              className="w-12 h-12 mx-auto mb-3 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-muted)' }}
            >
              <Building2 size={20} />
            </div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--corp-ink-2)' }}>
              Пока нет активных проектов
            </p>
            <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              Создайте первый проект, чтобы начать работу
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {activeProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => setLocation(`/projects/${project.id}`)}
                onEdit={openEditModal}
                isExpanded={expandedProjects.has(project.id)}
                onToggleExpand={() => toggleProjectExpansion(project.id)}
                showEditButton={canEdit}
                userRole={user?.role}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNavigation currentPage="home" />

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

function KpiSubMetric({
  label, value, accent = false, tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  tone?: 'pos' | 'neg';
}) {
  const valueColor = accent ? '#7eecaa' : tone === 'neg' ? '#ff8480' : '#ffffff';
  return (
    <div className="flex-1">
      <p
        className="text-[10px] font-semibold uppercase"
        style={{ opacity: 0.55, letterSpacing: '0.05em' }}
      >
        {label}
      </p>
      <p
        className="text-[18px] font-bold mt-0.5"
        style={{
          letterSpacing: '-0.3px',
          color: valueColor,
          fontFamily: 'var(--corp-mono)',
        }}
      >
        {value}
      </p>
    </div>
  );
}
