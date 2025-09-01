import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";

interface OwnerInvestment {
  id: string;
  amount: string;
  investor: 'vlad' | 'platon';
  description?: string;
  date: string;
  projectId: string;
}

export default function EditOwnerInvestment() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Extract owner investment ID from URL
  const ownerInvestmentId = location.split('/')[2];

  const [formData, setFormData] = useState({
    amount: '',
    investor: '',
    description: '',
    date: ''
  });

  // Get owner investment data
  const { data: ownerInvestment, isLoading } = useQuery<OwnerInvestment>({
    queryKey: ['/api/owner-investments', ownerInvestmentId],
    enabled: !!ownerInvestmentId,
  });

  // Update form when data loads
  useEffect(() => {
    if (ownerInvestment) {
      setFormData({
        amount: ownerInvestment.amount,
        investor: ownerInvestment.investor,
        description: ownerInvestment.description || '',
        date: new Date(ownerInvestment.date).toISOString().split('T')[0]
      });
    }
  }, [ownerInvestment]);

  const updateOwnerInvestmentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/owner-investments/${ownerInvestmentId}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects', ownerInvestment?.projectId, 'owner-investments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', ownerInvestment?.projectId, 'financial-summary'] });
      toast({
        title: "Успешно",
        description: "Вложение обновлено",
      });
      setLocation(`/owner-investments/${ownerInvestment?.projectId}`);
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить вложение",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.investor || !formData.date) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    updateOwnerInvestmentMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#423731] p-4">Загрузка...</div>;
  }

  if (!ownerInvestment) {
    return <div className="min-h-screen bg-[#423731] p-4">Вложение не найдено</div>;
  }

  return (
    <div className="min-h-screen bg-[#423731]">
      {/* Header */}
      <header className="bg-[#dfd0c1] shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation(`/owner-investments/${ownerInvestment.projectId}`)}
              className="mr-3"
            >
              <ArrowLeft size={20} />
            </Button>
            <h1 className="text-xl font-semibold text-slate-900">
              Редактировать вложение
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        <Card className="max-w-md mx-auto shadow-sm">
          <CardHeader>
            <CardTitle>Редактирование вложения</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="amount">Сумма (AED) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="investor">Инвестор *</Label>
                <Select 
                  value={formData.investor} 
                  onValueChange={(value) => handleInputChange('investor', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите инвестора" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vlad">Влад</SelectItem>
                    <SelectItem value="platon">Платон</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date">Дата *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Опциональное описание вложения"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation(`/owner-investments/${ownerInvestment.projectId}`)}
                >
                  Отмена
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateOwnerInvestmentMutation.isPending}
                >
                  {updateOwnerInvestmentMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}