import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Phone, Mail, Building2, User, FileText, Calendar, DollarSign, Edit, Plus, Briefcase } from "lucide-react";
import { AssignContractorModal } from "@/components/AssignContractorModal";
import { CorpHeader, MoneyAED, fmtDateRu, CorpEmpty } from "@/components/corp-ui";

interface Contractor {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  specialization: string;
  licenseUrl?: string;
  documentUrls?: string[];
  isActive: boolean;
  createdAt: string;
}

interface ContractorExpense {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  projectId: string;
  projectName: string;
}

interface ContractorStats {
  totalExpenses: number;
  totalProjects: number;
  remainingBudget: number;
}

interface ContractorProject {
  id: string;
  projectId: string;
  projectName: string;
  budgetAllocation: number;
  workDescription: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
}

const SECTION_STYLE: React.CSSProperties = {
  background: 'var(--corp-surface)',
  border: '1px solid var(--corp-line)',
  borderRadius: 'var(--corp-r-lg)',
};

function StatCard({ icon, label, value, tone = 'ink', mono = true }: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  tone?: 'pos' | 'neg' | 'accent' | 'ink';
  mono?: boolean;
}) {
  const iconBg =
    tone === 'pos' ? 'rgba(22,163,74,0.10)' :
    tone === 'neg' ? 'rgba(220,38,38,0.10)' :
    tone === 'accent' ? 'rgba(37,99,235,0.10)' :
    'var(--corp-surface-2)';
  const iconColor =
    tone === 'pos' ? 'var(--corp-pos)' :
    tone === 'neg' ? 'var(--corp-neg)' :
    tone === 'accent' ? 'var(--corp-accent)' :
    'var(--corp-ink-2)';
  return (
    <div className="p-4" style={SECTION_STYLE}>
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>{label}</p>
          <div
            className="font-bold mt-0.5"
            style={{
              color: 'var(--corp-ink)',
              fontSize: 16,
              fontFamily: mono ? 'var(--corp-mono)' : 'inherit',
            }}
          >
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ active, labelOn = 'Активен', labelOff = 'Завершен' }: { active: boolean; labelOn?: string; labelOff?: string }) {
  return (
    <span
      className="inline-flex items-center px-2 h-5 text-[10px] font-bold uppercase"
      style={{
        background: active ? 'rgba(22,163,74,0.10)' : 'var(--corp-surface-2)',
        color: active ? 'var(--corp-pos)' : 'var(--corp-ink-3)',
        borderRadius: 'var(--corp-r-sm)',
        letterSpacing: '0.04em',
      }}
    >
      {active ? labelOn : labelOff}
    </span>
  );
}

