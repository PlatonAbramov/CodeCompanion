import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Wallet } from "lucide-react";
import {
  CorpHeader, CorpHeroSummary, MoneyAED,
} from "@/components/corp-ui";
import { fmtDate, fmtNumber } from "@/lib/locale";
import { AdvanceMenu } from "./AdvancesList";

interface OwnerInvestment {
  id: string;
  amount: string;
  investor: 'vlad' | 'platon';
  description?: string;
  date: string;
  createdAt: string;
}

export default function OwnerInvestmentsList() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectId = location.split('/')[2];
  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';

  const { data: ownerInvestments = [], isLoading } = useQuery<OwnerInvestment[]>({
    queryKey: ['/api/projects', projectId, 'owner-investments'],
  });

  const deleteOwnerInvestmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/owner-investments/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'owner-investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
      toast({ title: t('success'), description: t('investmentDeleted') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('investmentDeleteFailed'), variant: "destructive" });
    },
  });

  const vladInvestments = ownerInvestments.filter((inv) => inv.investor === 'vlad');
  const platonInvestments = ownerInvestments.filter((inv) => inv.investor === 'platon');
  const vladTotal = vladInvestments.reduce((s, inv) => s + parseFloat(inv.amount), 0);
  const platonTotal = platonInvestments.reduce((s, inv) => s + parseFloat(inv.amount), 0);

  const renderList = (
    investments: OwnerInvestment[],
    investorKey: 'vlad' | 'platon',
  ) => (
    <div className="flex flex-col gap-2">
      {isAdminOrDirector && (
        <button
          type="button"
          onClick={() => setLocation(`/add-owner-investment/${projectId}?investor=${investorKey}`)}
          className="self-end inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-semibold transition-colors mb-1"
          style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
          data-testid={`button-add-investment-${investorKey}`}
        >
          <Plus size={13} /> {t('addInvestmentAction')}
        </button>
      )}

      {investments.length === 0 ? (
        <div
          className="p-6 text-center"
          style={{
            background: 'var(--corp-surface)',
            border: '1px dashed var(--corp-line)',
            borderRadius: 'var(--corp-r-lg)',
          }}
        >
          <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
            {t('noInvestmentsForInvestor')}
          </p>
        </div>
      ) : (
        investments.map((investment) => (
          <div
            key={investment.id}
            className="p-4"
            style={{
              background: 'var(--corp-surface)',
              border: '1px solid var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
            data-testid={`owner-investment-card-${investment.id}`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <MoneyAED amount={investment.amount} size={18} weight={700} tone="neg" />
              <div className="flex items-center gap-1">
                <span
                  className="text-[11px]"
                  style={{ color: 'var(--corp-ink-3)', fontFamily: 'var(--corp-mono)', whiteSpace: 'nowrap' }}
                >
                  {fmtDate(investment.date, language)}
                </span>
                {isAdminOrDirector && (
                  <AdvanceMenu
                    onEdit={() => setLocation(`/edit-owner-investment/${investment.id}`)}
                    onDelete={() => deleteOwnerInvestmentMutation.mutate(investment.id)}
                    deleteTitle={t('deleteInvestmentConfirmTitle')}
                    deleteDescription={t('deleteInvestmentConfirmDescription')}
                    editLabel={t('edit')}
                    deleteLabel={t('delete')}
                    cancelLabel={t('cancel')}
                  />
                )}
              </div>
            </div>

            {investment.description && (
              <p className="text-[12px]" style={{ color: 'var(--corp-ink-3)' }}>
                {investment.description}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={t('ownerInvestmentsTitle')}
        subtitle={t('ownerInvestmentsSubtitle')}
        onBack={() => setLocation(`/projects/${projectId}`)}
      />

      <main className="px-4 pt-4">
        {!isLoading && (
          <CorpHeroSummary
            label={t('totalInvestmentsLabel')}
            amount={vladTotal + platonTotal}
            subtext={`${t('investorVlad')}: ${fmtNumber(Math.round(vladTotal), language)} · ${t('investorPlaton')}: ${fmtNumber(Math.round(platonTotal), language)}`}
            tone="dark"
          />
        )}

        <Tabs defaultValue="vlad" className="w-full">
          <TabsList
            className="grid w-full grid-cols-2 p-1 h-auto"
            style={{
              background: 'var(--corp-surface-2)',
              borderRadius: 'var(--corp-r)',
            }}
          >
            <TabsTrigger
              value="vlad"
              className="text-[12px] font-semibold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              style={{ borderRadius: 'calc(var(--corp-r) - 2px)' }}
              data-testid="tab-vlad"
            >
              <span className="flex items-center gap-1.5">
                <Wallet size={13} /> {t('investorVlad')}
                <span style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-muted)', fontWeight: 600 }}>
                  {fmtNumber(Math.round(vladTotal), language)}
                </span>
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="platon"
              className="text-[12px] font-semibold py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm"
              style={{ borderRadius: 'calc(var(--corp-r) - 2px)' }}
              data-testid="tab-platon"
            >
              <span className="flex items-center gap-1.5">
                <Wallet size={13} /> {t('investorPlaton')}
                <span style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-muted)', fontWeight: 600 }}>
                  {fmtNumber(Math.round(platonTotal), language)}
                </span>
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vlad" className="mt-4">
            {renderList(vladInvestments, 'vlad')}
          </TabsContent>
          <TabsContent value="platon" className="mt-4">
            {renderList(platonInvestments, 'platon')}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
