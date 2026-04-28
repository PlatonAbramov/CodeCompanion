import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CalendarIcon, Clock, User, FileText, Activity,
  Filter, ChevronDown,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ru, enUS, hi } from "date-fns/locale";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { CorpHeader } from "@/components/corp-ui";
import { useLanguage } from "@/components/LanguageProvider";

const ACTION_COLORS: Record<string, { bg: string; fg: string }> = {
  create: { bg: 'var(--corp-pos-soft)', fg: 'var(--corp-pos)' },
  update: { bg: 'var(--corp-accent-soft)', fg: 'var(--corp-accent)' },
  delete: { bg: 'var(--corp-neg-soft)', fg: 'var(--corp-neg)' },
  archive: { bg: 'var(--corp-surface-2)', fg: 'var(--corp-muted)' },
  unarchive: { bg: 'rgba(245, 158, 11, 0.12)', fg: '#b45309' },
  upload: { bg: 'rgba(168, 85, 247, 0.12)', fg: '#7e22ce' },
  status_change: { bg: 'rgba(249, 115, 22, 0.12)', fg: '#c2410c' },
  progress_change: { bg: 'rgba(6, 182, 212, 0.12)', fg: '#0e7490' },
};

function getActionStyle(action: string) {
  return ACTION_COLORS[action] || { bg: 'var(--corp-surface-2)', fg: 'var(--corp-muted)' };
}