export default function ContractorDetail() {
  const params = useParams();
  const contractorId = params.id;
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const { data: contractor, isLoading: contractorLoading } = useQuery<Contractor>({
    queryKey: ['/api/contractors', contractorId],
    enabled: !!(contractorId && (user?.role === 'admin' || user?.role === 'director')),
  });

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<ContractorExpense[]>({
    queryKey: ['/api/contractors', contractorId, 'expenses'],
    enabled: !!(contractorId && (user?.role === 'admin' || user?.role === 'director')),
  });

  const { data: stats } = useQuery<ContractorStats>({
    queryKey: ['/api/contractors', contractorId, 'stats'],
    enabled: !!(contractorId && (user?.role === 'admin' || user?.role === 'director')),
  });

  const { data: projects = [] } = useQuery<ContractorProject[]>({
    queryKey: ['/api/contractors', contractorId, 'projects'],
    enabled: !!(contractorId && (user?.role === 'admin' || user?.role === 'director')),
  });

  if (!user) {
    return <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }} />;
  }

  if (user.role !== 'admin' && user.role !== 'director') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--corp-bg)' }}>
        <p style={{ color: 'var(--corp-ink-2)' }}>Доступ запрещен</p>
      </div>
    );
  }

  const goBack = () => setLocation('/contractors');

  if (contractorLoading || expensesLoading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
        <CorpHeader title="Подрядчик" onBack={goBack} />
      </div>
    );
  }

  if (!contractor) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
        <CorpHeader title="Подрядчик" onBack={goBack} />
        <div className="p-4">
          <CorpEmpty
            icon={<User size={28} />}
            title="Подрядчик не найден"
            description="Возможно, подрядчик был удален"
            actionLabel="Вернуться к списку"
            onAction={goBack}
          />
        </div>
      </div>
    );
  }

  function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
      <div>
        <p className="text-[10px] font-bold uppercase mb-1" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
          {label}
        </p>
        <div className="flex items-center gap-1.5 text-[13px]" style={{ color: 'var(--corp-ink)' }}>
          {icon && <span style={{ color: 'var(--corp-ink-3)' }}>{icon}</span>}
          {value}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--corp-bg)' }}>
      <CorpHeader
        title={`Подрядчик: ${contractor.company || contractor.name}`}
        onBack={goBack}
        action={<StatusPill active={contractor.isActive} labelOn="Активен" labelOff="Неактивен" />}
      />

      <div className="p-4 space-y-4">
        {/* Contractor Information */}
        <div className="p-4" style={SECTION_STYLE}>
          <h3 className="text-[10px] font-bold uppercase mb-3 flex items-center gap-1.5" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
            <User size={12} /> Информация о подрядчике
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contractor.company && (
              <InfoRow icon={<Building2 size={14} />} label="Компания" value={contractor.company} />
            )}
            <InfoRow label="Имя" value={contractor.name} />
            <InfoRow label="Специализация" value={contractor.specialization} />
            {contractor.phone && (
              <InfoRow
                icon={<Phone size={14} />}
                label="Телефон"
                value={
                  <a href={`tel:${contractor.phone}`} style={{ color: 'var(--corp-accent)' }}>
                    {contractor.phone}
                  </a>
                }
              />
            )}
            {contractor.email && (
              <InfoRow
                icon={<Mail size={14} />}
                label="Email"
                value={
                  <a href={`mailto:${contractor.email}`} style={{ color: 'var(--corp-accent)' }}>
                    {contractor.email}
                  </a>
                }
              />
            )}
            <InfoRow
              icon={<Calendar size={14} />}
              label="Дата регистрации"
              value={<span style={{ fontFamily: 'var(--corp-mono)' }}>{fmtDateRu(contractor.createdAt)}</span>}
            />
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              icon={<DollarSign size={18} />}
              label="Общая сумма выплат"
              value={<MoneyAED amount={stats.totalExpenses} size={16} weight={700} tone="pos" />}
              tone="pos"
              mono={false}
            />
            <StatCard
              icon={<FileText size={18} />}
              label="Количество проектов"
              value={stats.totalProjects}
              tone="accent"
            />
            <StatCard
              icon={<DollarSign size={18} />}
              label="Осталось выплатить"
              value={<MoneyAED amount={stats.remainingBudget || 0} size={16} weight={700} tone="ink" />}
              tone="ink"
              mono={false}
            />
          </div>
        )}

        {/* Assigned Projects */}
        <div className="p-4" style={SECTION_STYLE}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold uppercase flex items-center gap-1.5" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
              <Briefcase size={12} /> Привязанные проекты
            </h3>
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-1 h-8 px-3 text-[12px] font-semibold transition-colors"
              style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-assign-project"
            >
              <Plus size={14} /> Назначить
            </button>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-6 text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              Подрядчик пока не привязан к проектам
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const projectExpenses = expenses.filter(e => e.projectId === project.projectId);
                const totalPaid = projectExpenses.reduce((sum, e) => sum + e.amount, 0);
                const remaining = project.budgetAllocation - totalPaid;

                return (
                  <div
                    key={project.id}
                    className="p-3"
                    style={{
                      background: 'var(--corp-surface-2)',
                      border: '1px solid var(--corp-line)',
                      borderRadius: 'var(--corp-r)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <h4 className="text-[13px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>
                            {project.projectName}
                          </h4>
                          <button
                            type="button"
                            onClick={() => setLocation(`/contractor/${contractorId}/project/${project.id}`)}
                            className="w-6 h-6 flex items-center justify-center rounded transition-colors flex-shrink-0"
                            style={{ color: 'var(--corp-ink-3)' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            data-testid={`button-edit-${project.id}`}
                          >
                            <Edit size={12} />
                          </button>
                        </div>
                        {project.workDescription && (
                          <p className="text-[12px] mb-1" style={{ color: 'var(--corp-ink-2)' }}>
                            {project.workDescription}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                          <span>Начат: {fmtDateRu(project.startDate)}</span>
                          {project.endDate && <span>Завершен: {fmtDateRu(project.endDate)}</span>}
                        </div>
                      </div>
                      <StatusPill active={project.isActive} />
                    </div>

                    <div
                      className="grid grid-cols-3 gap-2 pt-3 mt-2"
                      style={{ borderTop: '1px solid var(--corp-line)' }}
                    >
                      <div className="text-center">
                        <p className="text-[10px]" style={{ color: 'var(--corp-muted)' }}>Бюджет</p>
                        <MoneyAED amount={project.budgetAllocation} size={12} weight={600} tone="ink" />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px]" style={{ color: 'var(--corp-muted)' }}>Выплачено</p>
                        <MoneyAED amount={totalPaid} size={12} weight={600} tone="pos" />
                      </div>
                      <div className="text-center">
                        <p className="text-[10px]" style={{ color: 'var(--corp-muted)' }}>Осталось</p>
                        <MoneyAED amount={remaining} size={12} weight={600} tone={remaining > 0 ? 'neg' : 'pos'} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expenses History */}
        <div className="p-4" style={SECTION_STYLE}>
          <h3 className="text-[10px] font-bold uppercase mb-3" style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}>
            История выплат
          </h3>
          {expenses.length === 0 ? (
            <div className="text-center py-6 text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              Выплат этому подрядчику еще не было
            </div>
          ) : (
            <div className="space-y-2">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-3 p-3"
                  style={{
                    background: 'var(--corp-surface-2)',
                    borderRadius: 'var(--corp-r)',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[12px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>
                        {expense.projectName}
                      </span>
                      <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}>
                        {fmtDateRu(expense.createdAt)}
                      </span>
                    </div>
                    {expense.description && (
                      <p className="text-[11px]" style={{ color: 'var(--corp-ink-3)' }}>{expense.description}</p>
                    )}
                  </div>
                  <MoneyAED amount={expense.amount} size={14} weight={700} tone="pos" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AssignContractorModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        contractorId={contractorId}
      />
    </div>
  );
}
