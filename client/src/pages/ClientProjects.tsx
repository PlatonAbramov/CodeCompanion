import { useQuery } from "@tanstack/react-query";
import { Building2, MapPin, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { MoneyAED, fmtNum } from "@/components/corp-ui";

interface ClientProject {
  id: string;
  projectId: string;
  projectName: string;
  location?: string;
  status: string;
  totalCost: string;
  totalPaid: string;
  contractNumber?: string;
  description?: string;
}

export default function ClientProjects() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const {
    data: clientProjects,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = useQuery<ClientProject[]>({
    queryKey: ["/api/my-client-projects"],
  });

  console.log('ClientProjects component rendered', { user, clientProjects, isLoadingProjects });

  if (isLoadingProjects) {
    return (
      <div
        className="min-h-screen"
        style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)' }}
      >
        <div className="h-64" />
      </div>
    );
  }

  if (projectsError) {
    console.error('Projects error:', projectsError);
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)' }}
      >
        <div className="text-[14px]" style={{ color: 'var(--corp-neg)' }}>
          Ошибка загрузки проектов
        </div>
      </div>
    );
  }

  const list = Array.isArray(clientProjects) ? clientProjects : [];

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--corp-surface)', borderBottom: '1px solid var(--corp-line)' }}
      >
        <div className="px-4 h-14 flex items-center">
          <h1
            className="text-[16px] font-bold"
            style={{ color: 'var(--corp-ink)', letterSpacing: '-0.3px' }}
          >
            Мои проекты
          </h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        {list.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              background: 'var(--corp-surface)',
              border: '1px dashed var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
              style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-3)' }}
            >
              <Building2 size={28} />
            </div>
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--corp-ink-2)' }}>
              Проектов не найдено
            </p>
            <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              На вас ещё не назначен ни один проект
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {list.map((project) => {
              const totalCost = parseFloat(project.totalCost || '0');
              const totalPaid = parseFloat(project.totalPaid || '0');
              const remaining = totalCost - totalPaid;
              const paidPct = totalCost > 0 ? Math.min(100, (totalPaid / totalCost) * 100) : 0;
              const isActive = project.status === 'active';

              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setLocation(`/projects/${project.projectId}`)}
                  className="text-left p-4 transition-all"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r-lg)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-surface)'; }}
                  data-testid={`client-project-card-${project.projectId}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)' }}
                      >
                        <Building2 size={15} />
                      </div>
                      <h3
                        className="text-[14px] font-semibold truncate"
                        style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}
                      >
                        {project.projectName}
                      </h3>
                    </div>
                    <span
                      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0"
                      style={{
                        background: isActive ? 'var(--corp-pos-soft)' : 'var(--corp-surface-2)',
                        color: isActive ? 'var(--corp-pos)' : 'var(--corp-muted)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {isActive ? 'Активный' : 'Завершён'}
                    </span>
                  </div>

                  {project.location && (
                    <div className="flex items-center gap-1 mb-3 text-[12px]" style={{ color: 'var(--corp-muted)' }}>
                      <MapPin size={12} />
                      <span className="truncate">{project.location}</span>
                    </div>
                  )}

                  {/* Payment progress */}
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span style={{ color: 'var(--corp-muted)' }}>Оплачено</span>
                      <span style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)', fontWeight: 600 }}>
                        {fmtNum(paidPct)}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: 'var(--corp-surface-2)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${paidPct}%`, background: 'var(--corp-pos)' }}
                      />
                    </div>
                  </div>

                  <div
                    className="grid grid-cols-3 gap-2 mt-3 pt-3"
                    style={{ borderTop: '1px solid var(--corp-line)' }}
                  >
                    <div>
                      <p
                        className="text-[9px] uppercase font-bold"
                        style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                      >
                        Стоимость
                      </p>
                      <div className="mt-0.5">
                        <MoneyAED amount={totalCost} size={11} weight={700} tone="ink" />
                      </div>
                    </div>
                    <div>
                      <p
                        className="text-[9px] uppercase font-bold"
                        style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                      >
                        Оплачено
                      </p>
                      <div className="mt-0.5">
                        <MoneyAED amount={totalPaid} size={11} weight={700} tone="pos" />
                      </div>
                    </div>
                    <div>
                      <p
                        className="text-[9px] uppercase font-bold"
                        style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                      >
                        Остаток
                      </p>
                      <div className="mt-0.5">
                        <MoneyAED amount={remaining} size={11} weight={700} tone={remaining > 0 ? 'neg' : 'muted'} />
                      </div>
                    </div>
                  </div>

                  {(project.contractNumber || project.description) && (
                    <div
                      className="mt-3 pt-3 space-y-1"
                      style={{ borderTop: '1px solid var(--corp-line)' }}
                    >
                      {project.contractNumber && (
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--corp-muted)' }}>
                          <FileText size={11} />
                          <span>Договор: <span style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}>{project.contractNumber}</span></span>
                        </div>
                      )}
                      {project.description && (
                        <p className="text-[11px] line-clamp-2" style={{ color: 'var(--corp-ink-3)' }}>
                          {project.description}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
