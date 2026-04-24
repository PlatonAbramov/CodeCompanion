import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign, TrendingUp } from "lucide-react";
import {
  CorpHeader, CorpEmpty, CorpHeroSummary, MoneyAED, fmtDateRu,
} from "@/components/corp-ui";
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

export default function RevenuesList() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
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
      toast({ title: "Доход удалён", description: "Доход успешно удалён" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'revenues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить доход", variant: "destructive" });
    },
  });

  const total = revenues.reduce((s, r) => s + parseFloat(r.amount), 0);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title="Доходы"
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
            <Plus size={14} /> <span className="hidden sm:inline">Доход</span>
          </button>
        ) : null}
      />

      <main className="px-4 pt-4">
        {!isLoading && revenues.length === 0 ? (
          <CorpEmpty
            icon={<TrendingUp size={28} />}
            title="Нет доходов"
            description="Добавьте первый доход для этого проекта"
            actionLabel={isAdminOrDirector ? "Добавить доход" : undefined}
            onAction={isAdminOrDirector ? () => setLocation(`/add-revenue?projectId=${projectId}`) : undefined}
          />
        ) : (
          <>
            <CorpHeroSummary
              label="Общие доходы"
              amount={total}
              subtext={`${revenues.length} ${revenues.length === 1 ? 'запись' : 'записей'}`}
              tone="pos"
            />

            <h3
              className="text-[10px] font-bold uppercase mb-2"
              style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
            >
              История доходов
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
                        {fmtDateRu(revenue.date)}
                      </span>
                      {isAdminOrDirector && (
                        <AdvanceMenu
                          onEdit={() => setLocation(`/edit-revenue/${projectId}/${revenue.id}`)}
                          onDelete={() => deleteRevenue(revenue.id)}
                          deleteTitle="Удалить доход?"
                          deleteDescription="Это действие нельзя отменить. Доход будет удалён безвозвратно."
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
                    Добавил: {revenue.user?.name || 'Неизвестно'}
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
