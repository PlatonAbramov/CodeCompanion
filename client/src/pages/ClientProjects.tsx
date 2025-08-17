import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function ClientProjects() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Get client's assigned projects
  const { 
    data: clientProjects, 
    isLoading: isLoadingProjects, 
    error: projectsError 
  } = useQuery({
    queryKey: ["/api/my-client-projects"],
  });

  console.log('ClientProjects component rendered', { user, clientProjects, isLoadingProjects });

  if (isLoadingProjects) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Загрузка проектов...</div>
          </div>
        </div>
      </div>
    );
  }

  if (projectsError) {
    console.error('Projects error:', projectsError);
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg text-red-600">Ошибка загрузки проектов</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header for client users */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-40">
        <div className="px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-slate-900">Мои проекты</h1>
          <Button 
            variant="outline" 
            size="sm"
            onClick={async () => {
              await apiRequest('/api/auth/logout', { method: 'POST' });
              setLocation('/login');
            }}
          >
            Выйти
          </Button>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-6">
        {/* Projects list for client users */}
        {Array.isArray(clientProjects) && clientProjects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {clientProjects.map((project: any) => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer hover:bg-slate-50"
                onClick={() => setLocation(`/projects/${project.projectId}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {project.projectName}
                      </CardTitle>
                      {project.location && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {project.location}
                        </p>
                      )}
                    </div>
                    <Badge variant={project.status === 'active' ? "default" : "secondary"}>
                      {project.status === 'active' ? "Активный" : "Завершен"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="font-medium">Стоимость:</span>
                    <span className="ml-2">{Number(project.totalCost).toLocaleString()} AED</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span className="font-medium">Оплачено:</span>
                    <span className="ml-2">{Number(project.totalPaid).toLocaleString()} AED</span>
                  </div>
                  {project.contractNumber && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <span className="font-medium">Договор:</span>
                      <span className="ml-2">{project.contractNumber}</span>
                    </div>
                  )}
                  {project.description && (
                    <div className="text-sm text-muted-foreground">
                      <span className="font-medium">Описание:</span>
                      <p className="mt-1">{project.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Проектов не найдено</h3>
            <p className="text-muted-foreground">
              На вас еще не назначен ни одного проекта
            </p>
          </div>
        )}
      </div>
    </div>
  );
}