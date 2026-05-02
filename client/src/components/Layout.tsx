import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Home, Users, Building2, Wrench, UserCheck, Shield, ShieldCheck,
  TrendingUp, MoreHorizontal, LogOut, ChevronRight, Receipt, Car
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

type TabKey = 'overview' | 'projects' | 'finance' | 'more';

interface NavItem {
  key: string;
  label: string;
  icon: any;
  path: string;
  matches: (loc: string) => boolean;
  testId: string;
}

interface BottomTab extends NavItem {
  key: TabKey;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const { has, hasAny } = usePermissions();
  const [location, setLocation] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Свайп-жесты
  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;
    let startScrollTop = 0;
    let tracking = false;

    const isInteractive = (target: EventTarget | null): boolean => {
      let el = target as HTMLElement | null;
      while (el) {
        const tag = el.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || el.isContentEditable) {
          return true;
        }
        if (el.scrollWidth > el.clientWidth) {
          const style = window.getComputedStyle(el);
          if (style.overflowX === 'auto' || style.overflowX === 'scroll') {
            return true;
          }
        }
        el = el.parentElement;
      }
      return false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) { tracking = false; return; }
      if (isInteractive(e.target)) { tracking = false; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startTime = Date.now();
      startScrollTop = window.scrollY || document.documentElement.scrollTop;
      tracking = true;
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dt = Date.now() - startTime;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const maxDuration = 800;
      if (dt > maxDuration) return;
      const pullThreshold = 80;
      if (startScrollTop <= 0 && dy >= pullThreshold && absDy > absDx * 1.5) {
        window.location.reload();
        return;
      }
      const minDistance = 40;
      if (absDx < minDistance || absDy > absDx * 0.6) return;
      if (dx > 0) window.history.back();
      else window.history.forward();
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // === Прокрутка наверх при смене страницы =================================
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
      }
    } catch {
      window.scrollTo(0, 0);
    }
  }, [location]);

  const showNav = user && location !== '/login';

  const go = (path: string) => {
    setMoreOpen(false);
    setLocation(path);
  };

  const homePath =
    user?.role === 'client' ? '/client-projects' :
    user?.role === 'master' ? '/master' :
    user?.role === 'worker' ? '/worker' :
    '/director';

  // === Сборка пунктов навигации ===

  const overviewItem: NavItem = {
    key: 'overview',
    label: 'Обзор',
    icon: Home,
    path: homePath,
    matches: (l) => l === '/' || l === '/director' || l === '/master' || l === '/worker' || l === '/admin' || l === '/client-projects',
    testId: 'tab-overview',
  };

  const projectsItem: NavItem = {
    key: 'projects',
    label: 'Проекты',
    icon: Building2,
    path: homePath,
    matches: (l) =>
      l.startsWith('/projects/') ||
      l.startsWith('/projects-list') ||
      l.startsWith('/expenses/') ||
      l.startsWith('/implementation-sheets/') ||
      l.startsWith('/archived-projects'),
    testId: 'tab-projects',
  };

  // «Финансы» / «Расходы» в нижней навигации:
  // — admin / director видят полный раздел «Финансы» (/analytics);
  // — master или ЛЮБОЙ пользователь с правом expenses.create (включая
  //   персональный оверрайд для рабочего/клиента) видит кнопку «Расходы»,
  //   ведущую на форму создания расхода.
  const canCreateExpense = has('expenses.create');
  const canViewExpenses = hasAny('expenses.view_all', 'expenses.view_own');
  const canSeeFinancesTab = canCreateExpense || canViewExpenses || user?.role === 'master';
  const financeItem: NavItem | null =
    user && (user.role === 'admin' || user.role === 'director') ? {
      key: 'finance',
      label: 'Финансы',
      icon: TrendingUp,
      path: '/analytics',
      matches: (l) =>
        l.startsWith('/analytics') ||
        l.startsWith('/expenses') ||
        l.startsWith('/add-expense') ||
        l.startsWith('/add-revenue') ||
        l.startsWith('/add-advance') ||
        l.startsWith('/add-customer-advance') ||
        l.startsWith('/add-owner-investment') ||
        l.startsWith('/edit-expense') ||
        l.startsWith('/edit-revenue') ||
        l.startsWith('/edit-advance') ||
        l.startsWith('/edit-customer-advance') ||
        l.startsWith('/edit-owner-investment') ||
        l.startsWith('/revenues/') ||
        l.startsWith('/advances/') ||
        l.startsWith('/customer-advances/') ||
        l.startsWith('/owner-investments/'),
      testId: 'tab-finance',
    } :
    user && canSeeFinancesTab ? {
      key: 'finance',
      label: 'Расходы',
      icon: Receipt,
      path: '/expenses',
      matches: (l) => l === '/expenses' || l.startsWith('/add-expense') || l.startsWith('/edit-expense'),
      testId: 'tab-finance',
    } :
    null;

  // Дополнительные пункты для «Ещё» / боковой панели.
  // Каждый пункт гейтится по правам (источник истины — role_permissions
  // + user_permission_overrides), а не по роли. Это позволяет, например,
  // дать «бизнес-ассистенту» (роль master) пункт «Персонал» через
  // персональный оверрайд personnel.view, не повышая роль.
  // Большинство пунктов навигации (clients/contractors/tools/admin/permissions)
  // ведут на маршруты, которые в App.tsx до сих пор гейтятся по роли (admin/director/master).
  // Чтобы пункт меню не оказался «битой ссылкой» (NotFound), для них сохраняем
  // ролевой фильтр. Пункт «Персонал» — исключение: маршрут в App.tsx уже открыт
  // по `personnel.view`, поэтому показываем его всем ролям при наличии права.
  const extraItems: NavItem[] = [];
  if (user) {
    const isStaff = user.role !== 'client' && user.role !== 'worker';

    if (isStaff && has('clients.view')) {
      extraItems.push({
        key: 'clients',
        label: 'Заказчики',
        icon: Users,
        path: '/clients',
        matches: (l) => l.startsWith('/clients'),
        testId: 'menu-customers',
      });
    }
    if (isStaff && has('contractors.view')) {
      extraItems.push({
        key: 'contractors',
        label: 'Подрядчики',
        icon: Users,
        path: '/contractors',
        matches: (l) => l.startsWith('/contractors') || l.startsWith('/contractor/'),
        testId: 'menu-contractors',
      });
    }
    if (isStaff && has('tools.view')) {
      extraItems.push({
        key: 'tools',
        label: 'Инструменты',
        icon: Wrench,
        path: '/tools',
        matches: (l) => l.startsWith('/tools'),
        testId: 'menu-tools',
      });
    }
    // Персонал — единственный пункт, гейтящийся ТОЛЬКО по праву.
    // Маршрут /personnel в App.tsx синхронно открыт по personnel.view.
    if (has('personnel.view')) {
      extraItems.push({
        key: 'personnel',
        label: 'Персонал',
        icon: UserCheck,
        path: '/personnel',
        matches: (l) => l.startsWith('/personnel'),
        testId: 'menu-personnel',
      });
    }
    if (isStaff && has('users.view')) {
      extraItems.push({
        key: 'admin',
        label: 'Сотрудники',
        icon: Shield,
        path: '/admin',
        matches: (l) => l.startsWith('/admin'),
        testId: 'menu-staff',
      });
    }
    if (isStaff && has('users.manage_permissions')) {
      extraItems.push({
        key: 'permissions',
        label: 'Права и доступ',
        icon: ShieldCheck,
        path: '/permissions',
        matches: (l) => l.startsWith('/permissions'),
        testId: 'menu-permissions',
      });
    }
  }


  // «Автомобили» — доступно ВСЕМ ролям при наличии vehicles.* права
  // (включая персональные оверрайды для роли «Рабочий» / «Клиент»).
  if (user) {
    const canSeeVehicles =
      user.role === 'admin' || user.role === 'director' || user.role === 'master' ||
      hasAny('vehicles.view', 'vehicles.manage', 'vehicles.photo_control', 'vehicles.audit_log');
    if (canSeeVehicles) {
      extraItems.push({
        key: 'vehicles',
        label: 'Автомобили',
        icon: Car,
        path: '/vehicles',
        matches: (l) => l.startsWith('/vehicles'),
        testId: 'menu-vehicles',
      });
    }
  }

  // === Вкладки нижней панели (моб.) ===
  const bottomTabs: BottomTab[] = [];
  if (user) {
    bottomTabs.push({ ...overviewItem, key: 'overview' } as BottomTab);
    bottomTabs.push({ ...projectsItem, key: 'projects' } as BottomTab);
    if (financeItem) bottomTabs.push({ ...financeItem, key: 'finance' } as BottomTab);
    bottomTabs.push({
      key: 'more',
      label: 'Ещё',
      icon: MoreHorizontal,
      path: '#more',
      matches: () => false,
      testId: 'tab-more',
    });
  }

  // === Полный список для боковой панели и шторки «Ещё» ===
  const sidebarItems: NavItem[] = [overviewItem, projectsItem];
  if (financeItem) sidebarItems.push(financeItem);
  sidebarItems.push(...extraItems);

  const roleLabel =
    user?.role === 'admin' ? 'Администратор' :
    user?.role === 'director' ? 'Директор' :
    user?.role === 'master' ? 'Мастер' :
    user?.role === 'worker' ? 'Рабочий' :
    user?.role === 'client' ? 'Заказчик' : '';

  const renderNavItem = (item: NavItem, active: boolean, variant: 'sidebar' | 'sheet') => {
    const Icon = item.icon;
    if (variant === 'sidebar') {
      return (
        <button
          key={item.key}
          type="button"
          onClick={() => go(item.path)}
          className="flex items-center gap-3 w-full h-11 px-3 transition-colors text-left"
          style={{
            background: active ? 'rgba(37,99,235,0.10)' : 'transparent',
            color: active ? 'var(--corp-accent)' : 'var(--corp-ink-2)',
            borderRadius: 'var(--corp-r)',
            fontWeight: active ? 700 : 500,
          }}
          data-testid={item.testId}
          aria-current={active ? 'page' : undefined}
        >
          <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
          <span className="text-[14px]">{item.label}</span>
          {active && (
            <span
              className="ml-auto inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--corp-accent)' }}
            />
          )}
        </button>
      );
    }
    // sheet variant — без фона, с шевроном справа
    return (
      <button
        key={item.key}
        type="button"
        onClick={() => go(item.path)}
        className="flex items-center gap-3 w-full px-4 h-14 text-left transition-colors"
        style={{ color: 'var(--corp-ink)' }}
        data-testid={item.testId}
      >
        <Icon size={18} style={{ color: active ? 'var(--corp-accent)' : 'var(--corp-ink-2)' }} />
        <span className="flex-1 text-[14px] font-semibold">{item.label}</span>
        {active && (
          <span
            className="text-[10px] font-bold uppercase px-2 h-5 inline-flex items-center"
            style={{
              color: 'var(--corp-accent)',
              background: 'rgba(37,99,235,0.10)',
              borderRadius: 'var(--corp-r-sm)',
              letterSpacing: '0.04em',
            }}
          >
            Сейчас
          </span>
        )}
        <ChevronRight size={16} style={{ color: 'var(--corp-muted)' }} />
      </button>
    );
  };

  // Не показываем меню вообще на странице логина
  if (!showNav) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--corp-bg)' }}>
      {/* Боковая панель — десктоп (md+) */}
      <aside
        className="hidden lg:flex flex-col fixed top-0 left-0 bottom-0 w-60 z-40"
        style={{
          background: 'var(--corp-surface)',
          borderRight: '1px solid var(--corp-line)',
        }}
      >
        {/* Логотип / бренд */}
        <div
          className="px-4 h-16 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--corp-line)' }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--corp-ink)', color: '#fff' }}
          >
            <span className="text-[14px] font-bold">P</span>
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-bold leading-tight" style={{ color: 'var(--corp-ink)' }}>Pag</div>
            <div
              className="text-[10px] uppercase font-bold leading-tight"
              style={{ color: 'var(--corp-muted)', letterSpacing: '0.08em' }}
            >
              Workspace
            </div>
          </div>
        </div>

        {/* Список разделов */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {sidebarItems.map((item) => renderNavItem(item, item.matches(location), 'sidebar'))}
        </nav>

        {/* Пользователь и выход */}
        <div className="p-3" style={{ borderTop: '1px solid var(--corp-line)' }}>
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-2)' }}
            >
              <span className="text-[12px] font-bold">
                {(user?.name || '?').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--corp-ink)' }}>
                {user?.name || 'Пользователь'}
              </div>
              {roleLabel && (
                <div className="text-[11px] truncate" style={{ color: 'var(--corp-muted)' }}>
                  {roleLabel}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3 w-full h-10 px-3 transition-colors text-left"
            style={{ color: 'var(--corp-neg)', borderRadius: 'var(--corp-r)' }}
            data-testid="nav-logout-sidebar"
          >
            <LogOut size={16} />
            <span className="text-[13px] font-bold">Выйти</span>
          </button>
        </div>
      </aside>

      {/* Заслонка под "чёлкой" iOS, чтобы прокручиваемый контент
          не просвечивал в зоне статус-бара */}
      <div
        aria-hidden
        className="fixed top-0 left-0 right-0 pointer-events-none lg:hidden"
        style={{
          height: 'env(safe-area-inset-top, 0px)',
          background: 'var(--corp-bg)',
          zIndex: 60,
        }}
      />

      {/* Основной контент */}
      <div className="flex-1 min-w-0 lg:pl-60">
        <div className="pb-24 lg:pb-6" data-app-content>
          {children}
        </div>
      </div>

      {/* Нижняя панель — только моб. (до md) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
        style={{
          background: 'var(--corp-surface)',
          borderTop: '1px solid var(--corp-line)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch h-16 max-w-3xl mx-auto">
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const isMore = tab.key === 'more';
            const active = isMore ? moreOpen : tab.matches(location);

            const inner = (
              <div className="flex flex-col items-center justify-center gap-1 w-full h-full">
                <Icon
                  size={22}
                  style={{ color: active ? 'var(--corp-ink)' : 'var(--corp-muted)' }}
                  strokeWidth={active ? 2.25 : 1.75}
                />
                <span
                  className="text-[10px] uppercase"
                  style={{
                    color: active ? 'var(--corp-ink)' : 'var(--corp-muted)',
                    fontWeight: active ? 700 : 500,
                    letterSpacing: '0.06em',
                  }}
                >
                  {tab.label}
                </span>
              </div>
            );

            if (isMore) {
              return (
                <Sheet key={tab.key} open={moreOpen} onOpenChange={setMoreOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="flex-1 transition-colors"
                      data-testid={tab.testId}
                      aria-label={tab.label}
                    >
                      {inner}
                    </button>
                  </SheetTrigger>
                  <SheetContent
                    side="bottom"
                    className="border-t p-0 max-h-[85vh] overflow-y-auto"
                    style={{
                      background: 'var(--corp-bg)',
                      borderColor: 'var(--corp-line)',
                      borderTopLeftRadius: 'var(--corp-r-lg)',
                      borderTopRightRadius: 'var(--corp-r-lg)',
                    }}
                  >
                    <SheetHeader className="sr-only">
                      <SheetTitle>Меню</SheetTitle>
                    </SheetHeader>

                    {/* Шапка с пользователем */}
                    <div
                      className="px-4 pt-5 pb-4 flex items-center gap-3"
                      style={{ borderBottom: '1px solid var(--corp-line)' }}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: 'var(--corp-ink)', color: '#fff' }}
                      >
                        <Home size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold truncate" style={{ color: 'var(--corp-ink)' }}>
                          {user?.name || 'Пользователь'}
                        </div>
                        {roleLabel && (
                          <div className="text-[12px] truncate" style={{ color: 'var(--corp-muted)' }}>
                            {roleLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Все разделы (включая обзор/проекты/финансы) */}
                    {sidebarItems.length > 0 && (
                      <div className="p-3">
                        <div
                          className="overflow-hidden"
                          style={{
                            background: 'var(--corp-surface)',
                            border: '1px solid var(--corp-line)',
                            borderRadius: 'var(--corp-r-lg)',
                          }}
                        >
                          {sidebarItems.map((item, idx) => (
                            <div
                              key={item.key}
                              style={{ borderTop: idx === 0 ? 'none' : '1px solid var(--corp-line)' }}
                            >
                              {renderNavItem(item, item.matches(location), 'sheet')}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Кнопка выхода */}
                    <div className="px-3 pb-6">
                      <button
                        type="button"
                        onClick={() => { setMoreOpen(false); logout(); }}
                        className="flex items-center gap-3 w-full px-4 h-12 text-left"
                        data-testid="nav-logout"
                        style={{ color: 'var(--corp-neg)' }}
                      >
                        <LogOut size={18} />
                        <span className="text-[14px] font-bold">Выйти</span>
                      </button>
                    </div>
                  </SheetContent>
                </Sheet>
              );
            }

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => go(tab.path)}
                className="flex-1 transition-colors"
                data-testid={tab.testId}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
