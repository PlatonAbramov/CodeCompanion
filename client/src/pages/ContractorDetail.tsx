import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Phone, Mail, Building2, User, FileText, Calendar, DollarSign, Edit, Plus } from "lucide-react";
import { AssignContractorModal } from "@/components/AssignContractorModal";
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

interface ContractorExpense {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  projectId: string;
  projectName: string;
}

interface ContractorStats {
  totalExpenses: number;
  totalProjects: number;
  remainingBudget: number;
}

interface ContractorProject {
  id: string;
  projectId: string;
  projectName: string;
  budgetAllocation: number;
  workDescription: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

export default function ContractorDetail() {
  const params = useParams();
  const contractorId = params.id;
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Get contractor details
  const { data: contractor, isLoading: contractorLoading } = useQuery<Contractor>({
    queryKey: ['/api/contractors', contractorId],
    enabled: !!(contractorId && (user?.role === 'admin' || user?.role === 'director')),
  });

  // Get contractor expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<ContractorExpense[]>({
    queryKey: ['/api/contractors', contractorId, 'expenses'],
    enabled: !!(contractorId && (user?.role === 'admin' || user?.role === 'director')),
  });

  // Get contractor statistics
  const { data: stats } = useQuery<ContractorStats>({
    queryKey: ['/api/contractors', contractorId, 'stats'],
    enabled: !!(contractorId && (user?.role === 'admin' || user?.role === 'director')),
  });

  // Get contractor projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery<ContractorProject[]>({
    queryKey: ['/api/contractors', contractorId, 'projects'],
    enabled: !!(contractorId && (user?.role === 'admin' || user?.role === 'director')),
  });

  // Проверка авторизации
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50" />
    );
  }

  if (user.role !== 'admin' && user.role !== 'director') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p>Доступ запрещен</p>
      </div>
    );
  }

  const goBack = () => {
    setLocation('/contractors');
  };

  if (contractorLoading || expensesLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
        </div>
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Подрядчик не найден</h2>
          <p className="text-slate-500 mb-4">Возможно, подрядчик был удален</p>
          <Button onClick={goBack}>Вернуться к списку</Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('ru-RU')} AED`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
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
            <h2 className="font-semibold text-slate-900">
              Подрядчик: {contractor.company || contractor.name}
            </h2>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Contractor Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User size={20} />
                Информация о подрядчике
              </CardTitle>
              <Badge variant={contractor.isActive ? "default" : "secondary"}>
                {contractor.isActive ? "Активен" : "Неактивен"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contractor.company && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Компания</label>
                  <p className="text-slate-900 flex items-center gap-2">
                    <Building2 size={16} />
                    {contractor.company}
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-slate-500">Имя</label>
                <p className="text-slate-900">{contractor.name}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-500">Специализация</label>
                <p className="text-slate-900">{contractor.specialization}</p>
              </div>
              
              {contractor.phone && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Телефон</label>
                  <p className="text-slate-900 flex items-center gap-2">
                    <Phone size={16} />
                    <a href={`tel:${contractor.phone}`} className="hover:text-blue-600">
                      {contractor.phone}
                    </a>
                  </p>
                </div>
              )}
              
              {contractor.email && (
                <div>
                  <label className="text-sm font-medium text-slate-500">Email</label>
                  <p className="text-slate-900 flex items-center gap-2">
                    <Mail size={16} />
                    <a href={`mailto:${contractor.email}`} className="hover:text-blue-600">
                      {contractor.email}
                    </a>
                  </p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-medium text-slate-500">Дата регистрации</label>
                <p className="text-slate-900 flex items-center gap-2">
                  <Calendar size={16} />
                  {formatDate(contractor.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <DollarSign className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Общая сумма выплат</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {formatCurrency(stats.totalExpenses)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <FileText className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Количество проектов</p>
                    <p className="text-xl font-semibold text-slate-900">{stats.totalProjects}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Осталось выплатить по активным проектам</p>
                    <p className="text-xl font-semibold text-slate-900">
                      {formatCurrency(stats.remainingBudget || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Assigned Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Привязанные проекты</CardTitle>
              <Button 
                onClick={() => setIsAssignModalOpen(true)}
                size="sm"
              >
                <Plus size={16} className="mr-1" />
                Назначить на проект
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">Подрядчик пока не привязан к проектам</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => {
                  const projectExpenses = expenses.filter(e => e.projectId === project.projectId);
                  const totalPaid = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
                  const remaining = project.budgetAllocation - totalPaid;
                  
                  return (
                    <div key={project.id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-900 mb-1">{project.projectName}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLocation(`/contractor/${contractorId}/project/${project.id}`)}
                              className="h-6 w-6 p-0"
                            >
                              <Edit size={14} />
                            </Button>
                          </div>
                          <p className="text-sm text-slate-600">{project.workDescription}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>Начат: {formatDate(project.startDate)}</span>
                            {project.endDate && <span>Завершен: {formatDate(project.endDate)}</span>}
                          </div>
                        </div>
                        <Badge variant={project.isActive ? "default" : "secondary"}>
                          {project.isActive ? "Активен" : "Завершен"}
                        </Badge>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-slate-500">Бюджет</p>
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(project.budgetAllocation)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Выплачено</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(totalPaid)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-500">Осталось</p>
                          <p className={`font-semibold ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(remaining)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses History */}
        <Card>
          <CardHeader>
            <CardTitle>История выплат</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">Выплат этому подрядчику еще не было</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-slate-700">
                          {expense.projectName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(expense.createdAt)}
                        </span>
                      </div>
                      {expense.description && (
                        <p className="text-sm text-slate-600">{expense.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-green-600">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AssignContractorModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        contractorId={contractorId}
      />

      <BottomNavigation currentPage="contractors" />
    </div>
  );
}