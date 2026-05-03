import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Search, User as UserIcon, Calendar, Briefcase,
  AlertTriangle, Users,
} from "lucide-react";
import { differenceInDays, differenceInYears, differenceInMonths } from "date-fns";
import { useLanguage } from "@/components/LanguageProvider";
import { fmtDate, fmtNumber } from "@/lib/locale";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { PersonnelForm } from "@/components/PersonnelForm";
import { CorpEmpty } from "@/components/corp-ui";

interface PersonnelDocument {
  id: string;
  documentType: string;
  expiryDate?: string;
}

interface Personnel {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  emiratesId?: string;
  emiratesIdIssueDate?: string;
  emiratesIdExpiryDate?: string;
  specialization: string;
  startDate: string;
  salary?: string;
  status?: string;
  photoUrl?: string;
  isDriver?: boolean;
  documents?: PersonnelDocument[];
}

function formatPhotoUrl(photoUrl: string) {
  return `/objects/${photoUrl.split('/').slice(-2).join('/')}`;
}

export function Personnel() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [specializationFilter, setSpecializationFilter] = useState<string>("all");
  const [driverFilter, setDriverFilter] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);

  const { has, hasAny } = usePermissions();
  // Источник правды — права. Любая роль с personnel.view/personnel.manage
  // (через персональный оверрайд) получает доступ к разделу.
  const canView = hasAny('personnel.view', 'personnel.manage');
  const canManage = has('personnel.manage');
  // Сохраняем для совместимости с местами, где раньше был isAdmin —
  // теперь это «может управлять персоналом».
  const isAdmin = canManage;

  const { data: personnel = [], isLoading } = useQuery<Personnel[]>({
    queryKey: ["/api/personnel"],
    enabled: canView,
  });

  const calculateExperience = (startDate: string) => {
    const start = new Date(startDate);
    const now = new Date();
    const years = differenceInYears(now, start);
    const months = differenceInMonths(now, start) % 12;
    if (years > 0) {
      const yearWord =
        language === 'ru'
          ? (years === 1 ? t('yearOne') : years < 5 ? t('yearFew') : t('yearMany'))
          : t('yearMany');
      return `${years} ${yearWord}${months > 0 ? ` ${months} ${t('monthShort')}` : ''}`;
    }
    return `${months} ${t('monthShort')}`;
  };

  const getDocumentStatus = (person: Personnel): 'normal' | 'warning' | 'critical' | 'expired' => {
    const criticalDocs = ['emirates_id', 'passport', 'visa', 'contract'];
    const now = new Date();
    let minDays = Infinity;

    if (person.emiratesIdExpiryDate) {
      const days = differenceInDays(new Date(person.emiratesIdExpiryDate), now);
      if (days < minDays) minDays = days;
    }

    person.documents?.forEach(doc => {
      if (criticalDocs.includes(doc.documentType) && doc.expiryDate) {
        const days = differenceInDays(new Date(doc.expiryDate), now);
        if (days < minDays) minDays = days;
      }
    });

    if (minDays === Infinity) return 'normal';
    if (minDays <= 0) return 'expired';
    if (minDays <= 14) return 'critical';
    if (minDays <= 30) return 'warning';
    return 'normal';
  };

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(person => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        person.firstName.toLowerCase().includes(searchLower) ||
        person.lastName.toLowerCase().includes(searchLower) ||
        (person.middleName && person.middleName.toLowerCase().includes(searchLower)) ||
        (person.emiratesId && person.emiratesId.toLowerCase().includes(searchLower));

      const matchesStatus = statusFilter === 'all' || person.status === statusFilter;
      const matchesSpecialization = specializationFilter === 'all' ||
        person.specialization === specializationFilter;
      const matchesDriver = driverFilter === 'all' || (driverFilter === 'drivers' ? !!person.isDriver : !person.isDriver);

      return matchesSearch && matchesStatus && matchesSpecialization && matchesDriver;
    });
  }, [personnel, searchQuery, statusFilter, specializationFilter, driverFilter]);

  const specializations = useMemo(() => {
    const specs = new Set(personnel.map(p => p.specialization));
    return Array.from(specs).sort();
  }, [personnel]);

  const handleCreate = () => {
    setSelectedPerson(null);
    setShowForm(true);
  };

  if (!canView) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)' }}
      >
        <div
          className="max-w-md w-full p-6 text-center"
          style={{
            background: 'var(--corp-surface)',
            border: '1px solid var(--corp-line)',
            borderRadius: 'var(--corp-r-lg)',
          }}
        >
          <p className="text-[14px]" style={{ color: 'var(--corp-muted)' }}>
            {t('noAccessSection')} «{t('sectionPersonnel')}»
          </p>
        </div>
      </div>
    );
  }

  const getDocBadge = (status: 'warning' | 'critical' | 'expired') => {
    if (status === 'expired') {
      return { label: t('expiredBadge'), bg: 'var(--corp-neg-soft)', fg: 'var(--corp-neg)' };
    }
    if (status === 'critical') {
      return { label: t('days14Badge'), bg: 'rgba(249, 115, 22, 0.12)', fg: '#c2410c' };
    }
    return { label: t('days30Badge'), bg: 'rgba(245, 158, 11, 0.12)', fg: '#b45309' };
  };

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)', color: 'var(--corp-ink)' }}
      data-page-header
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40"
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
                {t('personnelTitle')}
              </h1>
              <p
                className="text-[10px] uppercase font-bold leading-tight"
                style={{ color: 'var(--corp-muted)', fontFamily: 'var(--corp-mono)', letterSpacing: '0.06em' }}
              >
                {t('totalLabel')}: {filteredPersonnel.length}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold transition-colors"
              style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
              data-testid="button-add-personnel"
            >
              <Plus size={14} /> <span className="hidden sm:inline">{t('employeeShort')}</span>
            </button>
          )}
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Filters */}
        <div
          className="p-3 mb-4"
          style={{
            background: 'var(--corp-surface)',
            border: '1px solid var(--corp-line)',
            borderRadius: 'var(--corp-r-lg)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: 'var(--corp-muted)' }}
              />
              <Input
                placeholder={t('personnelSearchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-[13px]"
                data-testid="input-search-personnel"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-[13px]" data-testid="filter-status">
                <SelectValue placeholder={t('statusFilterLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatusesFilter')}</SelectItem>
                <SelectItem value="active">{t('statusActiveOption')}</SelectItem>
                <SelectItem value="dismissed">{t('statusDismissed')}</SelectItem>
                <SelectItem value="vacation">{t('statusVacation')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
              <SelectTrigger className="h-9 text-[13px]" data-testid="filter-specialization">
                <SelectValue placeholder={t('specializationFilterLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allSpecializationsFilter')}</SelectItem>
                {specializations.map(spec => (
                  <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="h-9 text-[13px]" data-testid="filter-driver">
                <SelectValue placeholder={t('roleFilterLabel')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allRolesFilter')}</SelectItem>
                <SelectItem value="drivers">{t('driversOnlyFilter')}</SelectItem>
                <SelectItem value="non-drivers">{t('nonDriversFilter')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? null : filteredPersonnel.length === 0 ? (
          <CorpEmpty
            icon={<Users size={28} />}
            title={searchQuery || statusFilter !== 'all' || specializationFilter !== 'all'
              ? t('personnelNotFound')
              : t('noPersonnelTitle')}
            description={searchQuery || statusFilter !== 'all' || specializationFilter !== 'all'
              ? t('tryDifferentFilters')
              : t('addFirstPersonnel')}
            actionLabel={isAdmin ? t('addPersonnelLabel') : undefined}
            onAction={isAdmin ? handleCreate : undefined}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredPersonnel.map(person => {
              const docStatus = getDocumentStatus(person);
              const experience = calculateExperience(person.startDate);
              const fullName = `${person.lastName} ${person.firstName}${person.middleName ? ' ' + person.middleName : ''}`;
              const isInactive = person.status && person.status !== 'active';

              return (
                <Link key={person.id} href={`/personnel/${person.id}`}>
                  <div
                    className="p-4 transition-all cursor-pointer"
                    style={{
                      background: 'var(--corp-surface)',
                      border: '1px solid var(--corp-line)',
                      borderRadius: 'var(--corp-r-lg)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--corp-surface)'; }}
                    data-testid={`personnel-card-${person.id}`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      {person.photoUrl ? (
                        <img
                          src={formatPhotoUrl(person.photoUrl)}
                          alt={fullName}
                          className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                          style={{ border: '1px solid var(--corp-line)' }}
                          onError={(e) => {
                            const target = e.currentTarget as HTMLImageElement;
                            target.style.display = 'none';
                            const next = target.nextElementSibling as HTMLElement | null;
                            if (next) next.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${person.photoUrl ? 'hidden' : ''}`}
                        style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-3)' }}
                      >
                        <UserIcon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3
                          className="text-[14px] font-semibold truncate"
                          style={{ color: 'var(--corp-ink)', letterSpacing: '-0.1px' }}
                        >
                          {fullName}
                        </h3>
                        <p
                          className="text-[11px] truncate"
                          style={{ color: 'var(--corp-muted)' }}
                        >
                          {person.specialization}
                        </p>
                      </div>
                      {person.isDriver && (
                        <span
                          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded flex-shrink-0"
                          style={{
                            background: 'var(--corp-accent-soft, rgba(59,130,246,0.12))',
                            color: 'var(--corp-accent, #3b82f6)',
                            letterSpacing: '0.04em',
                          }}
                          data-testid={`badge-driver-${person.id}`}
                        >
                          {t('driverRoleBadge')}
                        </span>
                      )}
                      {docStatus !== 'normal' && (() => {
                        const b = getDocBadge(docStatus);
                        return (
                          <span
                            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1 flex-shrink-0"
                            style={{
                              background: b.bg,
                              color: b.fg,
                              letterSpacing: '0.04em',
                            }}
                          >
                            {docStatus === 'expired' && <AlertTriangle size={10} />}
                            {b.label}
                          </span>
                        );
                      })()}
                    </div>

                    <div
                      className="grid grid-cols-2 gap-2 pt-3"
                      style={{ borderTop: '1px solid var(--corp-line)' }}
                    >
                      {person.emiratesId && (
                        <div>
                          <p
                            className="text-[9px] uppercase font-bold"
                            style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                          >
                            Emirates ID
                          </p>
                          <p
                            className="text-[12px] font-semibold truncate"
                            style={{ color: 'var(--corp-ink-2)', fontFamily: 'var(--corp-mono)' }}
                          >
                            {person.emiratesId}
                          </p>
                        </div>
                      )}
                      <div>
                        <p
                          className="text-[9px] uppercase font-bold flex items-center gap-1"
                          style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                        >
                          <Briefcase size={9} /> {t('experienceShortLabel')}
                        </p>
                        <p
                          className="text-[12px] font-semibold"
                          style={{ color: 'var(--corp-ink-2)' }}
                        >
                          {experience}
                        </p>
                      </div>
                      {person.emiratesIdExpiryDate && (
                        <div className="col-span-2">
                          <p
                            className="text-[9px] uppercase font-bold flex items-center gap-1"
                            style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                          >
                            <Calendar size={9} /> {t('idTermLabel')}
                          </p>
                          <p
                            className="text-[11px]"
                            style={{ color: 'var(--corp-ink-3)', fontFamily: 'var(--corp-mono)' }}
                          >
                            {person.emiratesIdIssueDate &&
                              `${fmtDate(person.emiratesIdIssueDate, language)} — `}
                            {fmtDate(person.emiratesIdExpiryDate, language)}
                          </p>
                        </div>
                      )}
                      {person.salary && (
                        <div>
                          <p
                            className="text-[9px] uppercase font-bold"
                            style={{ color: 'var(--corp-muted)', letterSpacing: '0.04em' }}
                          >
                            {t('salaryShortLabel')}
                          </p>
                          <p
                            className="text-[12px] font-bold"
                            style={{ color: 'var(--corp-ink)', fontFamily: 'var(--corp-mono)' }}
                          >
                            {fmtNumber(parseFloat(person.salary), language)}
                            <span style={{ fontSize: 9, marginLeft: 2, color: 'var(--corp-muted)' }}>{'\u00A0AED'}</span>
                          </p>
                        </div>
                      )}
                      {isInactive && (
                        <div>
                          <span
                            className="text-[10px] font-bold uppercase px-2 py-0.5 rounded inline-block"
                            style={{
                              background: person.status === 'dismissed' ? 'var(--corp-neg-soft)' : 'var(--corp-surface-2)',
                              color: person.status === 'dismissed' ? 'var(--corp-neg)' : 'var(--corp-ink-3)',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {person.status === 'dismissed' ? t('statusDismissed') :
                             person.status === 'vacation' ? t('statusVacation') : person.status}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {showForm && (
        <PersonnelForm
          person={selectedPerson}
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedPerson(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedPerson(null);
            queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
          }}
        />
      )}
    </div>
  );
}
