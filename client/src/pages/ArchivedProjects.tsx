import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Archive, ArchiveRestore, Calendar,
  ChevronDown, ChevronUp, Package,
} from "lucide-react";
import { useState } from "react";
import { CorpHeader, MoneyAED } from "@/components/corp-ui";
import { useLanguage } from "@/components/LanguageProvider";
import { fmtDate } from "@/lib/locale";

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
}

function ProjectCard({
  project, onRestore, isExpanded, onToggleExpand,
}: {
  project: Project;
  onRestore: (projectId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();

  const { data: financialSummary } = useQuery<FinancialSummary>({
    queryKey: ['/api/projects', project.id, 'financial-summary'],
    enabled: isExpanded,
  });

  const currentProfit = parseFloat(financialSummary?.currentProfit || '0');
  const projectedProfit = parseFloat(financialSummary?.projectedProfit || '0');

  return (
    <div
      style={{
        background: 'var(--corp-surface)',
        border: '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
      }}
      data-testid={`archived-project-card-${project.id}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <button
            type="button"
            onClick={() => setLocation(`/projects/${project.id}`)}
            className="text-left flex-1 min-w-0"
          >
            <h3
              className="font-semibold text-[15px] truncate"
              style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
            >
              {project.name}
            </h3>
            {project.location && (
              <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--corp-muted)' }}>
                {project.location}
              </p>
            )}
          </button>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={() => onRestore(project.id)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--corp-accent)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-accent-soft)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              title={t('unarchive')}
              data-testid={`button-restore-${project.id}`}
            >
              <ArchiveRestore size={16} />
            </button>
            <button
              type="button"
              onClick={onToggleExpand}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--corp-ink-3)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              data-testid={`button-toggle-${project.id}`}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <div
            className="p-2.5 rounded-md"
            style={{ background: 'var(--corp-surface-2)' }}
          >
            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
              {t('cost')}
            </p>
            <div className="mt-1">
              <MoneyAED amount={project.totalCost} size={13} weight={700} tone="ink" />
            </div>
          </div>
          <div
            className="p-2.5 rounded-md"
            style={{ background: 'var(--corp-surface-2)' }}
          >
            <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
              {t('statusLabel')}
            </p>
            <p className="text-[13px] font-semibold mt-1" style={{ color: 'var(--corp-ink-2)' }}>
              {t('statusArchived')}
            </p>
          </div>
        </div>

        {isExpanded && financialSummary && (
          <div
            className="mt-3 pt-3 grid grid-cols-2 gap-2"
            style={{ borderTop: '1px solid var(--corp-line)' }}
          >
            <div>
              <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                {t('revenuesLabel')}
              </p>
              <div className="mt-1">
                <MoneyAED amount={financialSummary.totalRevenues} size={13} weight={700} tone="pos" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                {t('expensesLabel')}
              </p>
              <div className="mt-1">
                <MoneyAED amount={financialSummary.totalExpenses} size={13} weight={700} tone="neg" />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                {t('currentProfitLabel')}
              </p>
              <div className="mt-1">
                <MoneyAED amount={financialSummary.currentProfit} size={13} weight={700} tone={currentProfit >= 0 ? 'pos' : 'neg'} />
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                {t('projectedProfitLabel')}
              </p>
              <div className="mt-1">
                <MoneyAED amount={financialSummary.projectedProfit} size={13} weight={700} tone={projectedProfit >= 0 ? 'pos' : 'neg'} />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1.5 mt-3 text-[11px]" style={{ color: 'var(--corp-muted)' }}>
          <Calendar size={12} />
          <span>{t('archivedAtLabel')}: <span style={{ fontFamily: 'var(--corp-mono)' }}>{fmtDate(project.createdAt, language)}</span></span>
        </div>
      </div>
    </div>
  );
}

export default function ArchivedProjects() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects/archived'],
  });

  const restoreProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiRequest(`/api/projects/${projectId}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ archive: false }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/archived'] });
      toast({ title: t('success'), description: t('projectUnarchived') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('unarchiveFailed'), variant: "destructive" });
    },
  });

  const handleRestore = (projectId: string) => {
    if (window.confirm(t('unarchiveConfirm'))) {
      restoreProjectMutation.mutate(projectId);
    }
  };

  const toggleProjectExpand = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) newExpanded.delete(projectId);
    else newExpanded.add(projectId);
    setExpandedProjects(newExpanded);
  };

  const totalCost = projects.reduce((sum, p) => sum + parseFloat(p.totalCost || '0'), 0);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={t('archivedProjectsTitle')}
        subtitle={t('archivedProjectsSubtitle')}
        onBack={() => setLocation('/director')}
      />

      <main className="px-4 pt-4">
        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div
            className="p-3"
            style={{
              background: 'var(--corp-surface)',
              border: '1px solid var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] uppercase font-bold"
                  style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                >
                  {t('totalLabel')}
                </p>
                <p
                  className="font-bold mt-0.5"
                  style={{
                    fontFamily: 'var(--corp-mono)',
                    fontSize: 22,
                    color: 'var(--corp-ink)',
                    letterSpacing: '-0.5px',
                  }}
                >
                  {projects.length}
                </p>
              </div>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-3)' }}
              >
                <Archive size={16} />
              </div>
            </div>
          </div>

          <div
            className="p-3"
            style={{
              background: 'var(--corp-surface)',
              border: '1px solid var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p
                  className="text-[10px] uppercase font-bold"
                  style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                >
                  {t('cost')}
                </p>
                <div className="mt-0.5">
                  <MoneyAED amount={totalCost} size={16} weight={700} tone="ink" />
                </div>
              </div>
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'var(--corp-pos-soft)', color: 'var(--corp-pos)' }}
              >
                <Package size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Projects list */}
        {!isLoading && projects.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              background: 'var(--corp-surface)',
              border: '1px dashed var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-3)' }}
            >
              <Archive size={28} />
            </div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--corp-ink-2)' }}>
              {t('noArchivedProjects')}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              {t('noArchivedProjectsDescription')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onRestore={handleRestore}
                isExpanded={expandedProjects.has(project.id)}
                onToggleExpand={() => toggleProjectExpand(project.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
