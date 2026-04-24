import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, DollarSign } from "lucide-react";
import {
  CorpHeader, CorpEmpty, CorpHeroSummary, MoneyAED, fmtDateRu,
} from "@/components/corp-ui";
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

export default function CustomerAdvancesList() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
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
      toast({ title: "Аванс удалён", description: "Аванс от заказчика успешно удалён" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'customer-advances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить аванс от заказчика", variant: "destructive" });
    },
  });

  const total = customerAdvances.reduce((s, a) => s + parseFloat(a.amount), 0);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title="Авансы от заказчика"
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
            <Plus size={14} /> <span className="hidden sm:inline">Аванс</span>
          </button>
        ) : null}
      />

      <main className="px-4 pt-4">
        {!isLoading && customerAdvances.length === 0 ? (
          <CorpEmpty
            icon={<DollarSign size={28} />}
            title="Нет авансов от заказчика"
            description="Полученные платежи от клиента появятся здесь"
            actionLabel={isAdminOrDirector ? "Добавить аванс" : undefined}
            onAction={isAdminOrDirector ? () => setLocation(`/add-customer-advance/${projectId}`) : undefined}
          />
        ) : (
          <>
            <CorpHeroSummary
              label="Всего получено"
              amount={total}
              subtext={`${customerAdvances.length} ${customerAdvances.length === 1 ? 'аванс' : 'авансов'}`}
              tone="pos"
            />

            <h3
              className="text-[10px] font-bold uppercase mb-2"
              style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
            >
              История поступлений
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
                        {fmtDateRu(advance.date)}
                      </span>
                      {isAdminOrDirector && (
                        <AdvanceMenu
                          onEdit={() => setLocation(`/edit-customer-advance/${projectId}/${advance.id}`)}
                          onDelete={() => deleteCustomerAdvance(advance.id)}
                          deleteTitle="Удалить аванс от заказчика?"
                          deleteDescription="Это действие нельзя отменить. Аванс будет удалён безвозвратно."
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
                    Добавил: {advance.user?.name || 'Неизвестно'}
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
