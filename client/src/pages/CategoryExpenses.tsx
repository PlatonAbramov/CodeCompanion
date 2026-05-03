import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Eye, Edit, MoreVertical, Trash2, Briefcase } from "lucide-react";
import {
  CorpHeader, CorpEmpty, CorpHeroSummary, MoneyAED,
} from "@/components/corp-ui";
import { fmtDate } from "@/lib/locale";

interface Expense {
  id: string;
  amount: string;
  category: string;
  description: string;
  receiptUrl: string;
  createdAt: string;
  user: { id: string; name: string };
  project: { id: string; name: string };
  contractor?: { name: string; company?: string };
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

function getRecordWordRu(count: number): 'recordSingular' | 'recordFew' | 'recordMany' {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return 'recordMany';
  if (n1 > 1 && n1 < 5) return 'recordFew';
  if (n1 === 1) return 'recordSingular';
  return 'recordMany';
}

export default function CategoryExpenses() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { has } = usePermissions();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const pathParts = location.split('/');
  const projectId = pathParts[2];
  const category = pathParts[3];

  const { data: allExpenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/projects', projectId, 'expenses'],
  });

  const { data: project } = useQuery<{ id: string; name: string }>({
    queryKey: ['/api/projects', projectId],
  });

  const { mutate: deleteExpense } = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete expense');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: t('expenseDeleted'), description: t('expenseDeletedSuccess') });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
    },
    onError: (error: any) => {
      toast({ title: t('error'), description: error.message || t('deleteExpenseFailed'), variant: "destructive" });
    },
  });

  const expenses = category === 'uncategorized'
    ? allExpenses.filter((e) => !e.category || e.category.trim() === '')
    : allExpenses.filter((e) => e.category === category);

  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';
  const categoryKey = CATEGORY_KEY_MAP[category] || category;
  const categoryLabel = t(categoryKey) || category;
  const recordWord = language === 'ru'
    ? t(getRecordWordRu(expenses.length))
    : t('recordMany');

  const openReceipt = (receiptUrl: string) => {
    if (!receiptUrl) {
      toast({ title: t('error'), description: t('fileNotFound'), variant: "destructive" });
      return;
    }
    // Поддерживаем оба варианта хранения: локальный /api/files/... и облачный /objects/...
    if (
      receiptUrl.startsWith('/api/files/') ||
      receiptUrl.startsWith('/objects/') ||
      receiptUrl.startsWith('http://') ||
      receiptUrl.startsWith('https://')
    ) {
      window.open(receiptUrl, '_blank');
    } else {
      toast({ title: t('error'), description: t('fileNotFound'), variant: "destructive" });
    }
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={categoryLabel}
        subtitle={project?.name}
        onBack={() => setLocation(`/expenses/${projectId}`)}
        action={
          <button
            type="button"
            onClick={() => setLocation('/add-expense')}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
            style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
            data-testid="button-add-expense"
          >
            <Plus size={14} /> <span className="hidden sm:inline">{t('addExpenseShort')}</span>
          </button>
        }
      />

      <main className="px-4 pt-4">
        {!isLoading && expenses.length === 0 ? (
          <CorpEmpty
            icon={<Briefcase size={28} />}
            title={t('noExpensesTitle')}
            description={`${t('noCategoryExpensesPrefix')} «${categoryLabel}» ${t('noCategoryExpensesSuffix')}`.trim()}
            actionLabel={isAdminOrDirector ? t('addExpense') : undefined}
            onAction={isAdminOrDirector ? () => setLocation('/add-expense') : undefined}
          />
        ) : (
          <>
            <CorpHeroSummary
              label={categoryLabel}
              amount={total}
              subtext={`${expenses.length} ${recordWord}`}
            />

            <h3
              className="text-[10px] font-bold uppercase mb-2"
              style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
            >
              {t('allExpensesTitle')}
            </h3>
            <div className="flex flex-col gap-2">
              {expenses.map((expense) => {
                const isOwn = expense.user.id === user?.id;
                // Право удалять собственный / чужие расход.
                const canDeleteOwn = has('expenses.delete_own');
                const canDeleteAny = has('expenses.delete_any');
                const canDelete = canDeleteAny || (isOwn && canDeleteOwn);
                // Меню (Edit / Delete / View receipt) показываем, если есть
                // право редактировать (для admin/director или владельца расхода)
                // или удалить.
                const canEdit = isAdminOrDirector || isOwn || canDelete;
                return (
                  <div
                    key={expense.id}
                    className="p-4"
                    style={{
                      background: 'var(--corp-surface)',
                      border: '1px solid var(--corp-line)',
                      borderRadius: 'var(--corp-r-lg)',
                    }}
                    data-testid={`expense-card-${expense.id}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <MoneyAED amount={expense.amount} size={18} weight={700} tone="neg" />
                      <div className="flex items-center gap-1">
                        <span
                          className="text-[11px]"
                          style={{ color: 'var(--corp-ink-3)', fontFamily: 'var(--corp-mono)', whiteSpace: 'nowrap' }}
                        >
                          {fmtDate(expense.createdAt, language)}
                        </span>
                        {canEdit && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                                style={{ color: 'var(--corp-ink-3)' }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                data-testid={`menu-trigger-${expense.id}`}
                              >
                                <MoreVertical size={15} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setLocation(`/edit-expense/${projectId}/${expense.id}`)}>
                                <Edit size={14} className="mr-2" /> {t('edit')}
                              </DropdownMenuItem>
                              {expense.receiptUrl && (
                                <DropdownMenuItem onClick={() => openReceipt(expense.receiptUrl)}>
                                  <Eye size={14} className="mr-2" /> {t('viewReceiptAction')}
                                </DropdownMenuItem>
                              )}
                              {canDelete && (
                                <>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 size={14} className="mr-2" /> {t('delete')}
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>{t('deleteExpenseConfirmTitle')}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          {t('deleteExpenseConfirmDescription')}
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteExpense(expense.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          {t('delete')}
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>

                    {expense.description && (
                      <p className="text-[12px] mb-1.5" style={{ color: 'var(--corp-ink-3)' }}>
                        {expense.description}
                      </p>
                    )}

                    {expense.contractor && (
                      <p className="text-[11px] mb-0.5">
                        <span style={{ color: 'var(--corp-muted)' }}>{t('contractorLabel')}: </span>
                        <span style={{ color: 'var(--corp-accent)', fontWeight: 600 }}>
                          {expense.contractor.company || expense.contractor.name}
                        </span>
                      </p>
                    )}

                    <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                      {t('addedByLabel')}: {expense.user?.name || t('unknownUser')}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
