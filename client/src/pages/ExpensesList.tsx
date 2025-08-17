import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, Plus, Eye, FileText
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
}

export default function ExpensesList() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Extract projectId from URL path
  const projectId = location.split('/')[2];

  // Get project expenses
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/projects', projectId, 'expenses'],
  });

  // Get project details
  const { data: project } = useQuery<{id: string, name: string}>({
    queryKey: ['/api/projects', projectId],
  });

  const goBack = () => {
    setLocation(`/projects/${projectId}`);
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

  // Group expenses by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(expense);
    return acc;
  }, {} as { [key: string]: Expense[] });

  const openReceipt = (receiptUrl: string) => {
    // For local files, just open the URL directly
    if (receiptUrl.startsWith('/api/files/')) {
      window.open(receiptUrl, '_blank');
    } else {
      // Handle legacy URLs - show error message
      console.warn('Legacy receipt URL:', receiptUrl);
      window.open(receiptUrl, '_blank'); // Try to open anyway, might work
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
                <h2 className="font-semibold text-slate-900">Все расходы</h2>
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
                <FileText className="text-slate-400" size={32} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Нет расходов</h3>
              <p className="text-slate-500 mb-4">Пока не добавлено ни одного расхода для этого проекта</p>
              <Button 
                className="bg-primary text-white"
                onClick={() => setLocation('/add-expense')}
              >
                <Plus size={16} className="mr-1" />
                {t('addExpense')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {Object.entries(expensesByCategory).map(([category, categoryExpenses]) => (
              <Card 
                key={category} 
                className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation(`/expenses/${projectId}/${category}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary rounded-full mr-3"></div>
                      <div>
                        <h3 className="font-semibold text-slate-900">
                          {getCategoryLabel(category)}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {categoryExpenses.length} {categoryExpenses.length === 1 ? 'запись' : 'записей'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(
                          categoryExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toString()
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        Всего потрачено
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Total Summary */}
            <Card className="shadow-sm bg-primary/5">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-slate-900">
                    Общая сумма расходов:
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrency(
                      expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toString()
                    )}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Всего записей: {expenses.length}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}