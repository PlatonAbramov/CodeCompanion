import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Edit, Trash2, Plus } from "lucide-react";
import { useState } from "react";

interface OwnerInvestment {
  id: string;
  amount: string;
  investor: 'vlad' | 'platon';
  description?: string;
  date: string;
  createdAt: string;
}

export default function OwnerInvestmentsList() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract project ID from URL
  const projectId = location.split('/')[2];

  // Get owner investments data
  const { data: ownerInvestments = [], isLoading } = useQuery<OwnerInvestment[]>({
    queryKey: ['/api/projects', projectId, 'owner-investments'],
  });

  const deleteOwnerInvestmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/owner-investments/${id}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'owner-investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      toast({
        title: "Успешно",
        description: "Вложение удалено",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить вложение",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return `${num.toLocaleString('ru-RU')} AED`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const vladInvestments = ownerInvestments.filter(inv => inv.investor === 'vlad');
  const platonInvestments = ownerInvestments.filter(inv => inv.investor === 'platon');

  const vladTotal = vladInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  const platonTotal = platonInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

  const InvestmentsList = ({ investments, investorName }: { investments: OwnerInvestment[], investorName: string }) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-900">
          Всего {investorName}: {formatCurrency((investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0)).toString())}
        </h3>
        {user?.role === 'director' && (
          <Button 
            onClick={() => setLocation(`/add-owner-investment/${projectId}?investor=${investorName.toLowerCase()}`)}
            size="sm"
            className="bg-primary text-white"
          >
            <Plus size={16} className="mr-1" />
            Добавить
          </Button>
        )}
      </div>

      {investments.length === 0 ? (
        <p className="text-slate-500 text-center py-4">Нет вложений</p>
      ) : (
        investments.map((investment) => (
          <Card key={investment.id} className="shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-red-600 text-lg">
                      {formatCurrency(investment.amount)}
                    </span>
                    <div className="flex items-center space-x-2">
                      {user?.role === 'director' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setLocation(`/edit-owner-investment/${investment.id}`)}
                            className="text-slate-500 hover:text-slate-700"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteOwnerInvestmentMutation.mutate(investment.id)}
                            className="text-red-500 hover:text-red-700"
                            disabled={deleteOwnerInvestmentMutation.isPending}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {investment.description && (
                    <p className="text-slate-600 mb-2">{investment.description}</p>
                  )}
                  
                  <p className="text-sm text-slate-500">
                    {formatDate(investment.date)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  if (isLoading) {
    return <div className="min-h-screen bg-slate-50 p-4">Загрузка...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation(`/project/${projectId}`)}
              className="mr-3"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-semibold text-slate-900">
              Вложили из своих
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              Общая сумма: {formatCurrency((vladTotal + platonTotal).toString())}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="vlad" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="vlad">
                  Влад ({formatCurrency(vladTotal.toString())})
                </TabsTrigger>
                <TabsTrigger value="platon">
                  Платон ({formatCurrency(platonTotal.toString())})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="vlad" className="mt-6">
                <InvestmentsList investments={vladInvestments} investorName="Влад" />
              </TabsContent>
              
              <TabsContent value="platon" className="mt-6">
                <InvestmentsList investments={platonInvestments} investorName="Платон" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}