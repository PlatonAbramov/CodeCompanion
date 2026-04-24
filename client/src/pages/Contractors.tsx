import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Users, Plus, Edit2, Trash2, FileText, Phone, Mail, File, ChevronRight,
  Search, Bell, SlidersHorizontal, MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CorpEmpty, fmtDateRu, fmtNum } from "@/components/corp-ui";

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

interface ContractorStats {
  totalExpenses: number;
  totalProjects: number;
  remainingBudget: number;
}

interface ContractorForm {
  name: string;
  company: string;
  phone: string;
  email: string;
  specialization: string;
}

function getContractorInitial(name?: string): string {
  if (!name) return '?';
  return name.trim().charAt(0).toUpperCase();
}

function ContractorTableRow({
  contractor,
  onOpen,
  onEdit,
  onDelete,
}: {
  contractor: Contractor;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: stats } = useQuery<ContractorStats>({
    queryKey: ['/api/contractors', contractor.id, 'stats'],
  });
  const initial = getContractorInitial(contractor.company || contractor.name);

  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-[var(--corp-surface-2)]"
      style={{ borderTop: '1px solid var(--corp-line)' }}
      onClick={onOpen}
      data-testid={`contractor-row-${contractor.id}`}
    >
      {/* Компания */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              background: 'rgba(91,88,235,0.10)',
              color: 'var(--corp-accent)',
              borderRadius: 'var(--corp-r)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {initial}
          </div>
          <span
            className="text-[13px] font-bold"
            style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}
          >
            {contractor.company || contractor.name}
          </span>
        </div>
      </td>

      {/* Контакт */}
      <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--corp-ink-2)' }}>
        {contractor.company ? contractor.name : '—'}
      </td>

      {/* Специализация */}
      <td className="px-5 py-3.5 text-[13px]" style={{ color: 'var(--corp-ink-2)' }}>
        {contractor.specialization || '—'}
      </td>

      {/* Телефон */}
      <td
        className="px-5 py-3.5 text-[13px]"
        style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}
      >
        {contractor.phone || '—'}
      </td>

      {/* Проектов */}
      <td
        className="px-5 py-3.5 text-[13px] text-right"
        style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)', fontWeight: 600 }}
      >
        {stats ? stats.totalProjects : '—'}
      </td>

      {/* Выплачено */}
      <td
        className="px-5 py-3.5 text-[13px] text-right"
        style={{ color: 'var(--corp-pos)', fontFamily: 'var(--corp-mono)', fontWeight: 700 }}
      >
        {stats ? fmtNum(stats.totalExpenses) : '—'}
      </td>

      {/* Осталось */}
      <td
        className="px-5 py-3.5 text-[13px] text-right"
        style={{
          color: stats && stats.remainingBudget < 0 ? 'var(--corp-neg)' : 'var(--corp-ink-2)',
          fontFamily: 'var(--corp-mono)',
          fontWeight: 700,
        }}
      >
        {stats ? fmtNum(Math.abs(stats.remainingBudget)) : '—'}
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5 w-12" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:bg-[var(--corp-surface)]"
              style={{ color: 'var(--corp-muted)' }}
              data-testid={`button-row-menu-${contractor.id}`}
            >
              <MoreHorizontal size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>
              <ChevronRight className="h-4 w-4 mr-2" />
              Открыть
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit}>
              <Edit2 className="h-4 w-4 mr-2" />
              Редактировать
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              style={{ color: 'var(--corp-neg)' }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}

function ContractorStatsRow({ contractorId }: { contractorId: string }) {
  const { data: stats } = useQuery<ContractorStats>({
    queryKey: ['/api/contractors', contractorId, 'stats'],
  });
  if (!stats) return null;

  const tile = (label: string, value: string, color: string) => (
    <div>
      <p
        className="text-[9px] uppercase font-bold"
        style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
      >
        {label}
      </p>
      <p
        className="text-[13px] font-bold"
        style={{ color, fontFamily: 'var(--corp-mono)' }}
      >
        {value}
      </p>
    </div>
  );

  return (
    <div
      className="grid grid-cols-3 gap-2 mt-3 pt-3"
      style={{ borderTop: '1px solid var(--corp-line)' }}
    >
      {tile('Выплачено', `${fmtNum(stats.totalExpenses)}`, 'var(--corp-pos)')}
      {tile('Проектов', String(stats.totalProjects), 'var(--corp-ink)')}
      {tile('Осталось', `${fmtNum(stats.remainingBudget)}`, 'var(--corp-accent)')}
    </div>
  );
}

