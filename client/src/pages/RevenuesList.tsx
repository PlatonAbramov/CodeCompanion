import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingUp } from "lucide-react";
import {
  CorpHeader, CorpEmpty, CorpHeroSummary, MoneyAED,
} from "@/components/corp-ui";
import { fmtDate } from "@/lib/locale";
import { AdvanceMenu } from "./AdvancesList";

interface Revenue {
  id: string;
  amount: string;
  description?: string;
  source?: string;
  date: string;
  createdAt: string;
  user: { name: string };
}

interface Project {
  id: string;
  name: string;
}

function getRecordWordRu(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'запись';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'записи';
  return 'записей';
}

export default function RevenuesList() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectId = location.split('/')[2];
  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';

  const { data: project } = useQuery<Project>({ queryKey: ['/api/projects', projectId] });
  const { data: revenues = [], isLoading } = useQuery<Revenue[]>({
    queryKey: ['/api/projects', projectId, 'revenues'],
  });

  const { mutate: deleteRevenue } = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/revenues/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete revenue');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: t('revenueDeleted'), description: t('revenueDeletedDescription') });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'revenues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
    },
    onError: (error: any) => {
      toast({ title: t('error'), description: error.message || t('revenueDeleteFailed'), variant: "destructive" });
    },
  });

  const total = revenues.reduce((s, r) => s + parseFloat(r.amount), 0);
  const countLabel = language === 'ru'
    ? `${revenues.length} ${getRecordWordRu(revenues.length)}`
    : `${revenues.length} ${revenues.length === 1 ? t('recordWordSingularRu') : t('recordWordManyRu')}`;

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={t('revenuesTitle')}
        subtitle={project?.name}
        onBack={() => setLocation(`/projects/${projectId}`)}
        action={isAdminOrDirector ? (
          <button
            type="button"
            onClick={() => setLocation(`/add-revenue?projectId=${projectId}`)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
            style={{ background: 'var(--corp-pos)', color: '#fff', borderRadius: 'var(--corp-r)' }}
            data-testid="button-add-revenue"
          >
            <Plus size={14} /> <span className="hidden sm:inline">{t('revenueWordShort')}</span>
          </button>
        ) : null}
      />

      <main className="px-4 pt-4">
        {!isLoading && revenues.length === 0 ? (
          <CorpEmpty
            icon={<TrendingUp size={28} />}
            title={t('noRevenuesTitle')}
            description={t('noRevenuesDescription')}
            actionLabel={isAdminOrDirector ? t('addRevenueAction') : undefined}
            onAction={isAdminOrDirector ? () => setLocation(`/add-revenue?projectId=${projectId}`) : undefined}
          />
        ) : (
          <>
            <CorpHeroSummary
              label={t('totalRevenuesLabel')}
              amount={total}
              subtext={countLabel}
              tone="pos"
            />

            <h3
              className="text-[10px] font-bold uppercase mb-2"
              style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
            >
              {t('revenuesHistory')}
            </h3>
            <div className="flex flex-col gap-2">
              {revenues.map((revenue) => (
                <div
                  key={revenue.id}
                  className="p-4"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                  }}
                  data-testid={`revenue-card-${revenue.id}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <MoneyAED amount={revenue.amount} size={18} weight={700} tone="pos" />
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[11px]"
                        style={{ color: 'var(--corp-ink-3)', fontFamily: 'var(--corp-mono)', whiteSpace: 'nowrap' }}
                      >
                        {fmtDate(revenue.date, language)}
                      </span>
                      {isAdminOrDirector && (
                        <AdvanceMenu
                          onEdit={() => setLocation(`/edit-revenue/${projectId}/${revenue.id}`)}
                          onDelete={() => deleteRevenue(revenue.id)}
                          deleteTitle={t('deleteRevenueConfirmTitle')}
                          deleteDescription={t('deleteRevenueConfirmDescription')}
                          editLabel={t('edit')}
                          deleteLabel={t('delete')}
                          cancelLabel={t('cancel')}
                        />
                      )}
                    </div>
                  </div>

                  {revenue.source && (
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <DollarSign size={13} style={{ color: 'var(--corp-muted)' }} />
                      <span className="text-[13px] font-medium" style={{ color: 'var(--corp-ink-2)' }}>
                        {revenue.source}
                      </span>
                    </div>
                  )}

                  {revenue.description && (
                    <p className="text-[12px] mb-1" style={{ color: 'var(--corp-ink-3)' }}>
                      {revenue.description}
                    </p>
                  )}
                  <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                    {t('addedByLabelShort')}: {revenue.user?.name || t('unknownUser')}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
