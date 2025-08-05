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
import { ObjectUploader } from "@/components/ObjectUploader";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Camera, Check } from "lucide-react";
import type { UploadResult } from "@uppy/core";

interface Project {
  id: string;
  name: string;
}

export default function AddExpense() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    projectId: '',
    amount: '',
    category: '',
    description: '',
    receiptUrl: ''
  });
  const [selectedReceipt, setSelectedReceipt] = useState<File | null>(null);

  // Get user projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/expenses', data);
      return res.json();
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
    if (user?.role === 'director') {
      setLocation('/director');
    } else {
      setLocation('/master');
    }
  };

  const handleGetUploadParameters = async () => {
    const res = await apiRequest('POST', '/api/objects/upload');
    const data = await res.json();
    return {
      method: 'PUT' as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedFile = result.successful[0];
      const uploadURL = uploadedFile.uploadURL;
      
      // Set ACL policy for the uploaded file
      const res = await apiRequest('PUT', '/api/files', { fileURL: uploadURL });
      const data = await res.json();
      
      setFormData(prev => ({ ...prev, receiptUrl: data.objectPath }));
      setSelectedReceipt({ name: uploadedFile.name } as File);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.receiptUrl) {
      toast({
        title: "Ошибка",
        description: "Необходимо прикрепить чек",
        variant: "destructive",
      });
      return;
    }

    createExpenseMutation.mutate(formData);
  };

  const categories = [
    { value: 'materials', label: t('materials') },
    { value: 'tools', label: t('tools') },
    { value: 'transport', label: t('transport') },
    { value: 'services', label: t('services') },
    { value: 'other', label: t('other') },
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
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
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
                {t('receiptRequired')} *
              </Label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Camera className="text-slate-400" size={24} />
                </div>
                <p className="text-sm text-slate-600 mb-2">
                  Сфотографируйте или выберите файл
                </p>
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  onGetUploadParameters={handleGetUploadParameters}
                  onComplete={handleUploadComplete}
                  buttonClassName="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  <div className="flex items-center gap-2">
                    <Camera size={16} />
                    <span>{t('attachFile')}</span>
                  </div>
                </ObjectUploader>
                
                {selectedReceipt && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-center">
                      <Check className="text-green-600 mr-2" size={16} />
                      <span className="text-sm text-green-800">{selectedReceipt.name}</span>
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
              disabled={createExpenseMutation.isPending || !formData.receiptUrl}
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
