import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ListSkeleton } from "@/components/skeletons";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  HardHat, ClipboardList, Building2, ChevronRight,
} from "lucide-react";

interface WorkerProject {
  id: string;
  name: string;
  location?: string | null;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
}

function fmtTodayRu() {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function fmtDateRu(s?: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: projects = [], isLoading } = useQuery<WorkerProject[]>({
    queryKey: ['/api/projects'],
  });

  const activeProjects = projects.filter(p => p.status === 'active');

  return (
    <div
      className="min-h-screen pb-4"
      style={{
        background: 'var(--corp-bg)',
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* Шапка */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--corp-ink)', color: '#fff' }}
          >
            <HardHat size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold leading-tight" style={{ color: 'var(--corp-ink)' }}>
              {user?.name || 'Рабочий'}
            </div>
            <div className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              Сегодня · {fmtTodayRu()}
            </div>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Сводка */}
      <div className="px-4">
        <div
          className="p-4 flex items-center gap-3"
          style={{
            background: 'var(--corp-surface)',
            border: '1px solid var(--corp-line)',
            borderRadius: 'var(--corp-r-lg)',
          }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(37,99,235,0.10)', color: 'var(--corp-accent)' }}
          >
            <Building2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-medium" style={{ color: 'var(--corp-muted)' }}>
              Активных проектов
            </div>
            <div className="text-[20px] font-bold" style={{ color: 'var(--corp-ink)' }}>
              {activeProjects.length}
            </div>
          </div>
        </div>
      </div>

      {/* Список проектов */}
      <div className="px-4 pt-5">
        <div className="text-[12px] font-bold uppercase mb-2" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
          Проекты
        </div>

        {isLoading ? (
          <ListSkeleton count={4} />
        ) : activeProjects.length === 0 ? (
          <div
            className="p-6 text-center text-[13px]"
            style={{
              background: 'var(--corp-surface)',
              border: '1px solid var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
              color: 'var(--corp-muted)',
            }}
            data-testid="text-no-projects"
          >
            Активных проектов пока нет
          </div>
        ) : (
          <div className="space-y-2">
            {activeProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setLocation(`/projects/${project.id}`)}
                className="w-full p-4 text-left flex items-center gap-3"
                style={{
                  background: 'var(--corp-surface)',
                  border: '1px solid var(--corp-line)',
                  borderRadius: 'var(--corp-r-lg)',
                }}
                data-testid={`button-project-${project.id}`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)' }}
                >
                  <ClipboardList size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold truncate" style={{ color: 'var(--corp-ink)' }}>
                    {project.name}
                  </div>
                  <div className="text-[12px] truncate" style={{ color: 'var(--corp-muted)' }}>
                    {project.location || 'Без адреса'}
                    {project.startDate ? ` · с ${fmtDateRu(project.startDate)}` : ''}
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--corp-muted)' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
