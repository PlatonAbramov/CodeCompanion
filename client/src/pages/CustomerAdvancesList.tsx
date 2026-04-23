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
  const queryClient = useQueryClient();

  // Extract projectId from URL path  
  const pathParts = location.split('/');
  const projectId = pathParts[2];

  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
  });

  const { data: customerAdvances = [], isLoading } = useQuery<CustomerAdvance[]>({
    queryKey: ['/api/projects', projectId, 'customer-advances'],
  });

  const { mutate: deleteCustomerAdvance } = useMutation({
    mutationFn: async (customerAdvanceId: string) => {
      const response = await fetch(`/api/customer-advances/${customerAdvanceId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete customer advance');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Аванс от заказчика удален",
        description: "Аванс от заказчика успешно удален",
      });
      // Invalidate all related caches
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'customer-advances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось удалить аванс от заказчика",
        variant: "destructive",
      });
    },
  });

  const goBack = () => {
    setLocation(`/projects/${projectId}`);
  };

  const formatCurrency = (amount: string) => {
    if (!amount) return '';
    const num = parseFloat(amount || "0");
    return `${num.toLocaleString("ru-RU")} AED`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50" />
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
            {(user?.role === 'admin' || user?.role === 'director') && (
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
              {(user?.role === 'admin' || user?.role === 'director') && (
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
                        {(user?.role === 'admin' || user?.role === 'director') && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setLocation(`/edit-customer-advance/${projectId}/${advance.id}`)}
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
                                    <AlertDialogTitle>Удалить аванс от заказчика?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Это действие нельзя отменить. Аванс от заказчика будет удален безвозвратно.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteCustomerAdvance(advance.id)}
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