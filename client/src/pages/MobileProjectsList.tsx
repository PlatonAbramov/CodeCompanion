import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ChevronLeft, MoreHorizontal, Search, SlidersHorizontal, Plus,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/components/LanguageProvider";
import { fmtDate } from "@/lib/locale";

interface Project {
  id: string;
  name: string;
  location?: string;
  totalCost: string;
  status: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  clientId?: string;
}

interface FinancialSummary {
  totalCost: string;
  totalExpenses: string;
  totalAdvances: string;
  currentProfit: string;
}

interface Client {
  id: string;
  name: string;
  company?: string;
}

type TabKey = 'all' | 'active' | 'archive';

function shortId(id: string): string {
  const m = id.replace(/[^0-9]/g, '');
  if (m.length >= 4) return m.slice(0, 4);
  const hex = id.replace(/[^0-9a-fA-F]/g, '');
  let n = 0;
  for (let i = 0; i < Math.min(8, hex.length); i++) {
    n = (n * 16 + parseInt(hex[i], 16) || 0) >>> 0;
  }
  return String((n % 9000) + 1000);
}

function fmtProfitShort(v: number): string {
  const sign = v >= 0 ? '+' : '−';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1).replace('.0', '')}m`;
  if (abs >= 1000) return `${sign}${Math.round(abs / 1000)}k`;
  return `${sign}${Math.round(abs)}`;
}

function ProjectInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length >= 2
    ? (parts[0][0] || '') + (parts[1][0] || '')
    : name.replace(/\s/g, '').slice(0, 2);
  return letters.toUpperCase();
}

function ProjectListItem({
  project, clientsById, onClick,
}: {
  project: Project;
  clientsById: Map<string, Client>;
  onClick: () => void;
}) {
  const { t, language } = useLanguage();
  const { data: fin } = useQuery<FinancialSummary>({
    queryKey: ['/api/projects', project.id, 'financial-summary'],
  });
  const totalCost = parseFloat(project.totalCost || '0');
  const expenses = parseFloat(fin?.totalExpenses || '0');
  const advances = parseFloat(fin?.totalAdvances || '0');
  const usedRatio = totalCost > 0 ? Math.min(100, ((expenses + advances) / totalCost) * 100) : 0;
  const currentProfit = parseFloat(fin?.currentProfit || '0');
  const profitable = currentProfit >= 0;

  const clientName = project.clientId ? (clientsById.get(project.clientId)?.name || '') : '';
  const initials = ProjectInitials(project.name);
  const endDate = project.endDate ? fmtDate(project.endDate, language) : '';
  const sid = shortId(project.id);

  return (
    <div
      onClick={onClick}
      className="cursor-pointer p-3.5"
      style={{
        background: 'var(--corp-surface)',
        border: '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
      }}
      data-testid={`projects-list-card-${project.id}`}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--corp-accent)', color: '#ffffff' }}
        >
          <span className="text-[13px] font-bold" style={{ fontFamily: 'var(--corp-mono)' }}>
            {initials}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div
              className="text-[15px] font-bold leading-tight truncate"
              style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
            >
              {project.name}
            </div>
            <span
              className="text-[12px] flex-shrink-0"
              style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-muted)' }}
            >
              {sid}
            </span>
          </div>
          <div className="text-[12px] mt-1 truncate" style={{ color: 'var(--corp-muted)' }}>
            {clientName && <>{clientName}</>}
            {clientName && endDate && <> · </>}
            {endDate && (
              <>{t('untilLabel')} <span style={{ fontFamily: 'var(--corp-mono)' }}>{endDate}</span></>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--corp-surface-3)' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.max(usedRatio, totalCost > 0 ? 4 : 0)}%`,
              background: profitable ? 'var(--corp-pos)' : 'var(--corp-neg)',
            }}
          />
        </div>
        <span
          className="text-[12px] font-bold flex-shrink-0"
          style={{
            fontFamily: 'var(--corp-mono)',
            color: profitable ? 'var(--corp-pos)' : 'var(--corp-neg)',
            minWidth: 52,
            textAlign: 'right',
          }}
        >
          {fmtProfitShort(currentProfit)}
        </span>
      </div>
    </div>
  );
}

