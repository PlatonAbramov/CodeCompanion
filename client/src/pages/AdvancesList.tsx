import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, User, MoreVertical, Trash2 } from "lucide-react";
import {
  CorpHeader, CorpEmpty, CorpHeroSummary, MoneyAED, fmtDateRu,
} from "@/components/corp-ui";

interface Advance {
  id: string;
  amount: string;
  recipient: string;
  description?: string;
  date: string;
  createdAt: string;
  user: { name: string };
}

interface Project {
  id: string;
  name: string;
}

export default function AdvancesList() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const projectId = location.split('/')[2];
  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';

  const { data: project } = useQuery<Project>({ queryKey: ['/api/projects', projectId] });
  const { data: advances = [], isLoading } = useQuery<Advance[]>({
    queryKey: ['/api/projects', projectId, 'advances'],
  });

  const { mutate: deleteAdvance } = useMutation({
    mutationFn: async (advanceId: string) => {
      const response = await fetch(`/api/advances/${advanceId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete advance');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Аванс удалён", description: "Аванс успешно удалён" });
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'advances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/projects', projectId, 'financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['/api/financial-overview'] });
    },
    onError: (error: any) => {
      toast({ title: "Ошибка", description: error.message || "Не удалось удалить аванс", variant: "destructive" });
    },
  });

  const total = advances.reduce((s, a) => s + parseFloat(a.amount), 0);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      <CorpHeader
        title="Выданные авансы"
        subtitle={project?.name}
        onBack={() => setLocation(`/projects/${projectId}`)}
        action={isAdminOrDirector ? (
          <button
            type="button"
            onClick={() => setLocation(`/add-advance/${projectId}`)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
            style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
            data-testid="button-add-advance"
          >
            <Plus size={14} /> <span className="hidden sm:inline">Аванс</span>
          </button>
        ) : null}
      />

      <main className="px-4 pt-4">
        {!isLoading && advances.length === 0 ? (
          <CorpEmpty
            icon={<User size={28} />}
            title="Нет авансов"
            description="Авансы сотрудникам пока не выдавались"
            actionLabel={isAdminOrDirector ? "Добавить аванс" : undefined}
            onAction={isAdminOrDirector ? () => setLocation(`/add-advance/${projectId}`) : undefined}
          />
        ) : (
          <>
            <CorpHeroSummary
              label="Всего выдано"
              amount={total}
              subtext={`${advances.length} ${advances.length === 1 ? 'аванс' : 'авансов'}`}
              tone="dark"
            />

            <h3
              className="text-[10px] font-bold uppercase mb-2"
              style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
            >
              История выплат
            </h3>
            <div className="flex flex-col gap-2">
              {advances.map((advance) => (
                <div
                  key={advance.id}
                  className="p-4"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                  }}
                  data-testid={`advance-card-${advance.id}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <MoneyAED amount={advance.amount} size={18} weight={700} tone="neg" />
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[11px]"
                        style={{ color: 'var(--corp-ink-3)', fontFamily: 'var(--corp-mono)', whiteSpace: 'nowrap' }}
                      >
                        {fmtDateRu(advance.date)}
                      </span>
                      {isAdminOrDirector && (
                        <AdvanceMenu
                          onEdit={() => setLocation(`/edit-advance/${projectId}/${advance.id}`)}
                          onDelete={() => deleteAdvance(advance.id)}
                          deleteTitle="Удалить аванс?"
                          deleteDescription="Это действие нельзя отменить. Аванс будет удалён безвозвратно."
                        />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-1.5">
                    <User size={13} style={{ color: 'var(--corp-muted)' }} />
                    <span className="text-[13px] font-medium" style={{ color: 'var(--corp-ink-2)' }}>
                      {advance.recipient}
                    </span>
                  </div>

                  {advance.description && (
                    <p className="text-[12px] mb-1" style={{ color: 'var(--corp-ink-3)' }}>
                      {advance.description}
                    </p>
                  )}
                  <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                    Добавил: {advance.user?.name || 'Неизвестно'}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export function AdvanceMenu({
  onEdit, onDelete, deleteTitle, deleteDescription,
}: {
  onEdit: () => void;
  onDelete: () => void;
  deleteTitle: string;
  deleteDescription: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="w-7 h-7 rounded flex items-center justify-center transition-colors"
          style={{ color: 'var(--corp-ink-3)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          data-testid="menu-trigger"
        >
          <MoreVertical size={15} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>
          <Edit size={14} className="mr-2" /> Редактировать
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
              <Trash2 size={14} className="mr-2" /> Удалить
            </DropdownMenuItem>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{deleteTitle}</AlertDialogTitle>
              <AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-red-600 hover:bg-red-700">
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
