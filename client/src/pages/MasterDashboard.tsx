import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  HardHat, LogOut, Plus, Home, Receipt, PlusCircle,
  Check, Calendar
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  location?: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export default function MasterDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  // Get all projects for masters to view
  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const formatCurrency = (amount: string) => {
    const num = parseFloat(amount || "0");
    return `${num.toLocaleString("ru-RU")} AED`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header
        className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 3.5rem)' }}
      >
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center mr-3">
                <HardHat className="text-white" size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">{user?.name}</h2>
                <p className="text-sm text-slate-500">{t('master')}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="p-4">
        <div className="bg-gradient-to-r from-accent to-orange-500 rounded-xl p-4 mb-6 text-white">
          <h3 className="font-semibold mb-2">Рабочая область</h3>
          <p className="text-white/80 text-sm">Просмотр проектов и работа с листами реализации</p>
        </div>
      </div>

      {/* Projects */}
      <div className="px-4 pb-20">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Проекты</h3>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-slate-500">{t('loading')}</p>
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Home size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Проекты не найдены</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setLocation(`/projects/${project.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">{project.name}</h4>
                      {project.location && (
                        <p className="text-sm text-slate-500">{project.location}</p>
                      )}
                    </div>
                    <div className={`inline-block px-2 py-1 rounded-full text-xs ${
                      project.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : project.status === 'completed'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {project.status === 'active' ? 'Активный' : 
                       project.status === 'completed' ? 'Завершен' : 'Архивный'}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Создан: {formatDate(project.createdAt)}</span>
                    {project.startDate && (
                      <span>Начало: {formatDate(project.startDate)}</span>
                    )}
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
            <span className="text-xs">Главная</span>
          </button>
          <button 
            className="flex flex-col items-center py-2 text-slate-400"
            onClick={() => setLocation('/implementation-sheets')}
          >
            <Receipt size={20} className="mb-1" />
            <span className="text-xs">Листы</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
