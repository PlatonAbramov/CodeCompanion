import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AddRevenue() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract projectId from URL query params if coming from project detail
  const urlParams = new URLSearchParams(window.location.search);
  const projectIdFromUrl = urlParams.get('projectId');

  const [formData, setFormData] = useState({
    projectId: projectIdFromUrl || '',
    amount: '',
    description: '',
    source: '',
    date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });

  const { mutate: addRevenue, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/revenues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to add revenue');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Доход добавлен",
        description: "Доход успешно добавлен в проект",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'financial-summary'] });
      goBack();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось добавить доход",
        variant: "destructive",
      });
    },
  });

  const goBack = () => {
    // If we have a projectId, go back to that project's detail page
    if (projectIdFromUrl) {
      setLocation(`/project/${projectIdFromUrl}`);
    } else if (formData.projectId) {
      setLocation(`/project/${formData.projectId}`);
    } else if (user?.role === 'admin' || user?.role === 'director') {
      setLocation('/director');
    } else {
      setLocation('/master');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.projectId) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    addRevenue({
      projectId: formData.projectId,
      amount: parseFloat(formData.amount),
      description: formData.description,
      source: formData.source,
      date: formData.date,
      userId: user?.id,
    });
  };

  const formatCurrency = (amount: string) => {
    if (!amount) return '';
    const num = parseFloat(amount || "0");
    return `${num.toLocaleString("ru-RU")} AED`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={goBack}
              className="mr-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <h2 className="font-semibold text-slate-900">Добавить доход</h2>
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Новый доход</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="amount">Сумма *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="Введите сумму"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                />
                {formData.amount && (
                  <p className="text-sm text-slate-500 mt-1">
                    {formatCurrency(formData.amount)}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="date">Дата *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="source">Источник дохода</Label>
                <Input
                  id="source"
                  placeholder="Например: Оплата от заказчика, Дополнительные работы"
                  value={formData.source}
                  onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  placeholder="Дополнительная информация о доходе"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={goBack}
                  className="flex-1"
                >
                  Отмена
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-primary text-white"
                  disabled={isPending}
                >
                  {isPending ? 'Добавление...' : 'Добавить доход'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}