import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign } from "lucide-react";
import {
  CorpHeader, CorpEmpty, CorpHeroSummary, MoneyAED,
} from "@/components/corp-ui";
import { fmtDate } from "@/lib/locale";
import { AdvanceMenu } from "./AdvancesList";

interface CustomerAdvance {
  id: string;
  amount: string;
  description?: string;
  date: string;
  createdAt: string;
  user: { name: string };
}

interface Project {
  id: string;
  name: string;
}

function getAdvanceWordRu(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'аванс';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'аванса';
  return 'авансов';
}

export default function CustomerAdvancesList() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectId = location.split('/')[2];
  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';

  const { data: project } = useQuery<Project>({ queryKey: ['/api/projects', projectId] });
  const { data: customerAdvances = [], isLoading } = useQuery<CustomerAdvance[]>({
    queryKey: ['/api/projects', projectId, 'customer-advances'],
  });

  const { mutate: deleteCustomerAdvance } = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/customer-advances/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete customer advance');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: t('customerAdvanceDeleted'), description: t('customerAdvanceDeletedDescription') });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'customer-advances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
    },
    onError: (error: any) => {
      toast({ title: t('error'), description: error.message || t('customerAdvanceDeleteFailed'), variant: "destructive" });
    },
  });

  const total = customerAdvances.reduce((s, a) => s + parseFloat(a.amount), 0);
  const countLabel = language === 'ru'
    ? `${customerAdvances.length} ${getAdvanceWordRu(customerAdvances.length)}`
    : `${customerAdvances.length} ${t('addCustomerAdvanceShort').toLowerCase()}${customerAdvances.length === 1 ? '' : language === 'en' ? 's' : ''}`;

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={t('customerAdvancesTitle')}
        subtitle={project?.name}
        onBack={() => setLocation(`/projects/${projectId}`)}
        action={isAdminOrDirector ? (
          <button
            type="button"
            onClick={() => setLocation(`/add-customer-advance/${projectId}`)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
            style={{ background: 'var(--corp-pos)', color: '#fff', borderRadius: 'var(--corp-r)' }}
            data-testid="button-add-customer-advance"
          >
            <Plus size={14} /> <span className="hidden sm:inline">{t('addCustomerAdvanceShort')}</span>
          </button>
        ) : null}
      />

      <main className="px-4 pt-4">
        {!isLoading && customerAdvances.length === 0 ? (
          <CorpEmpty
            icon={<DollarSign size={28} />}
            title={t('noCustomerAdvancesTitle')}
            description={t('noCustomerAdvancesDescription')}
            actionLabel={isAdminOrDirector ? t('addCustomerAdvanceAction') : undefined}
            onAction={isAdminOrDirector ? () => setLocation(`/add-customer-advance/${projectId}`) : undefined}
          />
        ) : (
          <>
            <CorpHeroSummary
              label={t('totalReceived')}
              amount={total}
              subtext={countLabel}
              tone="pos"
            />

            <h3
              className="text-[10px] font-bold uppercase mb-2"
              style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
            >
              {t('receivedHistory')}
            </h3>
            <div className="flex flex-col gap-2">
              {customerAdvances.map((advance) => (
                <div
                  key={advance.id}
                  className="p-4"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                  }}
                  data-testid={`customer-advance-card-${advance.id}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <MoneyAED amount={advance.amount} size={18} weight={700} tone="pos" />
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[11px]"
                        style={{ color: 'var(--corp-ink-3)', fontFamily: 'var(--corp-mono)', whiteSpace: 'nowrap' }}
                      >
                        {fmtDate(advance.date, language)}
                      </span>
                      {isAdminOrDirector && (
                        <AdvanceMenu
                          onEdit={() => setLocation(`/edit-customer-advance/${projectId}/${advance.id}`)}
                          onDelete={() => deleteCustomerAdvance(advance.id)}
                          deleteTitle={t('deleteCustomerAdvanceConfirmTitle')}
                          deleteDescription={t('deleteCustomerAdvanceConfirmDescription')}
                          editLabel={t('edit')}
                          deleteLabel={t('delete')}
                          cancelLabel={t('cancel')}
                        />
                      )}
                    </div>
                  </div>

                  {advance.description && (
                    <p className="text-[12px] mb-1" style={{ color: 'var(--corp-ink-3)' }}>
                      {advance.description}
                    </p>
                  )}
                  <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                    {t('addedByLabelShort')}: {advance.user?.name || t('unknownUser')}
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