export default function MobileProjectsList() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canEdit = user?.role === 'admin' || user?.role === 'director';

  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', clientId: '', totalCost: '', startDate: '', endDate: '',
  });

  const { data: activeProjects = [], isLoading: loadingActive } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  const { data: archivedProjects = [], isLoading: loadingArchived } = useQuery<Project[]>({
    queryKey: ['/api/projects/archived'],
    enabled: canEdit,
  });
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients'],
    enabled: canEdit,
  });
  const clientsById = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

  const inProgress = activeProjects.filter(p => (p.status || '').toLowerCase() !== 'completed');

  const baseList: Project[] =
    tab === 'all' ? activeProjects :
    tab === 'active' ? inProgress :
    archivedProjects;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.location || '').toLowerCase().includes(q) ||
      (p.clientId && (clientsById.get(p.clientId)?.name || '').toLowerCase().includes(q))
    );
  }, [baseList, search, clientsById]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateOpen(false);
      setForm({ name: '', clientId: '', totalCost: '', startDate: '', endDate: '' });
      toast({ title: t('success'), description: t('projectCreated') });
    },
    onError: () => {
      toast({ title: t('error'), description: t('projectCreateFailed'), variant: 'destructive' });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId) {
      toast({ title: t('error'), description: t('selectClientRequired'), variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      name: form.name,
      totalCost: form.totalCost,
      startDate: form.startDate,
      endDate: form.endDate || null,
      clientId: form.clientId,
    });
  };

  const isLoading = loadingActive || (canEdit && tab === 'archive' && loadingArchived);

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
    >
      {/* === Top utility row ================================================ */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <button
          type="button"
          onClick={() => window.history.length > 1 ? window.history.back() : setLocation(canEdit ? '/director' : '/master')}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--corp-surface)', border: '1px solid var(--corp-line)', color: 'var(--corp-ink)' }}
          aria-label={t('backLabel')}
          data-testid="button-back"
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'var(--corp-surface)', border: '1px solid var(--corp-line)', color: 'var(--corp-ink)' }}
          aria-label={t('menuLabel')}
          data-testid="button-more"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* === Title + Create =============================================== */}
      <div className="px-4 pt-1 pb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="font-bold leading-tight"
            style={{ fontSize: 28, color: 'var(--corp-ink)', letterSpacing: '-0.6px' }}
          >
            {t('projectsTitle')}
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--corp-muted)' }}>
            {t('activeColon')}: <span style={{ fontFamily: 'var(--corp-mono)', color: 'var(--corp-ink-2)', fontWeight: 600 }}>
              {inProgress.length}
            </span>
          </p>
        </div>
        {canEdit && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-semibold flex-shrink-0"
                style={{
                  background: 'var(--corp-accent)',
                  color: '#ffffff',
                  borderRadius: 'var(--corp-r)',
                }}
                data-testid="button-create-project-mobile"
              >
                <Plus size={14} />
                {t('createLabel')}
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('newProjectTitle')}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label htmlFor="np-name">{t('nameLabel')}</Label>
                  <Input
                    id="np-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    data-testid="input-name"
                  />
                </div>
                <div>
                  <Label htmlFor="np-client">{t('clientLabel')}</Label>
                  <Select
                    value={form.clientId}
                    onValueChange={(v) => setForm({ ...form, clientId: v })}
                  >
                    <SelectTrigger id="np-client" data-testid="select-client">
                      <SelectValue placeholder={t('selectClient')} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.company ? ` · ${c.company}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="np-cost">{t('costAedLabel')}</Label>
                  <Input
                    id="np-cost"
                    type="number"
                    step="0.01"
                    value={form.totalCost}
                    onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
                    required
                    data-testid="input-cost"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="np-start">{t('startLabel')}</Label>
                    <Input
                      id="np-start"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      required
                      data-testid="input-start"
                    />
                  </div>
                  <div>
                    <Label htmlFor="np-end">{t('endLabel')}</Label>
                    <Input
                      id="np-end"
                      type="date"
                      value={form.endDate}
                      onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                      data-testid="input-end"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full"
                  data-testid="button-submit"
                >
                  {createMutation.isPending ? t('creatingDots') : t('createProjectButton')}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* === Search + filter ============================================= */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <div
          className="flex-1 flex items-center gap-2 px-3 h-10"
          style={{
            background: 'var(--corp-surface)',
            border: '1px solid var(--corp-line)',
            borderRadius: 'var(--corp-r)',
          }}
        >
          <Search size={16} style={{ color: 'var(--corp-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchProjectPlaceholder')}
            className="flex-1 bg-transparent outline-none text-[14px] placeholder:opacity-60"
            style={{ color: 'var(--corp-ink)' }}
            data-testid="input-search"
          />
        </div>
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center"
          style={{
            background: 'var(--corp-surface)',
            border: '1px solid var(--corp-line)',
            borderRadius: 'var(--corp-r)',
            color: 'var(--corp-ink)',
          }}
          aria-label={t('filtersLabel')}
          data-testid="button-filter"
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {/* === Tabs ======================================================== */}
      <div className="px-4 pb-3">
        <div
          className="inline-flex p-1 gap-1"
          style={{
            background: 'var(--corp-surface-2)',
            borderRadius: 'var(--corp-r)',
            border: '1px solid var(--corp-line)',
          }}
        >
          {([
            { k: 'all', label: t('allFilter') },
            { k: 'active', label: t('inWorkFilter') },
            { k: 'archive', label: t('archiveFilter') },
          ] as { k: TabKey; label: string }[]).map(({ k, label }) => {
            const active = tab === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className="px-3.5 py-1.5 text-[13px] font-semibold transition-colors"
                style={{
                  background: active ? 'var(--corp-ink)' : 'transparent',
                  color: active ? '#ffffff' : 'var(--corp-ink-2)',
                  borderRadius: 'calc(var(--corp-r) - 2px)',
                }}
                data-testid={`tab-${k}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* === List ======================================================== */}
      <main className="px-4">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-[110px] animate-pulse"
                style={{
                  background: 'var(--corp-surface-2)',
                  borderRadius: 'var(--corp-r-lg)',
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="p-8 text-center"
            style={{
              background: 'var(--corp-surface)',
              border: '1px dashed var(--corp-line)',
              borderRadius: 'var(--corp-r-lg)',
            }}
          >
            <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--corp-ink-2)' }}>
              {search ? t('nothingFoundTitle') : t('noProjectsTitle')}
            </p>
            <p className="text-[12px]" style={{ color: 'var(--corp-muted)' }}>
              {search ? t('tryDifferentQuery') : t('createNewProjectStart')}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(p => (
              <ProjectListItem
                key={p.id}
                project={p}
                clientsById={clientsById}
                onClick={() => setLocation(`/projects/${p.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
