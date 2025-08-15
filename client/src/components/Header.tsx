import { LogOut, User, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface HeaderProps {
  title?: string;
  showUserMenu?: boolean;
}

export function Header({ title, showUserMenu = true }: HeaderProps) {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  return (
    <header 
      className="h-16 border-b px-4 flex items-center justify-between sticky top-0 z-50"
      style={{ 
        backgroundColor: 'var(--color-bg)', 
        borderColor: 'var(--color-border)' 
      }}
    >
      <div className="flex items-center gap-4">
        <img 
          src="/assets/pag-logo-light.svg" 
          alt="PAG - Platon Abramov Group" 
          className="h-8"
        />
        {title && (
          <div className="h-6 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
        )}
        {title && (
          <h1 className="text-lg font-semibold" style={{ color: 'var(--color-text)' }}>
            {title}
          </h1>
        )}
      </div>

      {showUserMenu && (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="h-8 w-8 p-0"
            style={{ color: 'var(--color-text-muted)' }}
            data-testid="button-language-toggle"
          >
            <Globe size={16} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                style={{ color: 'var(--color-text-muted)' }}
                data-testid="button-user-menu"
              >
                <User size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56"
              style={{ 
                backgroundColor: 'var(--color-surface)', 
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div className="px-2 py-1.5 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {user?.username}
              </div>
              <div className="px-2 py-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {user?.role === 'director' ? t('director') : t('master')}
              </div>
              <div className="h-px my-1" style={{ backgroundColor: 'var(--color-border)' }} />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer"
                style={{ color: 'var(--color-text)' }}
                data-testid="button-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t('logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
}