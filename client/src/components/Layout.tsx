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
    <div className="min-h-screen bg-slate-50">
      {/* Основной контент с отступом снизу для навигации */}
      <div className={showBottomNav ? "pb-24" : ""} data-app-content>
        {children}
      </div>

      {/* Фиксированная нижняя навигация - одна кнопка-меню */}
      {showBottomNav && (
        <div
          className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-center items-center h-16 px-4">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="flex flex-col items-center justify-center px-6 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50 transition-colors"
                  data-testid="nav-menu"
                  aria-label="Меню"
                >
                  <Menu size={24} />
                  <span className="text-xs mt-1">Меню</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle>Меню</SheetTitle>
                </SheetHeader>
                <div className="grid grid-cols-1 gap-1 mt-4 pb-4">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.path}
                        onClick={() => go(item.path)}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left transition-colors ${
                          item.active
                            ? 'text-blue-600 bg-blue-50'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                        data-testid={item.testId}
                      >
                        <Icon size={20} />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left text-red-600 hover:bg-red-50 transition-colors mt-2"
                    data-testid="nav-logout"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">Выход</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}
    </div>
  );
}
