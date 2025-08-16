import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Plus, FileText, Trash2, Edit, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";

interface ImplementationSheet {
  id: string;
  projectId: string;
  sourceDocumentId?: string;
  name: string;
  status: string;
  totalProgress: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function ImplementationSheets() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");
  
  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';

  const { data: sheets, isLoading } = useQuery<ImplementationSheet[]>({
    queryKey: [`/api/projects/${projectId}/implementation-sheets`],
    enabled: !!projectId
  });

  const createSheetMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest(`/api/projects/${projectId}/implementation-sheets`, {
        method: "POST",
        body: JSON.stringify({ name }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/implementation-sheets`] });
      toast({
        title: language === 'ru' ? "Лист реализации создан" : "Implementation sheet created",
      });
      setIsCreateDialogOpen(false);
      setNewSheetName("");
    },
    onError: () => {
      toast({
        title: language === 'ru' ? "Ошибка" : "Error",
        description: language === 'ru' ? "Не удалось создать лист реализации" : "Failed to create implementation sheet",
        variant: "destructive",
      });
    },
  });

  const deleteSheetMutation = useMutation({
    mutationFn: async (sheetId: string) => {
      return apiRequest(`/api/implementation-sheets/${sheetId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/implementation-sheets`] });
      toast({
        title: language === 'ru' ? "Лист удален" : "Sheet deleted",
      });
    },
    onError: () => {
      toast({
        title: language === 'ru' ? "Ошибка" : "Error",
        description: language === 'ru' ? "Не удалось удалить лист" : "Failed to delete sheet",
        variant: "destructive",
      });
    },
  });

  const handleCreateSheet = () => {
    if (newSheetName.trim()) {
      createSheetMutation.mutate(newSheetName);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">
            {language === 'ru' ? 'Загрузка...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/project/${projectId}`}>
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            {language === 'ru' ? 'Листы реализации' : 'Implementation Sheets'}
          </h1>
        </div>
        
        {isAdminOrDirector && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-sheet">
                <Plus className="mr-2 h-4 w-4" />
                {language === 'ru' ? 'Новый лист' : 'New Sheet'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === 'ru' ? 'Создать лист реализации' : 'Create Implementation Sheet'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    {language === 'ru' ? 'Название' : 'Name'}
                  </Label>
                  <Input
                    id="name"
                    value={newSheetName}
                    onChange={(e) => setNewSheetName(e.target.value)}
                    placeholder={language === 'ru' ? 'Введите название листа' : 'Enter sheet name'}
                    data-testid="input-sheet-name"
                  />
                </div>
                <Button 
                  onClick={handleCreateSheet}
                  disabled={!newSheetName.trim() || createSheetMutation.isPending}
                  className="w-full"
                  data-testid="button-confirm-create"
                >
                  {createSheetMutation.isPending 
                    ? (language === 'ru' ? 'Создание...' : 'Creating...') 
                    : (language === 'ru' ? 'Создать' : 'Create')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {sheets?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              {language === 'ru' 
                ? 'Нет листов реализации для этого проекта' 
                : 'No implementation sheets for this project'}
            </p>
            {isAdminOrDirector && (
              <p className="text-sm text-muted-foreground mt-2">
                {language === 'ru' 
                  ? 'Создайте первый лист для начала работы' 
                  : 'Create the first sheet to get started'}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sheets?.map((sheet) => (
            <Card key={sheet.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{sheet.name}</span>
                  {isAdminOrDirector && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSheetMutation.mutate(sheet.id)}
                      data-testid={`button-delete-${sheet.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {language === 'ru' ? 'Прогресс' : 'Progress'}
                      </span>
                      <span className="text-sm font-semibold">
                        {parseFloat(sheet.totalProgress || "0").toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={parseFloat(sheet.totalProgress || "0")} />
                  </div>
                  
                  <div className="text-sm text-muted-foreground">
                    <p>
                      {language === 'ru' ? 'Статус: ' : 'Status: '}
                      <span className="font-medium">
                        {sheet.status === 'active' 
                          ? (language === 'ru' ? 'Активный' : 'Active')
                          : (language === 'ru' ? 'Завершен' : 'Completed')}
                      </span>
                    </p>
                    <p>
                      {language === 'ru' ? 'Обновлено: ' : 'Updated: '}
                      {new Date(sheet.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <Link href={`/implementation-sheets/${sheet.id}`}>
                    <Button className="w-full" data-testid={`button-view-${sheet.id}`}>
                      <Edit className="mr-2 h-4 w-4" />
                      {language === 'ru' ? 'Открыть' : 'Open'}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}