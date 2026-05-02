import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useLanguage } from "@/components/LanguageProvider";
import { Plus, Receipt, ChevronRight, FileText } from "lucide-react";
import { CorpHeader, CorpEmpty, CorpHeroSummary, MoneyAED } from "@/components/corp-ui";
import { fmtDate } from "@/lib/locale";

interface Expense {
  id: string;
  amount: string;
  category: string;
  description: string;
  receiptUrl: string;
  createdAt: string;
  user?: { id: string; name: string };
  project?: { id: string; name: string };
}

const CATEGORY_KEY_MAP: Record<string, string> = {
  materials: 'materials',
  tools: 'tools',
  transport: 'transport',
  services: 'services',
  salary_employees: 'salaryEmployees',
  salary_daily: 'salaryDaily',
  contractor_payments: 'contractorPayments',
  other: 'other',
  uncategorized: 'uncategorized',
};

function getCategoryLabel(category: string, t: (k: string) => string): string {
  const key = CATEGORY_KEY_MAP[category] || category;
  const label = t(key);
  return label || category;
}

export default function MyExpenses() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { has, hasAny } = usePermissions();
  const { t, language } = useLanguage();

  const canCreate = has('expenses.create');
  const canViewAny = hasAny('expenses.view_all', 'expenses.view_own') ||
    user?.role === 'admin' || user?.role === 'director' || user?.role === 'master';

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
    enabled: canViewAny,
  });

  const sorted = [...expenses].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const totalAmount = expenses.reduce((s, e) => s + parseFloat(e.amount || '0'), 0);

  const homePath =
    user?.role === 'client' ? '/client-projects' :
    user?.role === 'master' ? '/master' :
    user?.role === 'worker' ? '/worker' :
    '/director';

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={t('allExpensesTitle') || 'Расходы'}
        onBack={() => setLocation(homePath)}
        action={
          canCreate ? (
            <button
              type="button"
              onClick={() => setLocation('/add-expense')}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
              style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-add-expense"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">{t('addExpenseShort') || t('addExpense')}</span>
            </button>
          ) : undefined
        }
      />

      <main className="px-4 pt-4">
        {!canViewAny ? (
          <CorpEmpty
            icon={<Receipt size={28} />}
            title={t('error') || 'Нет доступа'}
            description={t('forbiddenDescription') || 'У вас нет прав на просмотр расходов.'}
          />
        ) : !isLoading && expenses.length === 0 ? (
          <CorpEmpty
            icon={<FileText size={28} />}
            title={t('noExpensesTitle') || t('prDet_noExpensesYet')}
            description={t('noExpensesDescription') || ''}
            actionLabel={canCreate ? (t('addExpense') || 'Добавить расход') : undefined}
            onAction={canCreate ? () => setLocation('/add-expense') : undefined}
          />
        ) : (
          <>
            <CorpHeroSummary
              label={t('totalExpensesAmount') || t('expenses')}
              amount={totalAmount}
              subtext={`${t('recordsLabel') || ''}: ${expenses.length}`}
            />

            <div className="flex flex-col gap-2 mt-3">
              {sorted.map((expense) => (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() => expense.project?.id && setLocation(`/projects/${expense.project.id}`)}
                  className="w-full p-4 text-left flex items-center gap-3"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                    cursor: expense.project?.id ? 'pointer' : 'default',
                  }}
                  data-testid={`expense-row-${expense.id}`}
                >
                  <div
                    className="flex items-center justify-center flex-shrink-0"
                    style={{
                      width: 36,
                      height: 36,
                      background: 'var(--corp-surface-2)',
                      color: 'var(--corp-ink-2)',
                      borderRadius: 'var(--corp-r)',
                    }}
                  >
                    <Receipt size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>
                      {expense.description || getCategoryLabel(expense.category, t)}
                    </div>
                    <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--corp-muted)' }}>
                      {getCategoryLabel(expense.category, t)}
                      {expense.project?.name ? ` · ${expense.project.name}` : ''}
                      {expense.user?.name ? ` · ${expense.user.name}` : ''}
                      {' · '}
                      <span style={{ fontFamily: 'var(--corp-mono)' }}>{fmtDate(expense.createdAt, language)}</span>
                    </div>
                  </div>
                  <MoneyAED amount={expense.amount} size={14} weight={700} tone="neg" />
                  {expense.project?.id && <ChevronRight size={16} style={{ color: 'var(--corp-muted)' }} />}
                </button>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
