import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ListSkeleton } from "@/components/skeletons";
import {
  HardHat, LogOut, Plus, Receipt, Bell, ClipboardList,
  Building2, History, ChevronRight, Mic,
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

interface ImplementationSheet {
  id: string;
  projectId: string;
  status?: string;
}

// === Helpers ================================================================
function fmtDateRu(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtTodayRu() {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

// === Page ===================================================================
export default function MasterDashboard() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const { data: sheets = [] } = useQuery<ImplementationSheet[]>({
    queryKey: ['/api/implementation-sheets'],
    retry: false,
  });

  const activeProjects = projects.filter(p => p.status === 'active');
  const archivedCount = projects.filter(p => p.status !== 'active').length;
  const sheetsCount = Array.isArray(sheets) ? sheets.length : 0;

  return (
    <div
      className="min-h-screen pb-4"
      style={{
        background: 'var(--corp-bg)',
        fontFamily: 'var(--corp-font)',
        color: 'var(--corp-ink)',
      }}
    >
      {/* === Top bar ============================================ */}
      <header
        className="sticky top-0 z-40"
        style={{
          background: 'var(--corp-surface)',
          borderBottom: '1px solid var(--corp-line)',
        }}
      >
        <div className="px-4 h-14 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--corp-ink)', color: '#fff' }}
          >
            <HardHat size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold" style={{ color: 'var(--corp-muted)' }}>
              Добрый день,
            </p>
            <h2
              className="text-[14px] font-bold truncate"
              style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
            >
              {user?.name || 'Мастер'}
            </h2>
          </div>
          <LanguageSwitcher />
          <button
            type="button"
            title="Уведомления"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--corp-ink-2)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            data-testid="button-notifications"
          >
            <Bell size={17} />
          </button>
          <button
            type="button"
            title="Выйти"
            onClick={() => logout()}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--corp-ink-2)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            data-testid="button-logout"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <main className="px-4 pt-5">
        {/* === Welcome label ==================================== */}
        <div className="mb-4">
          <p
            className="text-[10px] font-bold uppercase"
            style={{ color: 'var(--corp-muted)', letterSpacing: '0.05em' }}
          >
            Рабочее пространство · {fmtTodayRu()}
          </p>
          <h1
            className="mt-1 font-bold"
            style={{
              fontSize: 'clamp(20px, 5vw, 24px)',
              letterSpacing: '-0.6px',
              color: 'var(--corp-ink)',
            }}
          >
            Готов к работе
          </h1>
        </div>

        {/* === Hero CTA: Add expense ============================ */}
        <button
          type="button"
          onClick={() => setLocation('/expenses')}
          className="w-full p-5 transition-all text-left mb-4"
          style={{
            background: 'var(--corp-brand)',
            border: 'none',
            borderRadius: 'var(--corp-r-lg)',
            color: '#ffffff',
            cursor: 'pointer',
          }}
          data-testid="button-add-expense-hero"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-bold uppercase"
                style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}
              >
                Быстрое действие
              </p>
              <div
                className="mt-2 font-bold flex items-center gap-2"
                style={{
                  fontSize: 'clamp(22px, 5vw, 28px)',
                  letterSpacing: '-0.6px',
                  lineHeight: 1.1,
                }}
              >
                <Plus size={26} strokeWidth={2.5} />
                Добавить расход
              </div>
              <p className="mt-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Загрузите чек или используйте голосовой ввод
              </p>
            </div>
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.18)' }}
            >
              <Mic size={20} strokeWidth={2} />
            </div>
          </div>

          {/* Stats strip */}
          <div
            className="mt-4 pt-4 grid grid-cols-3 gap-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}
          >
            {[
              { label: 'Активных', value: activeProjects.length },
              { label: 'Листов', value: sheetsCount },
              { label: 'Архив', value: archivedCount },
            ].map(s => (
              <div key={s.label}>
                <p
                  className="text-[10px] font-bold uppercase"
                  style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.05em' }}
                >
                  {s.label}
                </p>
                <p
                  className="mt-1 font-bold"
                  style={{
                    fontSize: 18,
                    letterSpacing: '-0.3px',
                    fontFamily: 'var(--corp-mono)',
                  }}
                >
                  {s.value}
                </p>
              </div>
            ))}
          </div>
        </button>

        {/* === Quick actions grid ============================= */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            {
              label: 'Расход',
              icon: Plus,
              onClick: () => setLocation('/expenses'),
              testId: 'quick-action-expense',
            },
            {
              label: 'Листы',
              icon: ClipboardList,
              onClick: () => setLocation('/implementation-sheets'),
              testId: 'quick-action-sheets',
            },
            {
              label: 'Проекты',
              icon: Building2,
              onClick: () => {
                if (activeProjects[0]) setLocation(`/projects/${activeProjects[0].id}`);
              },
              testId: 'quick-action-projects',
            },
            {
              label: 'История',
              icon: History,
              onClick: () => setLocation('/history'),
              testId: 'quick-action-history',
            },
          ].map(qa => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                type="button"
                onClick={qa.onClick}
                className="flex flex-col items-center gap-2 py-3 transition-all"
                style={{
                  background: 'var(--corp-surface)',
                  border: '1px solid var(--corp-line)',
                  borderRadius: 'var(--corp-r-lg)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-surface)'; }}
                data-testid={qa.testId}
              >
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'var(--corp-accent-soft)',
                    color: 'var(--corp-accent)',
                  }}
                >
                  <Icon size={16} />
                </span>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--corp-ink-2)' }}>
                  {qa.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* === Projects list ================================== */}
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-[14px] font-bold"
            style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
          >
            Мои проекты
          </h3>
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--corp-surface-2)',
              color: 'var(--corp-muted)',
              fontFamily: 'var(--corp-mono)',
            }}
          >
            {activeProjects.length}
          </span>
        </div>

        {isLoading && projects.length === 0 ? (
          <ListSkeleton count={3} />
        ) : activeProjects.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              background: 'var(--corp-surface)',
              border: '1px dashed var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
          >
            <Receipt size={36} className="mx-auto mb-3" style={{ color: 'var(--corp-ink-3)' }} />
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--corp-ink-2)' }}>
              Проектов пока нет
            </p>
            <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              Они появятся здесь, когда руководитель назначит вас на проект
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activeProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => setLocation(`/projects/${project.id}`)}
                className="w-full p-3.5 text-left transition-all flex items-center gap-3"
                style={{
                  background: 'var(--corp-surface)',
                  border: '1px solid var(--corp-line)',
                  borderRadius: 'var(--corp-r-lg)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-surface)'; }}
                data-testid={`project-card-${project.id}`}
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: 'var(--corp-accent-soft)',
                    color: 'var(--corp-accent)',
                  }}
                >
                  <HardHat size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold text-[14px] truncate"
                    style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}
                  >
                    {project.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {project.location && (
                      <span className="text-[11px] truncate" style={{ color: 'var(--corp-muted)' }}>
                        {project.location}
                      </span>
                    )}
                    {project.location && project.endDate && (
                      <span className="text-[11px]" style={{ color: 'var(--corp-ink-3)' }}>·</span>
                    )}
                    {project.endDate && (
                      <span
                        className="text-[11px] font-medium whitespace-nowrap"
                        style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}
                      >
                        до {fmtDateRu(project.endDate)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--corp-muted)' }} className="flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
