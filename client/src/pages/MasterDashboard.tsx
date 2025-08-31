import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  HardHat, LogOut, Plus, Home, Receipt, PlusCircle,
  Check, Calendar
} from "lucide-react";

interface Expense {
  id: string;
  category: string;
  amount: string;
  description?: string;
  receiptUrl: string;
  createdAt: string;
  project: { name: string };
}

export default function MasterDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  // Get user expenses
  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
  });

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || "0");
    return `${num.toLocaleString("ru-RU")} AED`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center mr-3">
                <HardHat className="text-white" size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{user?.name}</h2>
                <p className="text-sm text-slate-500">{t('master')}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-accent to-orange-500 rounded-xl p-4 mb-6 text-white">
          <h3 className="font-semibold mb-2">Быстрые действия</h3>
          <Button 
            onClick={() => setLocation('/add-expense')}
            className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30"
          >
            <Plus size={16} className="mr-2" />
            {t('addExpense')}
          </Button>
        </div>
      </div>

      {/* My Expenses */}
      <div className="px-4 pb-20">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('myExpenses')}</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-slate-500">{t('loading')}</p>
          </div>
        ) : expenses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Receipt size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Пока нет расходов</p>
              <Button 
                onClick={() => setLocation('/add-expense')}
                className="mt-4 bg-primary text-white"
              >
                <Plus size={16} className="mr-2" />
                {t('addExpense')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => (
              <Card key={expense.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{expense.category}</h4>
                      {expense.description && (
                        <p className="text-sm text-slate-500">{expense.description}</p>
                      )}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
                    <span>Проект: {expense.project.name}</span>
                    <span>{formatDate(expense.createdAt)}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-secondary/10 rounded flex items-center justify-center mr-2">
                      <Check className="text-secondary" size={12} />
                    </div>
                    <span className="text-xs text-secondary">Чек прикреплен</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center py-2 text-primary">
            <Home size={20} className="mb-1" />
            <span className="text-xs">{t('home')}</span>
          </button>
          <button className="flex flex-col items-center py-2 text-slate-400">
            <Receipt size={20} className="mb-1" />
            <span className="text-xs">{t('expenses')}</span>
          </button>
          {(user?.role === 'admin' || user?.role === 'director') && (
            <button 
              className="flex flex-col items-center py-2 text-slate-400"
              onClick={() => setLocation('/add-expense')}
            >
              <PlusCircle size={20} className="mb-1" />
              <span className="text-xs">{t('add')}</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
