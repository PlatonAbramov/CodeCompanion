import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  ProjectorIcon, TrendingUp, Calendar
} from "lucide-react";

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

export default function DirectorDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({
    name: '',
    location: '',
    totalCost: '',
    startDate: '',
    endDate: ''
  });

  // Get projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/projects', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateModalOpen(false);
      setProjectForm({
        name: '',
        location: '',
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

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    createProjectMutation.mutate(projectForm);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const activeProjectsCount = projects.filter(p => p.status === 'active').length;
  const totalProfit = projects.reduce((sum, project) => {
    return sum + parseFloat(project.totalCost) * 0.15; // Assuming 15% profit margin
  }, 0);

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
              <Button variant="ghost" size="sm">
                <Bell size={20} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => logout()}>
                <LogOut size={20} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Statistics Cards */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
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
                  <p className="text-2xl font-bold text-secondary">
                    {formatCurrency(totalProfit.toString())}
                  </p>
                </div>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-secondary" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Projects List */}
      <div className="px-4 pb-20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{t('projects')}</h3>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-white">
                <Plus size={16} className="mr-1" />
                {t('create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('createProject')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <Label>{t('projectName')} *</Label>
                  <Input
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})}
                    placeholder={t('projectName')}
                    required
                  />
                </div>
                
                <div>
                  <Label>{t('projectLocation')}</Label>
                  <Input
                    value={projectForm.location}
                    onChange={(e) => setProjectForm({...projectForm, location: e.target.value})}
                    placeholder={t('projectLocation')}
                  />
                </div>
                
                <div>
                  <Label>{t('totalCost')} *</Label>
                  <Input
                    type="number"
                    value={projectForm.totalCost}
                    onChange={(e) => setProjectForm({...projectForm, totalCost: e.target.value})}
                    placeholder="0"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('startDate')}</Label>
                    <Input
                      type="date"
                      value={projectForm.startDate}
                      onChange={(e) => setProjectForm({...projectForm, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>{t('endDate')}</Label>
                    <Input
                      type="date"
                      value={projectForm.endDate}
                      onChange={(e) => setProjectForm({...projectForm, endDate: e.target.value})}
                    />
                  </div>
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
        
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-slate-500">{t('loading')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Card key={project.id} className="shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900 mb-1">{project.name}</h4>
                      {project.location && (
                        <p className="text-sm text-slate-500">{project.location}</p>
                      )}
                    </div>
                    <span className="bg-secondary/10 text-secondary px-2 py-1 rounded-full text-xs font-medium">
                      {t(project.status)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-slate-500">{t('totalCost')}</p>
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(project.totalCost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t('profit')}</p>
                      <p className="font-semibold text-secondary">
                        {formatCurrency((parseFloat(project.totalCost) * 0.15).toString())}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-slate-500">
                      <Calendar size={16} className="mr-1" />
                      <span>{formatDate(project.createdAt)}</span>
                    </div>
                    <Button 
                      variant="link" 
                      onClick={() => setLocation(`/project/${project.id}`)}
                      className="text-primary text-sm font-medium p-0"
                    >
                      Подробнее
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2">
        <div className="flex items-center justify-around">
          <button className="flex flex-col items-center py-2 text-primary">
            <Home size={20} className="mb-1" />
            <span className="text-xs">{t('home')}</span>
          </button>
          <button className="flex flex-col items-center py-2 text-slate-400">
            <Folder size={20} className="mb-1" />
            <span className="text-xs">{t('projects')}</span>
          </button>
          <button 
            className="flex flex-col items-center py-2 text-slate-400"
            onClick={() => setLocation('/employees')}
          >
            <Users size={20} className="mb-1" />
            <span className="text-xs">{t('employees')}</span>
          </button>
          <button className="flex flex-col items-center py-2 text-slate-400">
            <BarChart3 size={20} className="mb-1" />
            <span className="text-xs">{t('reports')}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
