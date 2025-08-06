import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, Plus, Edit, DollarSign
} from "lucide-react";

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
  const { t } = useLanguage();
  const { toast } = useToast();

  // Extract projectId from URL path  
  const pathParts = location.split('/');
  const projectId = pathParts[2];

  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
  });

  const { data: customerAdvances = [], isLoading } = useQuery<CustomerAdvance[]>({
    queryKey: ['/api/projects', projectId, 'customer-advances'],
  });

  const goBack = () => {
    setLocation(`/project/${projectId}`);
  };

  const formatCurrency = (amount: string) => {
    if (!amount) return '';
    return new Intl.NumberFormat('ar-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
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
                <h2 className="font-semibold text-slate-900">Авансы от заказчика</h2>
                {project?.name && (
                  <p className="text-sm text-slate-500">{project.name}</p>
                )}
              </div>
            </div>
            {user?.role === 'director' && (
              <Button 
                className="bg-primary text-white"
                onClick={() => setLocation(`/add-customer-advance/${projectId}`)}
              >
                <Plus size={16} className="mr-1" />
                Добавить аванс
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        {customerAdvances.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="text-slate-400" size={32} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Нет авансов от заказчика</h3>
              <p className="text-slate-500 mb-4">Пока не получено ни одного аванса от заказчика для этого проекта</p>
              {user?.role === 'director' && (
                <Button 
                  className="bg-primary text-white"
                  onClick={() => setLocation(`/add-customer-advance/${projectId}`)}
                >
                  <Plus size={16} className="mr-1" />
                  Добавить аванс
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <Card className="shadow-sm bg-green-50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-slate-900">Авансы от заказчика</h3>
                    <p className="text-sm text-slate-500">
                      {customerAdvances.length} {customerAdvances.length === 1 ? 'аванс' : 'авансов'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(
                        customerAdvances.reduce((sum, advance) => sum + parseFloat(advance.amount), 0).toString()
                      )}
                    </p>
                    <p className="text-sm text-slate-500">Всего получено</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Advances List */}
            <div className="space-y-3">
              {customerAdvances.map((advance) => (
                <Card key={advance.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-lg text-green-600">
                            {formatCurrency(advance.amount)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDate(advance.date)}
                          </p>
                        </div>
                        
                        {advance.description && (
                          <p className="text-sm text-slate-600 mb-2">
                            {advance.description}
                          </p>
                        )}
                        
                        <p className="text-xs text-slate-400">
                          Добавил: {advance.user?.name || 'Неизвестно'}
                        </p>
                      </div>
                      
                      <div className="ml-4 flex items-center">
                        {user?.role === 'director' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation(`/edit-customer-advance/${projectId}/${advance.id}`)}
                            className="text-slate-600 border-slate-300 hover:bg-slate-100"
                          >
                            <Edit size={16} className="mr-2" />
                            Редактировать
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