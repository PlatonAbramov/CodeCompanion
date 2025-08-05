import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, HardHat, MoreVertical } from "lucide-react";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

export default function EmployeeManagement() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'master'
  });

  // Redirect if not director
  if (user?.role !== 'director') {
    setLocation('/director');
    return null;
  }

  // Get all users
  const { data: employees = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/users', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateModalOpen(false);
      setEmployeeForm({
        username: '',
        password: '',
        name: '',
        role: 'master'
      });
      toast({
        title: "Успешно",
        description: "Сотрудник добавлен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось добавить сотрудника",
        variant: "destructive",
      });
    },
  });

  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(employeeForm);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Никогда';
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const goBack = () => {
    setLocation('/director');
  };

  // Filter out current user from employees list
  const filteredEmployees = employees.filter(emp => emp.id !== user?.id);

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
              <h2 className="font-semibold text-slate-900">{t('employees')}</h2>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-white">
                  <Plus size={16} className="mr-1" />
                  {t('addEmployee')}
                </Button>
              </DialogTrigger>
              <DialogContent className="w-full max-w-lg">
                <DialogHeader>
                  <DialogTitle>{t('addEmployee')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateEmployee} className="space-y-4">
                  <div>
                    <Label>{t('employeeName')} *</Label>
                    <Input
                      value={employeeForm.name}
                      onChange={(e) => setEmployeeForm({...employeeForm, name: e.target.value})}
                      placeholder="Введите полное имя"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>{t('username')} *</Label>
                    <Input
                      value={employeeForm.username}
                      onChange={(e) => setEmployeeForm({...employeeForm, username: e.target.value})}
                      placeholder="Логин для входа"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>{t('password')} *</Label>
                    <Input
                      type="password"
                      value={employeeForm.password}
                      onChange={(e) => setEmployeeForm({...employeeForm, password: e.target.value})}
                      placeholder="Пароль"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label>{t('role')} *</Label>
                    <Select 
                      value={employeeForm.role} 
                      onValueChange={(value) => setEmployeeForm({...employeeForm, role: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="master">{t('master')}</SelectItem>
                        <SelectItem value="director">{t('director')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-primary text-white"
                    disabled={createUserMutation.isPending}
                  >
                    {createUserMutation.isPending ? t('loading') : t('addEmployee')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="p-4 pb-20">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-slate-500">{t('loading')}</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <HardHat size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Пока нет сотрудников</p>
              <Button 
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 bg-primary text-white"
              >
                <Plus size={16} className="mr-2" />
                {t('addEmployee')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredEmployees.map((employee) => (
              <Card key={employee.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center flex-1">
                      <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mr-3">
                        <HardHat className="text-white" size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900">{employee.name}</h4>
                        <p className="text-sm text-slate-500">{t(employee.role)}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Логин: <span className="font-mono">{employee.username}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        employee.isActive 
                          ? 'bg-secondary/10 text-secondary' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {employee.isActive ? 'Активен' : 'Неактивен'}
                      </span>
                      <Button variant="ghost" size="sm">
                        <MoreVertical size={16} />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">{t('lastLogin')}</p>
                        <p className="font-medium text-slate-900">
                          {formatDate(employee.lastLogin)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Зарегистрирован</p>
                        <p className="font-medium text-slate-900">
                          {formatDate(employee.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
