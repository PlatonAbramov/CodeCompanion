import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, Plus, Edit, User
} from "lucide-react";

interface Advance {
  id: string;
  amount: string;
  recipient: string;
  description?: string;
  date: string;
  createdAt: string;
  user: { name: string };
}

interface Project {
  id: string;
  name: string;
}

export default function AdvancesList() {
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

  const { data: advances = [], isLoading } = useQuery<Advance[]>({
    queryKey: ['/api/projects', projectId, 'advances'],
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
                <h2 className="font-semibold text-slate-900">Выданные авансы</h2>
                {project?.name && (
                  <p className="text-sm text-slate-500">{project.name}</p>
                )}
              </div>
            </div>
            {user?.role === 'director' && (
              <Button 
                className="bg-primary text-white"
                onClick={() => setLocation(`/add-advance/${projectId}`)}
              >
                <Plus size={16} className="mr-1" />
                Добавить аванс
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        {advances.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="text-slate-400" size={32} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Нет авансов</h3>
              <p className="text-slate-500 mb-4">Пока не выдано ни одного аванса для этого проекта</p>
              {user?.role === 'director' && (
                <Button 
                  className="bg-primary text-white"
                  onClick={() => setLocation(`/add-advance/${projectId}`)}
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
            <Card className="shadow-sm bg-primary/5">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-slate-900">Выданные авансы</h3>
                    <p className="text-sm text-slate-500">
                      {advances.length} {advances.length === 1 ? 'аванс' : 'авансов'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">
                      {formatCurrency(
                        advances.reduce((sum, advance) => sum + parseFloat(advance.amount), 0).toString()
                      )}
                    </p>
                    <p className="text-sm text-slate-500">Всего выдано</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Advances List */}
            <div className="space-y-3">
              {advances.map((advance) => (
                <Card key={advance.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-lg text-slate-900">
                            {formatCurrency(advance.amount)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDate(advance.date)}
                          </p>
                        </div>
                        
                        <div className="flex items-center mb-2">
                          <User size={16} className="text-slate-400 mr-2" />
                          <p className="text-sm font-medium text-slate-700">
                            {advance.recipient}
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
                            onClick={() => {
                              toast({
                                title: "Редактирование аванса",
                                description: "Функция редактирования авансов будет реализована в следующем обновлении",
                              });
                            }}
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