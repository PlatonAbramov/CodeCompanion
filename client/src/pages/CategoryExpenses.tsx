import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, Plus, Eye
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

export default function CategoryExpenses() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  
  // Extract projectId and category from URL path
  const pathParts = location.split('/');
  const projectId = pathParts[2];
  const category = pathParts[3];

  // Get project expenses
  const { data: allExpenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/projects', projectId, 'expenses'],
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
    return new Intl.NumberFormat('ar-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
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
      'other': 'Прочее'
    };
    return categoryMap[category] || category;
  };

  const openReceipt = (receiptUrl: string) => {
    // Open receipt in new tab
    window.open(receiptUrl, '_blank');
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
                        
                        <p className="text-xs text-slate-400">
                          Добавил: {expense.user.name}
                        </p>
                      </div>
                      
                      <div className="ml-4 flex items-center">
                        {expense.receiptUrl && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openReceipt(expense.receiptUrl)}
                            className="text-primary border-primary hover:bg-primary hover:text-white"
                          >
                            <Eye size={16} className="mr-2" />
                            Посмотреть чек
                          </Button>
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