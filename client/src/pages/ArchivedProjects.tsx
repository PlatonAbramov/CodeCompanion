import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Archive, ArchiveRestore, Calendar, TrendingUp, 
  TrendingDown, ChevronDown, ChevronUp, Package
} from "lucide-react";
import { useState } from "react";

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

function ProjectCard({ 
  project, 
  onRestore,
  isExpanded, 
  onToggleExpand 
}: { 
  project: Project; 
  onRestore: (projectId: string) => void;
  isExpanded: boolean; 
  onToggleExpand: () => void; 
}) {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  
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

  const currentProfit = parseFloat(financialSummary?.currentProfit || '0');
  const projectedProfit = parseFloat(financialSummary?.projectedProfit || '0');

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 
            className="font-semibold text-lg text-slate-900 cursor-pointer hover:text-primary"
            onClick={() => setLocation(`/projects/${project.id}`)}
          >
            {project.name}
          </h3>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onRestore(project.id)}
              title="Разархивировать"
              className="text-blue-600 hover:text-blue-800"
            >
              <ArchiveRestore size={18} />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onToggleExpand}
            >
              {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </Button>
          </div>
        </div>
        
        {project.location && (
          <p className="text-sm text-slate-500 mb-2">{project.location}</p>
        )}
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-xs text-slate-500">{t('totalCost')}</p>
            <p className="font-semibold text-slate-900">
              {formatCurrency(project.totalCost)}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2">
            <p className="text-xs text-slate-500">Статус</p>
            <p className="font-semibold text-gray-600">Архивный</p>
          </div>
        </div>
        
        {isExpanded && financialSummary && (
          <div className="border-t pt-3 mt-3">
            <h4 className="font-medium text-sm text-slate-700 mb-2">Финансовая сводка</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-slate-500">Доходы</p>
                <p className="font-semibold text-green-600">
                  {formatCurrency(financialSummary.totalRevenues)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Расходы</p>
                <p className="font-semibold text-red-600">
                  {formatCurrency(financialSummary.totalExpenses)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Текущая прибыль</p>
                <p className={`font-semibold ${currentProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financialSummary.currentProfit)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Ожидаемая прибыль</p>
                <p className={`font-semibold ${projectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(financialSummary.projectedProfit)}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center text-sm text-slate-500">
          <Calendar size={16} className="mr-1" />
          <span>Архивирован: {formatDate(project.createdAt)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ArchivedProjects() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // Get archived projects
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects/archived'],
  });

  // Restore project mutation
  const restoreProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const res = await apiRequest(`/api/projects/${projectId}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ archive: false })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects/archived'] });
      toast({
        title: "Успешно",
        description: "Проект разархивирован",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось разархивировать проект",
        variant: "destructive",
      });
    },
  });

  const handleRestore = (projectId: string) => {
    if (window.confirm('Вы уверены, что хотите разархивировать этот проект?')) {
      restoreProjectMutation.mutate(projectId);
    }
  };

  const toggleProjectExpand = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-500">Загрузка...</p>
        </div>
      </div>
    );
  }

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
                onClick={() => setLocation('/director')}
                className="mr-2"
                data-testid="button-back"
              >
                <ArrowLeft size={20} />
              </Button>
              <div className="flex items-center">
                <Archive className="text-gray-600 mr-2" size={24} />
                <div>
                  <h2 className="font-semibold text-slate-900">Архивные проекты</h2>
                  <p className="text-sm text-slate-500">Завершенные и архивированные проекты</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4">
        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Всего архивных</p>
                  <p className="text-2xl font-bold text-slate-900">{projects.length}</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Archive className="text-gray-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Общая стоимость</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {projects.reduce((sum, p) => sum + parseFloat(p.totalCost || '0'), 0).toLocaleString('ru-RU')} AED
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="text-green-600" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Projects List */}
        {projects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Archive className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Нет архивных проектов</h3>
              <p className="text-slate-500">Здесь будут отображаться завершенные и архивированные проекты</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onRestore={handleRestore}
                isExpanded={expandedProjects.has(project.id)}
                onToggleExpand={() => toggleProjectExpand(project.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}