function History() {
  const [, params] = useRoute("/history/:projectId");
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const projectId = params?.projectId;

  const dateLocale = language === 'ru' ? ru : language === 'hi' ? hi : enUS;

  const ACTION_LABELS: Record<string, string> = {
    create: t('historyCreate'),
    update: t('historyUpdate'),
    delete: t('historyDelete'),
    archive: t('historyArchive'),
    unarchive: t('historyUnarchive'),
    upload: t('historyUpload'),
    status_change: t('historyStatusChange'),
    progress_change: t('historyProgressChange'),
    complete: t('historyComplete'),
  };

  const ENTITY_LABELS: Record<string, string> = {
    project: t('entityProject'),
    expense: t('entityExpense'),
    revenue: t('entityRevenue'),
    advance: t('entityAdvance'),
    customer_advance: t('entityCustomerAdvance'),
    owner_investment: t('entityOwnerInvestment'),
    document: t('entityDocument'),
    tool: t('entityTool'),
    contractor: t('entityContractor'),
    client: t('entityClient'),
    user: t('entityUser'),
    implementation_item: t('entityImplementationItem'),
    photo: t('entityPhoto'),
  };

  const FIELD_LABELS: Record<string, string> = {
    name: t('fieldName'),
    status: t('fieldStatus'),
    progress: t('fieldProgress'),
    amount: t('fieldAmount'),
    description: t('fieldDescription'),
    totalCost: t('fieldTotalCost'),
    location: t('fieldLocation'),
  };

  const ROLE_LABELS: Record<string, string> = {
    admin: t('roleAdminLong'),
    director: t('roleDirectorLong'),
    master: t('roleMasterLong'),
    client: t('roleClientLong'),
  };

  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined, to: undefined,
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["/api/audit-logs/project", projectId, entityTypeFilter, userFilter, dateRange],
    queryFn: async () => {
      if (!projectId) return [];
      const p = new URLSearchParams();
      if (entityTypeFilter && entityTypeFilter !== "all") p.append("entityType", entityTypeFilter);
      if (userFilter && userFilter !== "all") p.append("userId", userFilter);
      if (dateRange.from) p.append("startDate", dateRange.from.toISOString());
      if (dateRange.to) p.append("endDate", dateRange.to.toISOString());
      const res = await apiRequest(`/api/audit-logs/project/${projectId}?${p.toString()}`, { method: "GET" });
      return res.json();
    },
    enabled: !!projectId,
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await apiRequest("/api/users", { method: "GET" });
      return res.json();
    },
  });

  const hasActiveFilters = entityTypeFilter !== "all" || userFilter !== "all" || dateRange.from;

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={t('historyTitle')}
        subtitle={projectId ? `${t('projectShortLabel')} #${projectId.slice(0, 8)}` : undefined}
        onBack={() => projectId ? setLocation(`/projects/${projectId}`) : window.history.back()}
        action={
          <button
            type="button"
            onClick={() => setFiltersOpen(!filtersOpen)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
            style={{
              background: hasActiveFilters ? 'var(--corp-ink)' : 'var(--corp-surface-2)',
              color: hasActiveFilters ? '#fff' : 'var(--corp-ink-2)',
              borderRadius: 'var(--corp-r)',
            }}
            data-testid="button-toggle-filters"
          >
            <Filter size={14} /> <span className="hidden sm:inline">{t('filtersLabel')}</span>
            <ChevronDown size={12} style={{ transform: filtersOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        }
      />

      <main className="px-4 pt-4">
        {/* Filters */}
        {filtersOpen && (
          <div
            className="p-4 mb-4"
            style={{
              background: 'var(--corp-surface)',
              border: '1px solid var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p
                  className="text-[10px] uppercase font-bold mb-1"
                  style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                >
                  {t('objectTypeLabel')}
                </p>
                <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
                  <SelectTrigger className="h-9 text-[13px]" data-testid="filter-entity-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allTypesOption')}</SelectItem>
                    <SelectItem value="project">{t('projectsTypeOption')}</SelectItem>
                    <SelectItem value="expense">{t('expensesTypeOption')}</SelectItem>
                    <SelectItem value="revenue">{t('revenuesTypeOption')}</SelectItem>
                    <SelectItem value="advance">{t('advancesTypeOption')}</SelectItem>
                    <SelectItem value="customer_advance">{t('customerAdvancesTypeOption')}</SelectItem>
                    <SelectItem value="document">{t('documentsTypeOption')}</SelectItem>
                    <SelectItem value="implementation_item">{t('implementationItemsTypeOption')}</SelectItem>
                    <SelectItem value="contractor">{t('contractorsTypeOption')}</SelectItem>
                    <SelectItem value="client">{t('clientsTypeOption')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p
                  className="text-[10px] uppercase font-bold mb-1"
                  style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                >
                  {t('userFilterLabel')}
                </p>
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger className="h-9 text-[13px]" data-testid="filter-user">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('allUsersOption')}</SelectItem>
                    {users?.map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p
                  className="text-[10px] uppercase font-bold mb-1"
                  style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                >
                  {t('periodLabel')}
                </p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-9 w-full justify-start text-left font-normal text-[13px]",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>{format(dateRange.from, "d MMM", { locale: dateLocale })} – {format(dateRange.to, "d MMM", { locale: dateLocale })}</>
                        ) : (
                          format(dateRange.from, "d MMM yyyy", { locale: dateLocale })
                        )
                      ) : (
                        <span>{t('selectPeriodPlaceholder')}</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setEntityTypeFilter("all");
                  setUserFilter("all");
                  setDateRange({ from: undefined, to: undefined });
                }}
                className="mt-3 text-[12px] font-semibold transition-colors"
                style={{ color: 'var(--corp-accent)' }}
                data-testid="button-reset-filters"
              >
                {t('resetFilters')}
              </button>
            )}
          </div>
        )}

        {/* Audit logs */}
        {isLoading ? (
          <div className="py-8" />
        ) : auditLogs && auditLogs.length > 0 ? (
          <div className="flex flex-col gap-2">
            {auditLogs.map((log: any) => {
              const actionStyle = getActionStyle(log.action);
              return (
                <div
                  key={log.id}
                  className="p-3 sm:p-4"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                  }}
                  data-testid={`audit-log-${log.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: actionStyle.bg,
                          color: actionStyle.fg,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      <div className="flex items-center gap-1 text-[12px] min-w-0" style={{ color: 'var(--corp-ink-2)' }}>
                        <FileText size={12} style={{ color: 'var(--corp-muted)', flexShrink: 0 }} />
                        <span className="font-semibold truncate">{ENTITY_LABELS[log.entityType] || log.entityType}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] flex-shrink-0" style={{ color: 'var(--corp-ink-3)' }}>
                      <Clock size={11} />
                      <span style={{ fontFamily: 'var(--corp-mono)' }}>
                        {format(new Date(log.createdAt), "d MMM HH:mm", { locale: dateLocale })}
                      </span>
                    </div>
                  </div>

                  {log.fieldName && (
                    <div className="ml-1 mb-2 text-[12px]">
                      <span className="font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
                        {FIELD_LABELS[log.fieldName] || log.fieldName}:
                      </span>
                      {log.oldValue && (
                        <span className="ml-1.5" style={{ color: 'var(--corp-neg)' }}>
                          − {log.oldValue}
                        </span>
                      )}
                      {log.newValue && (
                        <span className="ml-1.5" style={{ color: 'var(--corp-pos)' }}>
                          + {log.newValue}
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className="flex items-center justify-between gap-2 pt-2 text-[11px]"
                    style={{ borderTop: '1px solid var(--corp-line)', color: 'var(--corp-muted)' }}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <User size={11} />
                      <span className="font-semibold truncate" style={{ color: 'var(--corp-ink-3)' }}>
                        {log.userName}
                      </span>
                      <span className="opacity-70">·</span>
                      <span>{ROLE_LABELS[log.userRole] || log.userRole}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--corp-mono)', whiteSpace: 'nowrap' }}>
                      {formatDistanceToNow(new Date(log.createdAt), { locale: dateLocale, addSuffix: true })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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
              <Activity size={28} />
            </div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--corp-ink-2)' }}>
              {t('noHistoryRecords')}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              {t('historyChangesAppearHere')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default History;
