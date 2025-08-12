import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Project {
  id: string;
  name: string;
  location?: string;
  totalCost: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export default function AddCustomerAdvance() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract projectId from URL path
  const projectId = location.split('/')[2];

  const [formData, setFormData] = useState({
    projectId: projectId || '',
    amount: '',
    description: '',
    date: ''
  });

  // Get projects (for project selection if needed)
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Get specific project details
  const { data: project } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
  });

  // Create customer advance mutation
  const createCustomerAdvanceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/customer-advances', data);
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Invalidate specific project queries if projectId is available
      if (formData.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'customer-advances'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'financial-summary'] });
      }
      toast({
        title: "Успешно",
        description: "Аванс от заказчика добавлен",
      });
      goBack();
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить аванс от заказчика",
        variant: "destructive",
      });
    },
  });

  const goBack = () => {
    if (projectId) {
      setLocation(`/project/${projectId}`);
    } else if (user?.role === 'director') {
      setLocation('/director');
    } else {
      setLocation('/master');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.date) {
      toast({
        title: "Ошибка",
        description: "Необходимо заполнить сумму и дату",
        variant: "destructive",
      });
      return;
    }

    createCustomerAdvanceMutation.mutate(formData);
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
            <div>
              <h2 className="font-semibold text-slate-900">Добавить аванс от заказчика</h2>
              {project && (
                <p className="text-sm text-slate-500">{project.name}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Selection (if no specific project) */}
          {!projectId && (
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <Label className="block text-sm font-medium text-slate-700 mb-2">
                  Проект *
                </Label>
                <Select 
                  value={formData.projectId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите проект" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Amount */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                Сумма аванса от заказчика *
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  className="pr-16"
                  required
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">
                  AED
                </span>
              </div>
              {formData.amount && (
                <p className="text-sm text-slate-500 mt-2">
                  {formatCurrency(formData.amount)}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Date */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                Дата получения аванса *
              </Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                Описание (необязательно)
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Укажите детали аванса от заказчика..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full bg-primary text-white"
              disabled={createCustomerAdvanceMutation.isPending}
            >
              {createCustomerAdvanceMutation.isPending ? 'Добавление...' : 'Добавить аванс от заказчика'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}