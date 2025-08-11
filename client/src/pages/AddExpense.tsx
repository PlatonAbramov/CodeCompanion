import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileUploader } from "@/components/FileUploader";
import { QuickAddContractor } from "@/components/QuickAddContractor";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Check } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface Contractor {
  id: string;
  name: string;
  company?: string;
  specialization: string;
}

export default function AddExpense() {
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
    category: '',
    description: '',
    receiptUrl: '',
    contractorId: ''
  });
  const [selectedReceipt, setSelectedReceipt] = useState<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  } | null>(null);

  // Get user projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Get contractors when contractor payment category is selected
  const { data: contractors = [] } = useQuery<Contractor[]>({
    queryKey: ['/api/contractors'],
    enabled: formData.category === 'contractor_payments',
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('POST', '/api/expenses', data);
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      // Invalidate specific project queries if projectId is available
      if (formData.projectId) {
        queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'expenses'] });
        queryClient.invalidateQueries({ queryKey: ['/api/projects', formData.projectId, 'financial-summary'] });
      }
      toast({
        title: "Успешно",
        description: "Расход добавлен",
      });
      goBack();
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить расход",
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
    } else if (user?.role === 'director') {
      setLocation('/director');
    } else {
      setLocation('/master');
    }
  };

  // Handle receipt upload
  const handleReceiptUpload = (files: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>) => {
    if (files.length > 0) {
      const file = files[0];
      setFormData(prev => ({ ...prev, receiptUrl: file.fileUrl }));
      setSelectedReceipt(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate contractor selection for contractor payments
    if (formData.category === 'contractor_payments' && !formData.contractorId) {
      toast({
        title: "Ошибка",
        description: "Выберите подрядчика для оплаты",
        variant: "destructive",
      });
      return;
    }

    // Remove contractorId if not contractor payment category
    const dataToSubmit = {
      ...formData,
      contractorId: formData.category === 'contractor_payments' ? formData.contractorId : undefined
    };

    createExpenseMutation.mutate(dataToSubmit);
  };

  const categories = [
    { value: 'materials', label: 'Материалы' },
    { value: 'tools', label: 'Инструменты' },
    { value: 'transport', label: 'Транспорт' },
    { value: 'services', label: 'Услуги' },
    { value: 'salary_employees', label: 'Зарплата действующим сотрудникам' },
    { value: 'salary_daily', label: 'Зарплата поднёвщикам' },
    { value: 'contractor_payments', label: 'Оплата подрядчикам' },
    { value: 'other', label: 'Прочее' },
  ];

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
            <h2 className="font-semibold text-slate-900">{t('addExpense')}</h2>
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Selection */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                Проект
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

          {/* Amount */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                {t('amount')} *
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                  required
                  className="pr-12"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500">
                  ₽
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                {t('category')} *
              </Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    category: value,
                    // Reset contractor selection if category changes
                    contractorId: value === 'contractor_payments' ? prev.contractorId : ''
                  }));
                }}
              >
                <SelectTrigger className="w-full">
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
            </CardContent>
          </Card>

          {/* Contractor Selection - Only show for contractor payments */}
          {formData.category === 'contractor_payments' && (
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium text-slate-700">
                    Подрядчик *
                  </Label>
                  <QuickAddContractor 
                    onContractorAdded={(contractorId) => {
                      setFormData(prev => ({ ...prev, contractorId }));
                    }}
                  />
                </div>
                <Select 
                  value={formData.contractorId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, contractorId: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите подрядчика" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractors.map((contractor) => (
                      <SelectItem key={contractor.id} value={contractor.id}>
                        <div className="flex flex-col">
                          <span>{contractor.name}</span>
                          {contractor.company && (
                            <span className="text-xs text-slate-500">{contractor.company}</span>
                          )}
                          <span className="text-xs text-slate-400">{contractor.specialization}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Description */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                {t('description')}
              </Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Дополнительная информация о расходе"
                className="resize-none"
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Receipt Upload */}
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <Label className="block text-sm font-medium text-slate-700 mb-2">
                Чек (необязательно)
              </Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Camera className="text-slate-400" size={24} />
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Сфотографируйте или выберите файл
                </p>
                <FileUploader
                  onUpload={handleReceiptUpload}
                  maxFiles={1}
                  maxFileSize={10485760}
                  accept="image/*,.pdf"
                >
                  <div className="flex items-center gap-2">
                    <Camera size={16} />
                    <span>{t('attachFile')}</span>
                  </div>
                </FileUploader>
                
                {selectedReceipt && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-center">
                      <Check className="text-green-600 mr-2" size={16} />
                      <span className="text-sm text-green-800">{selectedReceipt.fileName}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={createExpenseMutation.isPending}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              {createExpenseMutation.isPending ? t('loading') : t('addExpense')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
