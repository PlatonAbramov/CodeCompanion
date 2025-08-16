import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Home, Users, Plus, Edit2, Trash2, FileText, Building2, Phone, Mail, Upload, File
} from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";

interface Contractor {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  specialization: string;
  licenseUrl?: string;
  documentUrls?: string[];
  isActive: boolean;
  createdAt: string;
}

interface ContractorStats {
  totalExpenses: number;
  totalProjects: number;
  remainingBudget: number;
}

// Компонент для отображения статистики подрядчика
function ContractorStatsCard({ contractorId }: { contractorId: string }) {
  const { data: stats } = useQuery<ContractorStats>({
    queryKey: ['/api/contractors', contractorId, 'stats'],
  });

  if (!stats) return null;

  return (
    <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
      <div className="text-center">
        <div className="text-lg font-semibold text-green-600">
          {stats.totalExpenses.toLocaleString('ru-RU')} AED
        </div>
        <div className="text-xs text-slate-500">Всего выплат</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-blue-600">
          {stats.totalProjects}
        </div>
        <div className="text-xs text-slate-500">Проектов</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-purple-600">
          {stats.remainingBudget.toLocaleString('ru-RU')} AED
        </div>
        <div className="text-xs text-slate-500">Осталось выплатить</div>
      </div>
    </div>
  );
}

interface ContractorForm {
  name: string;
  company: string;
  phone: string;
  email: string;
  specialization: string;
}

export default function Contractors() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [contractorForm, setContractorForm] = useState<ContractorForm>({
    name: '',
    company: '',
    phone: '',
    email: '',
    specialization: ''
  });

  const { data: contractors, isLoading } = useQuery<Contractor[]>({
    queryKey: ['/api/contractors'],
    enabled: user?.role === 'director', // Только загружаем данные если пользователь директор
  });

  const createContractorMutation = useMutation({
    mutationFn: async (contractorData: ContractorForm) => {
      const res = await apiRequest('/api/contractors', {
        method: 'POST',
        body: JSON.stringify(contractorData)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors'] });
      setIsCreateModalOpen(false);
      setContractorForm({
        name: '',
        company: '',
        phone: '',
        email: '',
        specialization: ''
      });
      toast({
        title: "Подрядчик добавлен",
        description: "Новый подрядчик успешно добавлен в систему",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить подрядчика",
        variant: "destructive",
      });
    }
  });

  const updateContractorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContractorForm> }) => {
      const res = await apiRequest(`/api/contractors/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors'] });
      setIsEditModalOpen(false);
      setSelectedContractor(null);
      toast({
        title: "Подрядчик обновлен",
        description: "Данные подрядчика успешно обновлены",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить данные подрядчика",
        variant: "destructive",
      });
    }
  });

  const deleteContractorMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/contractors/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors'] });
      toast({
        title: "Подрядчик удален",
        description: "Подрядчик успешно удален из системы",
      });
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить подрядчика",
        variant: "destructive",
      });
    }
  });

  // Проверка авторизации
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    );
  }

  if (user.role !== 'director') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p>Доступ запрещен</p>
      </div>
    );
  }

  const handleCreateContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    createContractorMutation.mutate(contractorForm);
  };

  const handleEditContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedContractor) {
      updateContractorMutation.mutate({ 
        id: selectedContractor.id, 
        data: contractorForm 
      });
    }
  };

  const openEditModal = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setContractorForm({
      name: contractor.name,
      company: contractor.company || '',
      phone: contractor.phone || '',
      email: contractor.email || '',
      specialization: contractor.specialization
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteContractor = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этого подрядчика?")) {
      deleteContractorMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users size={24} className="text-primary" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">Подрядчики</h1>
              <p className="text-sm text-slate-600">
                Всего: {contractors?.length || 0}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Add Contractor Button */}
        <div className="flex justify-end">
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white">
                <Plus size={16} className="mr-2" />
                Добавить подрядчика
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Добавить нового подрядчика</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateContractor} className="space-y-4">
                <div>
                  <Label htmlFor="name">Имя *</Label>
                  <Input
                    id="name"
                    value={contractorForm.name}
                    onChange={(e) => setContractorForm({...contractorForm, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company">Компания</Label>
                  <Input
                    id="company"
                    value={contractorForm.company}
                    onChange={(e) => setContractorForm({...contractorForm, company: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="specialization">Специализация *</Label>
                  <Input
                    id="specialization"
                    value={contractorForm.specialization}
                    onChange={(e) => setContractorForm({...contractorForm, specialization: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Телефон</Label>
                  <Input
                    id="phone"
                    value={contractorForm.phone}
                    onChange={(e) => setContractorForm({...contractorForm, phone: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={contractorForm.email}
                    onChange={(e) => setContractorForm({...contractorForm, email: e.target.value})}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-white"
                  disabled={createContractorMutation.isPending}
                >
                  {createContractorMutation.isPending ? "Добавление..." : "Добавить подрядчика"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Contractor Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Редактировать подрядчика</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditContractor} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Имя *</Label>
                <Input
                  id="edit-name"
                  value={contractorForm.name}
                  onChange={(e) => setContractorForm({...contractorForm, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-company">Компания</Label>
                <Input
                  id="edit-company"
                  value={contractorForm.company}
                  onChange={(e) => setContractorForm({...contractorForm, company: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-specialization">Специализация *</Label>
                <Input
                  id="edit-specialization"
                  value={contractorForm.specialization}
                  onChange={(e) => setContractorForm({...contractorForm, specialization: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Телефон</Label>
                <Input
                  id="edit-phone"
                  value={contractorForm.phone}
                  onChange={(e) => setContractorForm({...contractorForm, phone: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={contractorForm.email}
                  onChange={(e) => setContractorForm({...contractorForm, email: e.target.value})}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-primary text-white"
                disabled={updateContractorMutation.isPending}
              >
                {updateContractorMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Contractors List */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-slate-500">Загрузка...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contractors?.map((contractor) => (
              <Card 
                key={contractor.id} 
                className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 border-0 rounded-lg cursor-pointer"
                onClick={() => setLocation(`/contractor/${contractor.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg text-slate-900 font-bold">
                        {contractor.company || contractor.name}
                      </CardTitle>
                      {contractor.company && (
                        <p className="text-sm text-slate-600 mt-1">
                          {contractor.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(contractor)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContractor(contractor.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-slate-600">
                      <FileText size={14} className="mr-2" />
                      <span>Специализация: {contractor.specialization}</span>
                    </div>
                    {contractor.phone && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Phone size={14} className="mr-2" />
                        <span>{contractor.phone}</span>
                      </div>
                    )}
                    {contractor.email && (
                      <div className="flex items-center text-sm text-slate-600">
                        <Mail size={14} className="mr-2" />
                        <span>{contractor.email}</span>
                      </div>
                    )}
                    {contractor.licenseUrl && (
                      <div className="flex items-center text-sm text-slate-600">
                        <File size={14} className="mr-2" />
                        <span>Лицензия загружена</span>
                      </div>
                    )}
                    <div className="text-xs text-slate-400 pt-2">
                      Добавлен: {new Date(contractor.createdAt).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                  <ContractorStatsCard contractorId={contractor.id} />
                </CardContent>
              </Card>
            ))}
            
            {contractors?.length === 0 && (
              <div className="text-center py-12">
                <Users size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 mb-2">Подрядчики не найдены</p>
                <p className="text-sm text-slate-400">Добавьте первого подрядчика, чтобы начать работу</p>
              </div>
            )}
          </div>
        )}
      </div>

      <BottomNavigation currentPage="contractors" />
    </div>
  );
}