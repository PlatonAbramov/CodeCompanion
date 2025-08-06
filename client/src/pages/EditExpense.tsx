import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

export default function EditExpense() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract expenseId and projectId from URL
  const pathParts = location.split('/');
  const expenseId = pathParts[pathParts.length - 1];
  const projectId = pathParts[pathParts.length - 2];

  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    description: '',
    receiptUrl: ''
  });

  // Fetch expense details
  const { data: expenses, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'expenses'],
    enabled: !!projectId
  });

  useEffect(() => {
    if (expenses && expenseId) {
      const expense = expenses.find((e: any) => e.id === expenseId);
      if (expense) {
        setFormData({
          amount: expense.amount,
          category: expense.category || '',
          description: expense.description || '',
          receiptUrl: expense.receiptUrl || ''
        });
      }
    }
  }, [expenses, expenseId]);

  const { mutate: updateExpense, isPending } = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update expense');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Расход обновлен",
        description: "Расход успешно обновлен",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      goBack();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось обновить расход",
        variant: "destructive",
      });
    },
  });

  const goBack = () => {
    setLocation(`/expenses/${projectId}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.category || !formData.description) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    updateExpense({
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
      receiptUrl: formData.receiptUrl,
    });
  };

  const formatCurrency = (amount: string) => {
    if (!amount) return '';
    return new Intl.NumberFormat('ar-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const categories = [
    { value: 'materials', label: 'Материалы' },
    { value: 'tools', label: 'Инструменты' },
    { value: 'transport', label: 'Транспорт' },
    { value: 'services', label: 'Услуги' },
    { value: 'other', label: 'Прочее' }
  ];

  if (isLoading) {
    return <div className="p-4">Загрузка...</div>;
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
              onClick={goBack}
              className="mr-2"
            >
              <ArrowLeft size={20} />
            </Button>
            <h2 className="font-semibold text-slate-900">Редактировать расход</h2>
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Редактирование расхода</CardTitle>
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
                <Label htmlFor="category">Категория *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Описание *</Label>
                <Textarea
                  id="description"
                  placeholder="Опишите расход"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  required
                />
              </div>

              {formData.receiptUrl && (
                <div>
                  <Label>Текущий чек</Label>
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => window.open(formData.receiptUrl, '_blank')}
                    >
                      Посмотреть текущий чек
                    </Button>
                  </div>
                </div>
              )}

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
                  {isPending ? 'Сохранение...' : 'Сохранить изменения'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}