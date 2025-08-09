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
  ArrowLeft, Plus, Edit, MoreVertical, Trash2, DollarSign
} from "lucide-react";

interface Revenue {
  id: string;
  amount: string;
  description?: string;
  source?: string;
  date: string;
  createdAt: string;
  user: { name: string };
}

interface Project {
  id: string;
  name: string;
}

export default function RevenuesList() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract projectId from URL path  
  const pathParts = location.split('/');
  const projectId = pathParts[2];

  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
  });

  const { data: revenues = [], isLoading } = useQuery<Revenue[]>({
    queryKey: ['/api/projects', projectId, 'revenues'],
  });

  const { mutate: deleteRevenue } = useMutation({
    mutationFn: async (revenueId: string) => {
      const response = await fetch(`/api/revenues/${revenueId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete revenue');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Доход удален",
        description: "Доход успешно удален",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'revenues'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить доход",
        variant: "destructive",
      });
    },
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
                <h2 className="font-semibold text-slate-900">Доходы</h2>
                {project?.name && (
                  <p className="text-sm text-slate-500">{project.name}</p>
                )}
              </div>
            </div>
            {user?.role === 'director' && (
              <Button 
                className="bg-primary text-white"
                onClick={() => setLocation(`/add-revenue?projectId=${projectId}`)}
              >
                <Plus size={16} className="mr-1" />
                Добавить доход
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        {revenues.length === 0 ? (
          <Card className="shadow-sm">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="text-slate-400" size={32} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Нет доходов</h3>
              <p className="text-slate-500 mb-4">Пока не добавлено ни одного дохода для этого проекта</p>
              {user?.role === 'director' && (
                <Button 
                  className="bg-primary text-white"
                  onClick={() => setLocation(`/add-revenue?projectId=${projectId}`)}
                >
                  <Plus size={16} className="mr-1" />
                  Добавить доход
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
                    <h3 className="font-semibold text-slate-900">Общие доходы</h3>
                    <p className="text-sm text-slate-500">
                      {revenues.length} {revenues.length === 1 ? 'запись' : 'записей'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(
                        revenues.reduce((sum, revenue) => sum + parseFloat(revenue.amount), 0).toString()
                      )}
                    </p>
                    <p className="text-sm text-slate-500">Всего получено</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenues List */}
            <div className="space-y-3">
              {revenues.map((revenue) => (
                <Card key={revenue.id} className="shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-lg text-green-600">
                            {formatCurrency(revenue.amount)}
                          </p>
                          <p className="text-xs text-slate-400">
                            {formatDate(revenue.date)}
                          </p>
                        </div>
                        
                        {revenue.source && (
                          <div className="flex items-center mb-2">
                            <DollarSign size={16} className="text-slate-400 mr-2" />
                            <p className="text-sm font-medium text-slate-700">
                              {revenue.source}
                            </p>
                          </div>
                        )}
                        
                        {revenue.description && (
                          <p className="text-sm text-slate-600 mb-2">
                            {revenue.description}
                          </p>
                        )}
                        
                        <p className="text-xs text-slate-400">
                          Добавил: {revenue.user?.name || 'Неизвестно'}
                        </p>
                      </div>
                      
                      <div className="ml-4 flex items-center">
                        {user?.role === 'director' && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setLocation(`/edit-revenue/${projectId}/${revenue.id}`)}
                              >
                                <Edit size={16} className="mr-2" />
                                Редактировать
                              </DropdownMenuItem>
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
                                    <AlertDialogTitle>Удалить доход?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Это действие нельзя отменить. Доход будет удален безвозвратно.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteRevenue(revenue.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Удалить
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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