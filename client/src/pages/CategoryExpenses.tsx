import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, Plus, Eye, Edit, MoreVertical, Trash2
} from "lucide-react";

interface Expense {
  id: string;
  amount: string;
  category: string;
  description: string;
  receiptUrl: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  contractor?: {
    name: string;
    company?: string;
  };
}

export default function CategoryExpenses() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract projectId and category from URL path
  const pathParts = location.split('/');
  const projectId = pathParts[2];
  const category = pathParts[3];

  // Get project expenses
  const { data: allExpenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/projects', projectId, 'expenses'],
  });

  const { mutate: deleteExpense } = useMutation({
    mutationFn: async (expenseId: string) => {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete expense');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Расход удален",
        description: "Расход успешно удален",
      });
      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить расход",
        variant: "destructive",
      });
    },
  });

  // Get project details
  const { data: project } = useQuery<{id: string, name: string}>({
    queryKey: ['/api/projects', projectId],
  });

  // Filter expenses by category
  const expenses = allExpenses.filter(expense => expense.category === category);

  const goBack = () => {
    setLocation(`/expenses/${projectId}`);
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || "0");
    return `${num.toLocaleString("ru-RU")} AED`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'materials': 'Материалы',
      'tools': 'Инструменты', 
      'transport': 'Транспорт',
      'services': 'Услуги',
      'salary_employees': 'Зарплата действующим сотрудникам',
      'salary_daily': 'Зарплата поднёвщикам',
      'contractor_payments': 'Оплата подрядчикам',
      'other': 'Прочее'
    };
    return categoryMap[category] || category;
  };

  const openReceipt = (receiptUrl: string) => {
    // For local files, just open the URL directly
    if (receiptUrl.startsWith('/api/files/')) {
      window.open(receiptUrl, '_blank');
    } else {
      // Handle legacy URLs or show error
      toast({
        title: "Ошибка",
        description: "Файл не найден или поврежден",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goBack}
                className="mr-2"
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h2 className="font-semibold text-slate-900">{getCategoryLabel(category)}</h2>
                {project?.name && (
                  <p className="text-sm text-slate-500">{project.name}</p>
                )}
              </div>
            </div>
            <Button 
              className="bg-primary text-white"
              onClick={() => setLocation('/add-expense')}
            >
              <Plus size={16} className="mr-1" />
              {t('addExpense')}
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        {expenses.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-6 h-6 bg-primary rounded-full"></div>
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Нет расходов</h3>
              <p className="text-slate-500 mb-4">В категории "{getCategoryLabel(category)}" пока нет расходов</p>
              {(user?.role === 'admin' || user?.role === 'director') && (
                <Button 
                  className="bg-primary text-white"
                  onClick={() => setLocation('/add-expense')}
                >
                  <Plus size={16} className="mr-1" />
                  {t('addExpense')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Category Summary */}
            <Card className="shadow-sm bg-primary/5">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-slate-900">{getCategoryLabel(category)}</h3>
                    <p className="text-sm text-slate-500">
                      {expenses.length} {expenses.length === 1 ? 'запись' : 'записей'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(
                        expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toString()
                      )}
                    </p>
                    <p className="text-sm text-slate-500">Всего потрачено</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expenses List */}
            <div className="space-y-3">
              {expenses.map((expense) => (
                <Card key={expense.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-lg text-slate-900">
                            {formatCurrency(expense.amount)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDate(expense.createdAt)}
                          </p>
                        </div>
                        
                        {expense.description && (
                          <p className="text-sm text-slate-600 mb-2">
                            {expense.description}
                          </p>
                        )}
                        
                        <div className="space-y-1">
                          {expense.contractor && (
                            <p className="text-xs text-blue-600 font-medium">
                              Подрядчик: {expense.contractor.company || expense.contractor.name}
                            </p>
                          )}
                          <p className="text-xs text-slate-400">
                            Добавил: {expense.user?.name || 'Неизвестно'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="ml-4 flex items-center">
                        {(user?.role === 'admin' || user?.role === 'director' || expense.user.id === user?.id) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setLocation(`/edit-expense/${projectId}/${expense.id}`)}
                              >
                                <Edit size={16} className="mr-2" />
                                Редактировать
                              </DropdownMenuItem>
                              {expense.receiptUrl && (
                                <DropdownMenuItem
                                  onClick={() => openReceipt(expense.receiptUrl)}
                                >
                                  <Eye size={16} className="mr-2" />
                                  Просмотреть чек
                                </DropdownMenuItem>
                              )}
                              {(user?.role === 'admin' || user?.role === 'director') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                        className="text-red-600 focus:text-red-600"
                                      >
                                        <Trash2 size={16} className="mr-2" />
                                        Удалить
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Удалить расход?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Это действие нельзя отменить. Расход будет удален безвозвратно.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteExpense(expense.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Удалить
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}