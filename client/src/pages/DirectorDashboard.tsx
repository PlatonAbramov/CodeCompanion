import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Bus, Bell, LogOut, Plus, Home, Folder, Users, BarChart3,
  ProjectorIcon, TrendingUp, TrendingDown, Calendar, Edit2, ChevronDown, ChevronUp,
  Building2, Wrench, Settings, Archive
} from "lucide-react";
import { AssignClientModal } from '@/components/AssignClientModal';
import { BottomNavigation } from "@/components/BottomNavigation";

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

interface FinancialSummary {
  totalCost: string;
  totalAdvances: string;
  totalCustomerAdvances: string;
  totalRevenues: string;
  totalExpenses: string;
  currentProfit: string;
  projectedProfit: string;
  vladAdvances: string;
  platonAdvances: string;
  vladEarnings: string;
  platonEarnings: string;
}

// Component for individual project card with financial summary
function ProjectCard({ 
  project, 
  onClick, 
  onEdit, 
  isExpanded, 
  onToggleExpand 
}: { 
  project: Project; 
  onClick: () => void; 
  onEdit: (project: Project) => void; 
  isExpanded: boolean; 
  onToggleExpand: () => void; 
}) {
  const { t } = useLanguage();
  
  const { data: financialSummary } = useQuery<FinancialSummary>({
    queryKey: ['/api/projects', project.id, 'financial-summary'],
  });

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return `${num.toLocaleString('ru-RU')} AED`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onEdit(project);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    onToggleExpand();
  };

  const handleCardClick = () => {
    onClick();
  };

  return (
    <Card className="shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={handleCardClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpandClick}
                className="h-8 w-8 p-0 hover:bg-slate-100 mr-2"
              >
                {isExpanded ? (
                  <ChevronUp size={16} className="text-slate-600" />
                ) : (
                  <ChevronDown size={16} className="text-slate-600" />
                )}
              </Button>
              <div>
                <h4 className="font-semibold text-slate-900 mb-1">{project.name}</h4>
                {project.location && (
                  <p className="text-sm text-slate-500">{project.location}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEditClick}
              className="h-8 w-8 p-0 hover:bg-slate-100"
            >
              <Edit2 size={14} className="text-slate-600" />
            </Button>
            <span className="bg-secondary/10 text-secondary px-2 py-1 rounded-full text-xs font-medium">
              {t(project.status)}
            </span>
          </div>
        </div>
        
        {isExpanded && financialSummary && (
          <div className="space-y-2 mb-4 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-slate-500">Стоимость проекта</p>
                <p className="font-semibold text-slate-900">{formatCurrency(financialSummary.totalCost)}</p>
              </div>
              <div>
                <p className="text-slate-500">Аванс заказчика</p>
                <p className="font-semibold text-green-600">{formatCurrency(financialSummary.totalCustomerAdvances)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-slate-500">Взятые авансы</p>
                <p className="font-semibold text-red-600">{formatCurrency(financialSummary.totalAdvances)}</p>
              </div>
              <div>
                <p className="text-slate-500">Расходы</p>
                <p className="font-semibold text-red-600">{formatCurrency(financialSummary.totalExpenses)}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-blue-700 font-medium">Текущая прибыль</p>
                  <p className={`font-bold ${parseFloat(financialSummary.currentProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(financialSummary.currentProfit)}
                  </p>
                </div>
                <div>
                  <p className="text-green-700 font-medium">Прогноз прибыли</p>
                  <p className={`font-bold ${parseFloat(financialSummary.projectedProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(financialSummary.projectedProfit)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-3">
                <div>
                  <p className="text-purple-700 font-medium">Заработок Влада</p>
                  <p className={`font-bold ${parseFloat(financialSummary.vladEarnings) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(financialSummary.vladEarnings)}
                  </p>
                </div>
                <div>
                  <p className="text-purple-700 font-medium">Заработок Платона</p>
                  <p className={`font-bold ${parseFloat(financialSummary.platonEarnings) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(financialSummary.platonEarnings)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center text-sm text-slate-500">
          <Calendar size={16} className="mr-1" />
          <span>{formatDate(project.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DirectorDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isAssignClientModalOpen, setIsAssignClientModalOpen] = useState(false);
  const [clientAssignmentProjectId, setClientAssignmentProjectId] = useState<string>("");
  const [projectForm, setProjectForm] = useState({
    name: '',
    location: '',
    clientId: '',
    totalCost: '',
    startDate: '',
    endDate: ''
  });

  // Get projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Get overall financial data
  const { data: financialData } = useQuery({
    queryKey: ['/api/financial-overview'],
  });

  // Get clients for project creation
  const { data: clients = [] } = useQuery<Array<{id: string, name: string, company?: string}>>({
    queryKey: ['/api/clients'],
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateModalOpen(false);
      setProjectForm({
        name: '',
        location: '',
        clientId: '',
        totalCost: '',
        startDate: '',
        endDate: ''
      });
      toast({
        title: "Успешно",
        description: "Проект создан",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать проект",
        variant: "destructive",
      });
    },
  });

  // Edit project mutation
  const editProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest(`/api/projects/${editingProject?.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsEditModalOpen(false);
      setEditingProject(null);
      setProjectForm({
        name: '',
        location: '',
        clientId: '',
        totalCost: '',
        startDate: '',
        endDate: ''
      });
      toast({
        title: "Успешно",
        description: "Проект обновлен",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось обновить проект",
        variant: "destructive",
      });
    },
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectForm.clientId) {
      toast({
        title: "Ошибка",
        description: "Необходимо выбрать заказчика",
        variant: "destructive",
      });
      return;
    }

    // Создаем проект и сразу связываем с заказчиком
    createProjectMutation.mutate({
      name: projectForm.name,
      totalCost: projectForm.totalCost,
      startDate: projectForm.startDate,
      endDate: projectForm.endDate || null,
      clientId: projectForm.clientId, // Передаем для автоматического связывания
    });
  };

  const handleEditProject = (e: React.FormEvent) => {
    e.preventDefault();
    editProjectMutation.mutate(projectForm);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      location: project.location || '',
      clientId: '',  // Will be populated when client selection is implemented
      totalCost: project.totalCost,
      startDate: project.startDate ? project.startDate.split('T')[0] : '',
      endDate: project.endDate ? project.endDate.split('T')[0] : ''
    });
    setIsEditModalOpen(true);
  };

  const toggleProjectExpansion = (projectId: string) => {
    setExpandedProjects(prev => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || '0');
    return `${num.toLocaleString('ru-RU')} AED`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const activeProjectsCount = projects.filter((p: Project) => p.status === 'active').length;
  const archivedProjectsCount = projects.filter((p: Project) => p.status === 'archived').length;
  const totalRevenue = (financialData as any)?.totalRevenue || 0;
  const totalExpenses = (financialData as any)?.totalExpenses || 0;
  const totalAdvances = (financialData as any)?.totalAdvances || 0;
  const totalProfit = totalRevenue - totalAdvances - totalExpenses;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
                <Bus className="text-white" size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{user?.name}</h2>
                <p className="text-sm text-slate-500">{t('director')}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocation('/analytics')}
                data-testid="button-analytics"
                title="Аналитика"
                className="text-green-600 hover:text-green-800"
              >
                <TrendingUp size={20} />
              </Button>
              <Button variant="ghost" size="sm">
                <Bell size={20} />
              </Button>
              {user?.role === 'admin' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setLocation('/admin')}
                  data-testid="button-admin-panel"
                  title="Админ-панель"
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Settings size={20} />
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => logout()}>
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation('/director')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{t('activeProjects')}</p>
                  <p className="text-2xl font-bold text-slate-900">{activeProjectsCount}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <ProjectorIcon className="text-primary" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{t('totalProfit')}</p>
                  <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalProfit.toString())}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  {totalProfit >= 0 ? 
                    <TrendingUp className="text-green-600" size={24} /> : 
                    <TrendingDown className="text-red-600" size={24} />
                  }
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Archived Projects Card - only show if there are archived projects */}
        {archivedProjectsCount > 0 && (
          <div className="mb-6">
            <Card 
              className="cursor-pointer hover:shadow-md transition-shadow bg-gray-50"
              onClick={() => setLocation('/archived-projects')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Archive className="text-gray-600" size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Архивные проекты</p>
                      <p className="text-xl font-bold text-gray-800">{archivedProjectsCount}</p>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <ChevronDown className="rotate-[-90deg]" size={20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Projects Section */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{t('projects')}</h3>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white">
                <Plus size={16} className="mr-1" />
                {t('createProject')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('createProject')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <Label htmlFor="name">Название проекта *</Label>
                  <Input
                    id="name"
                    placeholder="Введите название проекта"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="clientId">Заказчик *</Label>
                  <Select
                    value={projectForm.clientId}
                    onValueChange={(value) => setProjectForm({...projectForm, clientId: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите заказчика" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client: any) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company || client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="totalCost">Общая стоимость (AED) *</Label>
                  <Input
                    id="totalCost"
                    type="number"
                    placeholder="Введите общую стоимость"
                    value={projectForm.totalCost}
                    onChange={(e) => setProjectForm({...projectForm, totalCost: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="startDate">Дата начала *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({...projectForm, startDate: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="endDate">Срок завершения (опционально)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm({...projectForm, endDate: e.target.value})}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-white"
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? t('loading') : t('createProject')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Edit Project Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактировать проект</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditProject} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Название проекта</Label>
                <Input
                  id="edit-name"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-location">Местоположение</Label>
                <Input
                  id="edit-location"
                  value={projectForm.location}
                  onChange={(e) => setProjectForm({...projectForm, location: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit-totalCost">Общая стоимость</Label>
                <Input
                  id="edit-totalCost"
                  type="number"
                  value={projectForm.totalCost}
                  onChange={(e) => setProjectForm({...projectForm, totalCost: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-startDate">Дата начала</Label>
                  <Input
                    id="edit-startDate"
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm({...projectForm, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-endDate">Дата окончания</Label>
                  <Input
                    id="edit-endDate"
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm({...projectForm, endDate: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    if (editingProject) {
                      setClientAssignmentProjectId(editingProject.id);
                      setIsAssignClientModalOpen(true);
                    }
                  }}
                >
                  Назначить заказчика
                </Button>
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary text-white"
                  disabled={editProjectMutation.isPending}
                >
                  {editProjectMutation.isPending ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-slate-500">{t('loading')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCard 
                key={project.id} 
                project={project} 
                onClick={() => setLocation(`/project/${project.id}`)}
                onEdit={openEditModal}
                isExpanded={expandedProjects.has(project.id)}
                onToggleExpand={() => toggleProjectExpansion(project.id)}
              />
            ))}
          </div>
        )}
      </div>

      <BottomNavigation currentPage="home" />

      {/* Assign Client Modal */}
      <AssignClientModal 
        isOpen={isAssignClientModalOpen}
        onClose={() => setIsAssignClientModalOpen(false)}
        projectId={clientAssignmentProjectId}
      />
    </div>
  );
}