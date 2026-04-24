import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, FileText, Trash2, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { CorpHeader, CorpEmpty, fmtDateRu } from "@/components/corp-ui";

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
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSheetName, setNewSheetName] = useState("");

  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director' || user?.role === 'master';

  const { data: sheets, isLoading } = useQuery<ImplementationSheet[]>({
    queryKey: [`/api/projects/${projectId}/implementation-sheets`],
    enabled: !!projectId,
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
      queryClient.invalidateQueries({ queryKey: ["/api/my-client-projects"] });
      toast({ title: language === 'ru' ? "Лист реализации создан" : "Implementation sheet created" });
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
      return apiRequest(`/api/implementation-sheets/${sheetId}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/implementation-sheets`] });
      toast({ title: language === 'ru' ? "Лист удален" : "Sheet deleted" });
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
    if (newSheetName.trim()) createSheetMutation.mutate(newSheetName);
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title={language === 'ru' ? 'Листы реализации' : 'Implementation Sheets'}
        subtitle={language === 'ru' ? 'Прогресс работ по проекту' : 'Project work progress'}
        onBack={() => setLocation(`/projects/${projectId}`)}
        action={isAdminOrDirector ? (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
                style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
                data-testid="button-create-sheet"
              >
                <Plus size={14} /> <span className="hidden sm:inline">{language === 'ru' ? 'Новый лист' : 'New'}</span>
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {language === 'ru' ? 'Создать лист реализации' : 'Create Implementation Sheet'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">{language === 'ru' ? 'Название' : 'Name'}</Label>
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
        ) : null}
      />

      <main className="px-4 pt-4">
        {!isLoading && (!sheets || sheets.length === 0) ? (
          <CorpEmpty
            icon={<FileText size={28} />}
            title={language === 'ru' ? 'Нет листов реализации' : 'No implementation sheets'}
            description={
              isAdminOrDirector
                ? (language === 'ru' ? 'Создайте первый лист для начала работы' : 'Create the first sheet to get started')
                : (language === 'ru' ? 'Листы появятся здесь после создания' : 'Sheets will appear here once created')
            }
          />
        ) : (
          <div className="flex flex-col gap-2">
            {sheets?.map((sheet) => {
              const progress = parseFloat(sheet.totalProgress || "0");
              const progressColor =
                progress >= 100 ? 'var(--corp-pos)' :
                progress > 0 ? 'var(--corp-accent)' :
                'var(--corp-ink-3)';
              return (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => setLocation(`/implementation-sheets/${sheet.id}`)}
                  className="text-left p-4 transition-all"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-surface)'; }}
                  data-testid={`sheet-card-${sheet.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)' }}
                      >
                        <FileText size={15} />
                      </div>
                      <h3
                        className="text-[14px] font-semibold truncate"
                        style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}
                      >
                        {sheet.name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isAdminOrDirector && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(language === 'ru' ? 'Удалить лист?' : 'Delete sheet?')) {
                              deleteSheetMutation.mutate(sheet.id);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.stopPropagation();
                              if (window.confirm(language === 'ru' ? 'Удалить лист?' : 'Delete sheet?')) {
                                deleteSheetMutation.mutate(sheet.id);
                              }
                            }
                          }}
                          className="w-7 h-7 rounded flex items-center justify-center transition-colors cursor-pointer"
                          style={{ color: 'var(--corp-neg)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-neg-soft)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          data-testid={`button-delete-${sheet.id}`}
                        >
                          <Trash2 size={13} />
                        </span>
                      )}
                      <ChevronRight size={16} style={{ color: 'var(--corp-muted)' }} />
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] mb-1.5">
                      <span style={{ color: 'var(--corp-muted)' }}>
                        {language === 'ru' ? 'Прогресс' : 'Progress'}
                      </span>
                      <span style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)', fontWeight: 700, fontSize: 12 }}>
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--corp-surface-2)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, progress)}%`, background: progressColor }}
                      />
                    </div>
                  </div>

                  <div
                    className="flex items-center justify-between gap-2 mt-3 pt-3 text-[11px]"
                    style={{ borderTop: '1px solid var(--corp-line)', color: 'var(--corp-muted)' }}
                  >
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                      style={{
                        background: sheet.status === 'active' ? 'var(--corp-accent-soft)' : 'var(--corp-pos-soft)',
                        color: sheet.status === 'active' ? 'var(--corp-accent)' : 'var(--corp-pos)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {sheet.status === 'active'
                        ? (language === 'ru' ? 'Активный' : 'Active')
                        : (language === 'ru' ? 'Завершён' : 'Done')}
                    </span>
                    <span style={{ fontFamily: 'var(--corp-mono)' }}>
                      {language === 'ru' ? 'Обновлён ' : 'Updated '}{fmtDateRu(sheet.updatedAt)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
