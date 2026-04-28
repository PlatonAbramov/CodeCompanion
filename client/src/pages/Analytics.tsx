import { useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon, TrendingUp, TrendingDown, Users, Package,
  Wrench, DollarSign, FileText, BarChart, X,
} from "lucide-react";
import { format } from "date-fns";
import { ru, enUS, hi } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { fmtNum } from "@/components/corp-ui";
import { useLanguage } from "@/components/LanguageProvider";

type Tone = 'ink' | 'pos' | 'neg' | 'accent';

const TONE_COLOR: Record<Tone, string> = {
  ink: 'var(--corp-ink)',
  pos: 'var(--corp-pos)',
  neg: 'var(--corp-neg)',
  accent: 'var(--corp-accent)',
};

interface MetricTileProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon: ReactNode;
  tone?: Tone;
  isCurrency?: boolean;
}

function MetricTile({ label, value, hint, icon, tone = 'ink', isCurrency }: MetricTileProps) {
  const color = TONE_COLOR[tone];
  return (
    <div
      className="p-4"
      style={{
        background: 'var(--corp-surface)',
        border: '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p
          className="text-[10px] uppercase font-bold"
          style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
        >
          {label}
        </p>
        <span style={{ color: 'var(--corp-ink-3)' }}>{icon}</span>
      </div>
      <div
        className="text-[22px] font-bold leading-none mb-1"
        style={{ color, fontFamily: 'var(--corp-mono)', letterSpacing: '-0.02em' }}
      >
        {value}
        {isCurrency && (
          <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 4, color: 'var(--corp-muted)' }}>
            {'\u00A0AED'}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Analytics() {
  const { t, language } = useLanguage();
  const dateLocale = language === 'ru' ? ru : language === 'hi' ? hi : enUS;
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined, to: undefined,
  });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedContractor, setSelectedContractor] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");

  const { data: projectAnalytics } = useQuery({
    queryKey: ["/api/analytics/projects", statusFilter, dateRange],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (statusFilter && statusFilter !== "all") p.append("status", statusFilter);
      if (dateRange.from) p.append("startDate", dateRange.from.toISOString());
      if (dateRange.to) p.append("endDate", dateRange.to.toISOString());
      const res = await apiRequest(`/api/analytics/projects?${p.toString()}`, { method: "GET" });
      return res.json();
    },
  });

  const { data: contractorAnalytics } = useQuery({
    queryKey: ["/api/analytics/contractors", selectedContractor],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (selectedContractor) p.append("contractorId", selectedContractor);
      const res = await apiRequest(`/api/analytics/contractors?${p.toString()}`, { method: "GET" });
      return res.json();
    },
  });

  const { data: clientAnalytics } = useQuery({
    queryKey: ["/api/analytics/clients", selectedClient],
    queryFn: async () => {
      const p = new URLSearchParams();
      if (selectedClient) p.append("clientId", selectedClient);
      const res = await apiRequest(`/api/analytics/clients?${p.toString()}`, { method: "GET" });
      return res.json();
    },
  });

  const { data: toolsAnalytics } = useQuery({
    queryKey: ["/api/analytics/tools"],
    queryFn: async () => {
      const res = await apiRequest("/api/analytics/tools", { method: "GET" });
      return res.json();
    },
  });

  const { data: contractors } = useQuery({
    queryKey: ["/api/contractors"],
    queryFn: async () => {
      const res = await apiRequest("/api/contractors", { method: "GET" });
      return res.json();
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const res = await apiRequest("/api/clients", { method: "GET" });
      return res.json();
    },
  });

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const tabClass = "text-[12px] font-semibold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm";

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--corp-surface)', borderBottom: '1px solid var(--corp-line)' }}
      >
        <div className="px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)' }}
            >
              <BarChart size={15} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-[16px] font-bold leading-tight truncate"
                style={{ color: 'var(--corp-ink)', letterSpacing: '-0.3px' }}
              >
                {t('analytics')}
              </h1>
              <p
                className="text-[10px] uppercase font-bold leading-tight"
                style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)', letterSpacing: '0.06em' }}
              >
                {t('anal_reportsSubtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-9 text-[12px] font-semibold",
                    !dateRange.from && "text-muted-foreground"
                  )}
                  data-testid="button-date-range"
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <span style={{ fontFamily: 'var(--corp-mono)' }}>
                        {format(dateRange.from, "d MMM", { locale: dateLocale })}–{format(dateRange.to, "d MMM", { locale: dateLocale })}
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'var(--corp-mono)' }}>
                        {format(dateRange.from, "d MMM", { locale: dateLocale })}
                      </span>
                    )
                  ) : (
                    <span className="hidden sm:inline">{t('anal_period')}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                  locale={dateLocale}
                />
              </PopoverContent>
            </Popover>
            {dateRange.from && (
              <button
                type="button"
                onClick={() => setDateRange({ from: undefined, to: undefined })}
                className="w-9 h-9 rounded flex items-center justify-center transition-colors"
                style={{ color: 'var(--corp-ink-3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                data-testid="button-reset-date"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="px-4 pt-4">
        <Tabs defaultValue="projects" className="space-y-4">
          <TabsList
            className="grid w-full grid-cols-4 p-1 h-auto"
            style={{ background: 'var(--corp-surface-2)', borderRadius: 'var(--corp-r)' }}
          >
            <TabsTrigger value="projects" className={tabClass} style={{ borderRadius: 'calc(var(--corp-r) - 2px)' }} data-testid="tab-projects">
              {t('projects')}
            </TabsTrigger>
            <TabsTrigger value="contractors" className={tabClass} style={{ borderRadius: 'calc(var(--corp-r) - 2px)' }} data-testid="tab-contractors">
              {t('contractors')}
            </TabsTrigger>
            <TabsTrigger value="clients" className={tabClass} style={{ borderRadius: 'calc(var(--corp-r) - 2px)' }} data-testid="tab-clients">
              {t('anal_clientsTab')}
            </TabsTrigger>
            <TabsTrigger value="tools" className={tabClass} style={{ borderRadius: 'calc(var(--corp-r) - 2px)' }} data-testid="tab-tools">
              {t('tools')}
            </TabsTrigger>
          </TabsList>

          {/* Projects */}
          <TabsContent value="projects" className="space-y-3">
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
              <MetricTile
                label={t('activeProjects')}
                value={projectAnalytics?.activeCount || 0}
                hint={t('anal_projectsInWork')}
                icon={<Package size={14} />}
              />
              <MetricTile
                label={t('anal_archived')}
                value={projectAnalytics?.archivedCount || 0}
                hint={t('anal_completedPlural')}
                icon={<FileText size={14} />}
              />
              <MetricTile
                label={t('anal_avgProgress')}
                value={formatPercent(projectAnalytics?.averageProgress || 0)}
                hint={t('anal_byAllProjects')}
                icon={<BarChart size={14} />}
                tone="accent"
              />
              <MetricTile
                label={t('cost')}
                value={fmtNum(projectAnalytics?.totalContractValue || 0)}
                hint={t('anal_totalContractsSum')}
                icon={<DollarSign size={14} />}
                isCurrency
              />
              <MetricTile
                label={t('expenses')}
                value={fmtNum(projectAnalytics?.totalExpenses || 0)}
                hint={t('totalExpenses')}
                icon={<TrendingDown size={14} />}
                tone="neg"
                isCurrency
              />
              <MetricTile
                label={t('anal_payments')}
                value={fmtNum(projectAnalytics?.totalPayments || 0)}
                hint={t('anal_paymentsReceived')}
                icon={<TrendingUp size={14} />}
                tone="pos"
                isCurrency
              />
            </div>

            <div
              className="p-3"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
              }}
            >
              <p
                className="text-[10px] uppercase font-bold mb-1.5"
                style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
              >
                {t('anal_filterByStatus')}
              </p>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-[13px] max-w-xs" data-testid="filter-project-status">
                  <SelectValue placeholder={t('anal_allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('anal_allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('filterActive')}</SelectItem>
                  <SelectItem value="completed">{t('anal_completedPlural')}</SelectItem>
                  <SelectItem value="paused">{t('anal_paused')}</SelectItem>
                  <SelectItem value="archived">{t('anal_archived')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Contractors */}
          <TabsContent value="contractors" className="space-y-3">
            <div
              className="p-3"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
              }}
            >
              <p
                className="text-[10px] uppercase font-bold mb-1.5"
                style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
              >
                {t('anal_selectContractorTitle')}
              </p>
              <Select value={selectedContractor} onValueChange={setSelectedContractor}>
                <SelectTrigger className="h-9 text-[13px]" data-testid="filter-contractor">
                  <SelectValue placeholder={t('selectContractor')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('anal_allContractors')}</SelectItem>
                  {contractors?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {contractorAnalytics && contractorAnalytics.length > 0 && (
              <div className="flex flex-col gap-2">
                {contractorAnalytics.map((c: any) => (
                  <div
                    key={c.contractorId}
                    className="p-4"
                    style={{
                      background: 'var(--corp-surface)',
                      border: '1px solid var(--corp-line)',
                      borderRadius: 'var(--corp-r-lg)',
                    }}
                    data-testid={`contractor-stats-${c.contractorId}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <h4
                          className="text-[14px] font-semibold truncate"
                          style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}
                        >
                          {c.contractorName}
                        </h4>
                        <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                          {c.specialization}
                        </p>
                      </div>
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: 'var(--corp-accent-soft)',
                          color: 'var(--corp-accent)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {t('anal_projectsCount').replace('{count}', String(c.totalProjects))}
                      </span>
                    </div>
                    <div
                      className="grid grid-cols-2 gap-3 pt-3"
                      style={{ borderTop: '1px solid var(--corp-line)' }}
                    >
                      <div>
                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                          {t('budget')}
                        </p>
                        <p className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}>
                          {fmtNum(Number(c.totalBudget))}
                          <span style={{ fontSize: 9, marginLeft: 2, color: 'var(--corp-muted)' }}>{'\u00A0AED'}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                          {t('expenses')}
                        </p>
                        <p className="text-[14px] font-bold" style={{ color: 'var(--corp-neg)', fontFamily: 'var(--corp-mono)' }}>
                          {fmtNum(Number(c.totalExpenses))}
                          <span style={{ fontSize: 9, marginLeft: 2, color: 'var(--corp-muted)' }}>{'\u00A0AED'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Clients */}
          <TabsContent value="clients" className="space-y-3">
            <div
              className="p-3"
              style={{
                background: 'var(--corp-surface)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r-lg)',
              }}
            >
              <p
                className="text-[10px] uppercase font-bold mb-1.5"
                style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
              >
                {t('anal_selectClientTitle')}
              </p>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="h-9 text-[13px]" data-testid="filter-client">
                  <SelectValue placeholder={t('selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('anal_allClients')}</SelectItem>
                  {clients?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {clientAnalytics && clientAnalytics.length > 0 && (
              <div className="flex flex-col gap-2">
                {clientAnalytics.map((c: any) => (
                  <div
                    key={c.clientId}
                    className="p-4"
                    style={{
                      background: 'var(--corp-surface)',
                      border: '1px solid var(--corp-line)',
                      borderRadius: 'var(--corp-r-lg)',
                    }}
                    data-testid={`client-stats-${c.clientId}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4
                        className="text-[14px] font-semibold truncate"
                        style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}
                      >
                        {c.clientName}
                      </h4>
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: 'var(--corp-accent-soft)',
                          color: 'var(--corp-accent)',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {t('anal_projectsCount').replace('{count}', String(c.totalProjects))}
                      </span>
                    </div>
                    <div
                      className="grid grid-cols-2 gap-3 pt-3"
                      style={{ borderTop: '1px solid var(--corp-line)' }}
                    >
                      <div>
                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                          {t('anal_contractsSum')}
                        </p>
                        <p className="text-[14px] font-bold" style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}>
                          {fmtNum(Number(c.totalContractValue))}
                          <span style={{ fontSize: 9, marginLeft: 2, color: 'var(--corp-muted)' }}>{'\u00A0AED'}</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
                          {t('paid')}
                        </p>
                        <p className="text-[14px] font-bold" style={{ color: 'var(--corp-pos)', fontFamily: 'var(--corp-mono)' }}>
                          {fmtNum(Number(c.totalPayments))}
                          <span style={{ fontSize: 9, marginLeft: 2, color: 'var(--corp-muted)' }}>{'\u00A0AED'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Tools */}
          <TabsContent value="tools" className="space-y-3">
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-3">
              <MetricTile
                label={t('anal_totalTools')}
                value={toolsAnalytics?.totalTools || 0}
                hint={t('anal_inDatabase')}
                icon={<Wrench size={14} />}
              />
              <MetricTile
                label={t('anal_available')}
                value={toolsAnalytics?.availableTools || 0}
                hint={t('anal_inStock')}
                icon={<Package size={14} />}
                tone="pos"
              />
              <MetricTile
                label={t('anal_issued')}
                value={toolsAnalytics?.outTools || 0}
                hint={t('anal_inWorkShort')}
                icon={<Users size={14} />}
                tone="accent"
              />
              <MetricTile
                label={t('anal_writtenOff')}
                value={toolsAnalytics?.writtenOffTools || 0}
                hint={t('anal_decommissioned')}
                icon={<FileText size={14} />}
                tone="neg"
              />
              <MetricTile
                label={t('cost')}
                value={fmtNum(Number(toolsAnalytics?.totalValue || 0))}
                hint={t('anal_totalShort')}
                icon={<DollarSign size={14} />}
                isCurrency
              />
              <MetricTile
                label={t('anal_operations')}
                value={toolsAnalytics?.totalMovements || 0}
                hint={t('anal_operationsHint')
                  .replace('{issues}', String(toolsAnalytics?.totalIssues || 0))
                  .replace('{returns}', String(toolsAnalytics?.totalReturns || 0))}
                icon={<BarChart size={14} />}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default Analytics;