export default function Contractors() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [contractorForm, setContractorForm] = useState<ContractorForm>({
    name: '', company: '', phone: '', email: '', specialization: '',
  });

  const isAdminOrDirector = user?.role === 'admin' || user?.role === 'director';

  const { data: contractors, isLoading } = useQuery<Contractor[]>({
    queryKey: ['/api/contractors'],
    enabled: isAdminOrDirector,
  });

  const createContractorMutation = useMutation({
    mutationFn: async (data: ContractorForm) => {
      const res = await apiRequest('/api/contractors', { method: 'POST', body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors'] });
      setIsCreateModalOpen(false);
      setContractorForm({ name: '', company: '', phone: '', email: '', specialization: '' });
      toast({ title: "Подрядчик добавлен", description: "Новый подрядчик успешно добавлен" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось добавить подрядчика", variant: "destructive" });
    },
  });

  const updateContractorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ContractorForm> }) => {
      const res = await apiRequest(`/api/contractors/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors'] });
      setIsEditModalOpen(false);
      setSelectedContractor(null);
      toast({ title: "Подрядчик обновлён", description: "Данные подрядчика успешно обновлены" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось обновить данные", variant: "destructive" });
    },
  });

  const deleteContractorMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/contractors/${id}`, { method: 'DELETE' });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors'] });
      toast({ title: "Подрядчик удалён", description: "Подрядчик успешно удалён" });
    },
    onError: () => {
      toast({ title: "Ошибка", description: "Не удалось удалить подрядчика", variant: "destructive" });
    },
  });

  if (!user) return <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }} />;

  if (!isAdminOrDirector) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)' }}
      >
        <p className="text-[14px]" style={{ color: 'var(--corp-muted)' }}>Доступ запрещён</p>
      </div>
    );
  }

  const handleCreateContractor = (e: React.FormEvent) => {
    e.preventDefault();
    createContractorMutation.mutate(contractorForm);
  };

  const handleEditContractor = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedContractor) {
      updateContractorMutation.mutate({ id: selectedContractor.id, data: contractorForm });
    }
  };

  const openEditModal = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setContractorForm({
      name: contractor.name,
      company: contractor.company || '',
      phone: contractor.phone || '',
      email: contractor.email || '',
      specialization: contractor.specialization,
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteContractor = (id: string) => {
    if (confirm("Вы уверены, что хотите удалить этого подрядчика?")) {
      deleteContractorMutation.mutate(id);
    }
  };

  const renderForm = (mode: 'create' | 'edit') => (
    <form onSubmit={mode === 'create' ? handleCreateContractor : handleEditContractor} className="space-y-4">
      <div>
        <Label htmlFor={`${mode}-name`}>Имя *</Label>
        <Input
          id={`${mode}-name`}
          value={contractorForm.name}
          onChange={(e) => setContractorForm({ ...contractorForm, name: e.target.value })}
          required
          data-testid={`input-${mode}-contractor-name`}
        />
      </div>
      <div>
        <Label htmlFor={`${mode}-company`}>Компания</Label>
        <Input
          id={`${mode}-company`}
          value={contractorForm.company}
          onChange={(e) => setContractorForm({ ...contractorForm, company: e.target.value })}
          data-testid={`input-${mode}-contractor-company`}
        />
      </div>
      <div>
        <Label htmlFor={`${mode}-spec`}>Специализация *</Label>
        <Input
          id={`${mode}-spec`}
          value={contractorForm.specialization}
          onChange={(e) => setContractorForm({ ...contractorForm, specialization: e.target.value })}
          required
          data-testid={`input-${mode}-contractor-spec`}
        />
      </div>
      <div>
        <Label htmlFor={`${mode}-phone`}>Телефон</Label>
        <Input
          id={`${mode}-phone`}
          value={contractorForm.phone}
          onChange={(e) => setContractorForm({ ...contractorForm, phone: e.target.value })}
          data-testid={`input-${mode}-contractor-phone`}
        />
      </div>
      <div>
        <Label htmlFor={`${mode}-email`}>Email</Label>
        <Input
          id={`${mode}-email`}
          type="email"
          value={contractorForm.email}
          onChange={(e) => setContractorForm({ ...contractorForm, email: e.target.value })}
          data-testid={`input-${mode}-contractor-email`}
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={mode === 'create' ? createContractorMutation.isPending : updateContractorMutation.isPending}
        data-testid={`button-submit-${mode}-contractor`}
      >
        {mode === 'create'
          ? (createContractorMutation.isPending ? "Добавление…" : "Добавить подрядчика")
          : (updateContractorMutation.isPending ? "Сохранение…" : "Сохранить изменения")}
      </Button>
    </form>
  );

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      {/* === MOBILE HEADER (lg:hidden) ============================ */}
      <header
        className="lg:hidden sticky top-0 z-40"
        style={{ background: 'var(--corp-surface)', borderBottom: '1px solid var(--corp-line)' }}
      >
        <div className="px-4 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)' }}
            >
              <Users size={15} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-[16px] font-bold leading-tight truncate"
                style={{ color: 'var(--corp-ink)', letterSpacing: '-0.3px' }}
              >
                Подрядчики
              </h1>
              <p
                className="text-[10px] uppercase font-bold leading-tight"
                style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)', letterSpacing: '0.06em' }}
              >
                Всего: {contractors?.length || 0}
              </p>
            </div>
          </div>
          {isAdminOrDirector && (
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
                  style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
                  data-testid="button-add-contractor"
                >
                  <Plus size={14} /> <span className="hidden sm:inline">Подрядчик</span>
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Добавить нового подрядчика</DialogTitle>
                </DialogHeader>
                {renderForm('create')}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      {/* === DESKTOP HEADER (hidden lg:block) ====================== */}
      <div className="hidden lg:block" style={{ background: 'var(--corp-surface)' }}>
        {/* Top utility bar */}
        <div
          className="px-8 h-14 flex items-center gap-4"
          style={{ borderBottom: '1px solid var(--corp-line)' }}
        >
          <h2
            className="text-[15px] font-semibold"
            style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
          >
            Подрядчики
          </h2>

          <div className="flex-1" />

          <div className="relative max-w-md flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--corp-muted)' }}
            />
            <input
              type="text"
              placeholder="Поиск по проектам, расходам..."
              className="w-full h-9 pl-9 pr-12 text-[13px] outline-none"
              style={{
                background: 'var(--corp-surface-2)',
                color: 'var(--corp-ink)',
                border: '1px solid transparent',
                borderRadius: 'var(--corp-r)',
              }}
              data-testid="input-search-contractors-desktop"
            />
            <kbd
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-semibold"
              style={{
                background: 'var(--corp-surface)',
                color: 'var(--corp-muted)',
                border: '1px solid var(--corp-line)',
                borderRadius: 4,
                fontFamily: 'var(--corp-mono)',
              }}
            >
              ⌘K
            </kbd>
          </div>

          <button
            type="button"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[var(--corp-surface-2)]"
            style={{ color: 'var(--corp-ink-2)' }}
            data-testid="button-bell-contractors-desktop"
          >
            <Bell size={16} />
          </button>

          <button
            type="button"
            onClick={() => setLocation('/add-expense')}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-[13px] font-semibold transition-colors"
            style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
            data-testid="button-topbar-add-expense-contractors"
          >
            <Plus size={14} />
            Расход
          </button>
        </div>

        {/* Page header */}
        <div className="px-8 pt-6 pb-5 flex items-end justify-between gap-4">
          <h1
            className="text-[28px] font-bold leading-tight"
            style={{ color: 'var(--corp-ink)', letterSpacing: '-0.6px' }}
          >
            Подрядчики
            <span
              className="ml-2 text-[20px] font-semibold"
              style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)' }}
            >
              {contractors?.length || 0}
            </span>
          </h1>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 h-10 px-3.5 text-[13px] font-semibold transition-colors"
              style={{
                background: 'var(--corp-surface)',
                color: 'var(--corp-ink)',
                border: '1px solid var(--corp-line)',
                borderRadius: 'var(--corp-r)',
              }}
              data-testid="button-filters-contractors"
            >
              <SlidersHorizontal size={14} />
              Фильтры
            </button>

            {isAdminOrDirector && (
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 text-[13px] font-semibold transition-colors"
                style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-accent-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-accent)'; }}
                data-testid="button-add-contractor-desktop"
              >
                <Plus size={14} />
                Добавить
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Редактировать подрядчика</DialogTitle>
          </DialogHeader>
          {renderForm('edit')}
        </DialogContent>
      </Dialog>

      {/* === DESKTOP TABLE (hidden lg:block) ====================== */}
      <main className="hidden lg:block px-8">
        {isLoading ? null : !contractors || contractors.length === 0 ? (
          <CorpEmpty
            icon={<Users size={28} />}
            title="Подрядчики не найдены"
            description="Добавьте первого подрядчика, чтобы начать работу"
            actionLabel={isAdminOrDirector ? "Добавить подрядчика" : undefined}
            onAction={isAdminOrDirector ? () => setIsCreateModalOpen(true) : undefined}
          />
        ) : (
          <div
            style={{
              background: 'var(--corp-surface)',
              border: '1px solid var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
              overflow: 'hidden',
            }}
          >
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--corp-surface)' }}>
                  {[
                    { label: 'Компания', align: 'left' },
                    { label: 'Контакт', align: 'left' },
                    { label: 'Специализация', align: 'left' },
                    { label: 'Телефон', align: 'left' },
                    { label: 'Проектов', align: 'right' },
                    { label: 'Выплачено', align: 'right' },
                    { label: 'Осталось', align: 'right' },
                    { label: '', align: 'right' },
                  ].map((h, i) => (
                    <th
                      key={i}
                      className="px-5 py-3 text-[10px] font-bold uppercase"
                      style={{
                        textAlign: h.align as any,
                        color: 'var(--corp-muted)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contractors.map((contractor) => (
                  <ContractorTableRow
                    key={contractor.id}
                    contractor={contractor}
                    onOpen={() => setLocation(`/contractor/${contractor.id}`)}
                    onEdit={() => openEditModal(contractor)}
                    onDelete={() => handleDeleteContractor(contractor.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* === MOBILE LIST (lg:hidden) ============================== */}
      <main className="lg:hidden px-4 pt-4">
        {isLoading ? null : !contractors || contractors.length === 0 ? (
          <CorpEmpty
            icon={<Users size={28} />}
            title="Подрядчики не найдены"
            description="Добавьте первого подрядчика, чтобы начать работу"
            actionLabel={isAdminOrDirector ? "Добавить подрядчика" : undefined}
            onAction={isAdminOrDirector ? () => setIsCreateModalOpen(true) : undefined}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {contractors.map((contractor) => (
              <div
                key={contractor.id}
                className="p-4 transition-all cursor-pointer"
                style={{
                  background: 'var(--corp-surface)',
                  border: '1px solid var(--corp-line)',
                  borderRadius: 'var(--corp-r-lg)',
                }}
                onClick={() => setLocation(`/contractor/${contractor.id}`)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-surface)'; }}
                data-testid={`contractor-card-${contractor.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3
                      className="text-[14px] font-semibold truncate"
                      style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}
                    >
                      {contractor.company || contractor.name}
                    </h3>
                    {contractor.company && (
                      <p
                        className="text-[11px] truncate"
                        style={{ color: 'var(--corp-muted)' }}
                      >
                        {contractor.name}
                      </p>
                    )}
                  </div>
                  {isAdminOrDirector ? (
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => openEditModal(contractor)}
                        className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                        style={{ color: 'var(--corp-ink-3)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        data-testid={`button-edit-${contractor.id}`}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteContractor(contractor.id)}
                        className="w-7 h-7 rounded flex items-center justify-center transition-colors"
                        style={{ color: 'var(--corp-neg)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-neg-soft)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                        data-testid={`button-delete-${contractor.id}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <ChevronRight size={16} style={{ color: 'var(--corp-muted)' }} className="flex-shrink-0" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--corp-ink-3)' }}>
                    <FileText size={11} style={{ color: 'var(--corp-muted)' }} />
                    <span>{contractor.specialization}</span>
                  </div>
                  {contractor.phone && (
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--corp-ink-3)' }}>
                      <Phone size={11} style={{ color: 'var(--corp-muted)' }} />
                      <span style={{ fontFamily: 'var(--corp-mono)' }}>{contractor.phone}</span>
                    </div>
                  )}
                  {contractor.email && (
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--corp-ink-3)' }}>
                      <Mail size={11} style={{ color: 'var(--corp-muted)' }} />
                      <span style={{ fontFamily: 'var(--corp-mono)' }}>{contractor.email}</span>
                    </div>
                  )}
                  {contractor.licenseUrl && (
                    <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--corp-pos)' }}>
                      <File size={11} />
                      <span>Лицензия загружена</span>
                    </div>
                  )}
                </div>

                <ContractorStatsRow contractorId={contractor.id} />

                <div
                  className="mt-3 pt-2 text-[10px] uppercase font-bold"
                  style={{
                    borderTop: '1px solid var(--corp-line)',
                    color: 'var(--corp-muted)',
                    fontFamily: 'var(--corp-mono)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Добавлен: {fmtDateRu(contractor.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
