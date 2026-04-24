import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Home, Users, Receipt, Wrench, Users as StaffIcon, LogOut, UserCheck, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Свайп-жесты:
  // - влево/вправо — навигация назад/вперёд
  // - вниз на 80px от верха страницы — обновление страницы (pull-to-refresh)
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
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          tag === 'BUTTON' ||
          el.isContentEditable
        ) {
          return true;
        }
        // Горизонтально скроллящиеся контейнеры
        if (el.scrollWidth > el.clientWidth) {
          const style = window.getComputedStyle(el);
          if (
            style.overflowX === 'auto' ||
            style.overflowX === 'scroll'
          ) {
            return true;
          }
        }
        el = el.parentElement;
      }
      return false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        tracking = false;
        return;
      }
      if (isInteractive(e.target)) {
        tracking = false;
        return;
      }
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

      // Pull-to-refresh: свайп вниз от самого верха страницы на 80+ пикселей
      const pullThreshold = 80;
      if (
        startScrollTop <= 0 &&
        dy >= pullThreshold &&
        absDy > absDx * 1.5
      ) {
        window.location.reload();
        return;
      }

      // Горизонтальная навигация
      const minDistance = 40;
      if (absDx < minDistance || absDy > absDx * 0.6) return;

      if (dx > 0) {
        // Свайп слева направо — назад
        window.history.back();
      } else {
        // Свайп справа налево — вперёд
        window.history.forward();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // Показываем нижнюю навигацию только для аутентифицированных пользователей
  const showBottomNav = user && location !== '/login';

  const isActive = (prefix: string) => location.startsWith(prefix);

  const go = (path: string) => {
    setMenuOpen(false);
    setLocation(path);
  };

  // Собираем список пунктов меню для текущей роли
  const menuItems: { label: string; icon: any; path: string; active: boolean; testId: string }[] = [];

  if (user?.role === 'client') {
    menuItems.push({
      label: 'Мои проекты',
      icon: Receipt,
      path: '/client-projects',
      active: isActive('/client-projects'),
      testId: 'menu-clients',
    });
  } else if (user) {
    menuItems.push({
      label: 'Главная',
      icon: Home,
      path: user.role === 'master' ? '/master' : '/director',
      active: location === '/director' || location === '/master' || location === '/admin',
      testId: 'menu-home',
    });
    menuItems.push({
      label: 'Подрядчики',
      icon: Users,
      path: '/contractors',
      active: isActive('/contractors'),
      testId: 'menu-contractors',
    });
    if (user.role !== 'master') {
      menuItems.push({
        label: 'Заказчики',
        icon: Receipt,
        path: '/clients',
        active: isActive('/clients'),
        testId: 'menu-customers',
      });
    }
    if (user.role === 'admin' || user.role === 'director' || user.role === 'master') {
      menuItems.push({
        label: 'Инструменты',
        icon: Wrench,
        path: '/tools',
        active: isActive('/tools'),
        testId: 'menu-tools',
      });
    }
    if (user.role === 'admin' || user.role === 'director') {
      menuItems.push({
        label: 'Персонал',
        icon: UserCheck,
        path: '/personnel',
        active: isActive('/personnel'),
        testId: 'menu-personnel',
      });
      menuItems.push({
        label: 'Сотрудники',
        icon: StaffIcon,
        path: '/admin',
        active: isActive('/admin'),
        testId: 'menu-staff',
      });
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--corp-bg)' }}>
      {/* Основной контент с отступом снизу для навигации */}
      <div className={showBottomNav ? "pb-24" : ""} data-app-content>
        {children}
      </div>

      {/* Фиксированная нижняя навигация — корпоративный стиль */}
      {showBottomNav && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50"
          style={{
            background: 'var(--corp-surface)',
            borderTop: '1px solid var(--corp-line)',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <div className="flex justify-center items-center h-16 px-4">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 h-11 px-5 transition-colors"
                  style={{
                    background: menuOpen ? 'var(--corp-accent)' : 'var(--corp-surface-2)',
                    color: menuOpen ? '#fff' : 'var(--corp-ink-2)',
                    borderRadius: 'var(--corp-r)',
                    border: '1px solid var(--corp-line)',
                  }}
                  data-testid="nav-menu"
                  aria-label="Меню"
                >
                  <Menu size={18} />
                  <span
                    className="text-[12px] font-bold uppercase"
                    style={{ letterSpacing: '0.06em' }}
                  >
                    Меню
                  </span>
                </button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="border-t p-0"
                style={{
                  background: 'var(--corp-surface)',
                  borderColor: 'var(--corp-line)',
                  borderTopLeftRadius: 'var(--corp-r-lg)',
                  borderTopRightRadius: 'var(--corp-r-lg)',
                }}
              >
                <div
                  className="px-4 pt-4 pb-3"
                  style={{ borderBottom: '1px solid var(--corp-line)' }}
                >
                  <SheetHeader>
                    <SheetTitle
                      className="text-[11px] font-bold uppercase text-left"
                      style={{ color: 'var(--corp-muted)', letterSpacing: '0.08em' }}
                    >
                      {user?.name || 'Меню'}
                    </SheetTitle>
                  </SheetHeader>
                </div>
                <div className="px-2 pt-2 pb-4">
                  <div className="flex flex-col">
                    {menuItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.path}
                          type="button"
                          onClick={() => go(item.path)}
                          className="flex items-center gap-3 w-full px-3 h-12 text-left transition-colors"
                          style={{
                            background: item.active ? 'rgba(37,99,235,0.10)' : 'transparent',
                            color: item.active ? 'var(--corp-accent)' : 'var(--corp-ink-2)',
                            borderRadius: 'var(--corp-r)',
                          }}
                          data-testid={item.testId}
                        >
                          <Icon size={18} />
                          <span className="text-[14px] font-semibold">{item.label}</span>
                          {item.active && (
                            <span
                              className="ml-auto inline-block w-1.5 h-1.5 rounded-full"
                              style={{ background: 'var(--corp-accent)' }}
                            />
                          )}
                        </button>
                      );
                    })}

                    <div
                      className="my-2"
                      style={{ borderTop: '1px solid var(--corp-line)' }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-3 w-full px-3 h-12 text-left transition-colors"
                      style={{
                        color: 'var(--corp-neg)',
                        borderRadius: 'var(--corp-r)',
                      }}
                      data-testid="nav-logout"
                    >
                      <LogOut size={18} />
                      <span className="text-[14px] font-semibold">Выход</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}
    </div>
  );
}
