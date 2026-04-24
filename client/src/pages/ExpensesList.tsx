import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { Plus, FileText, ChevronRight } from "lucide-react";
import { CorpHeader, CorpEmpty, CorpHeroSummary, MoneyAED } from "@/components/corp-ui";

interface Expense {
  id: string;
  amount: string;
  category: string;
  description: string;
  receiptUrl: string;
  createdAt: string;
  user: { id: string; name: string };
  project: { id: string; name: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  materials: 'Материалы',
  tools: 'Инструменты',
  transport: 'Транспорт',
  services: 'Услуги',
  salary_employees: 'Зарплата сотрудникам',
  salary_daily: 'Зарплата поднёвщикам',
  contractor_payments: 'Оплата подрядчикам',
  other: 'Прочее',
  uncategorized: 'Без категории',
};

export default function ExpensesList() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();

  const projectId = location.split('/')[2];

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/projects', projectId, 'expenses'],
  });

  const { data: project } = useQuery<{ id: string; name: string }>({
    queryKey: ['/api/projects', projectId],
  });

  const expensesByCategory = expenses.reduce((acc, e) => {
    const cat = e.category && e.category.trim() !== '' ? e.category : 'uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(e);
    return acc;
  }, {} as Record<string, Expense[]>);

  const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title="Все расходы"
        subtitle={project?.name}
        onBack={() => setLocation(`/projects/${projectId}`)}
        action={
          <button
            type="button"
            onClick={() => setLocation('/add-expense')}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
            style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
            data-testid="button-add-expense"
          >
            <Plus size={14} /> <span className="hidden sm:inline">{t('addExpense') || 'Расход'}</span>
          </button>
        }
      />

      <main className="px-4 pt-4">
        {!isLoading && expenses.length === 0 ? (
          <CorpEmpty
            icon={<FileText size={28} />}
            title="Нет расходов"
            description="Добавьте первый расход для этого проекта"
            actionLabel="Добавить расход"
            onAction={() => setLocation('/add-expense')}
          />
        ) : (
          <>
            <CorpHeroSummary
              label="Общая сумма расходов"
              amount={totalAmount}
              subtext={`Записей: ${expenses.length}`}
            />

            <h3
              className="text-[10px] font-bold uppercase mb-2"
              style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
            >
              По категориям
            </h3>
            <div className="flex flex-col gap-2">
              {Object.entries(expensesByCategory).map(([category, items]) => {
                const categoryTotal = items.reduce((s, e) => s + parseFloat(e.amount), 0);
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setLocation(`/expenses/${projectId}/${category}`)}
                    className="w-full p-4 text-left transition-all flex items-center gap-3"
                    style={{
                      background: 'var(--corp-surface)',
                      border: '1px solid var(--corp-line)',
                      borderRadius: 'var(--corp-r-lg)',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-surface)'; }}
                    data-testid={`category-card-${category}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[14px]" style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}>
                        {CATEGORY_LABELS[category] || category}
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--corp-muted)' }}>
                        {items.length} {items.length === 1 ? 'запись' : 'записей'}
                      </div>
                    </div>
                    <div className="text-right">
                      <MoneyAED amount={categoryTotal} size={14} weight={700} tone="neg" />
                    </div>
                    <ChevronRight size={18} style={{ color: 'var(--corp-muted)' }} />
                  </button>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
