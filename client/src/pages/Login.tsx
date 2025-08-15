import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { HardHat, Globe, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, isLoggingIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [, setLocation] = useLocation();

  // Redirect logic is handled by AuthenticatedApp component

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username, password });
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">
        <Card className="shadow-modal" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="mb-6">
                <img 
                  src="/assets/pag-logo-light.svg" 
                  alt="PAG - Platon Abramov Group" 
                  className="h-12 mx-auto"
                />
              </div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
                {t('loginTitle')}
              </h1>
              <p style={{ color: 'var(--color-text-muted)' }}>
                {t('loginSubtitle')}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  {t('username')}
                </Label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('username')}
                  required
                  className="w-full px-4 py-3 input"
                  style={{ 
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>
              
              <div>
                <Label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  {t('password')}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('password')}
                    required
                    className="w-full px-4 py-3 pr-12 input"
                    style={{ 
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)'
                    }}
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                    ) : (
                      <Eye className="h-4 w-4" style={{ color: 'var(--color-text-muted)' }} />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-sm font-medium transition-all btn-primary"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  color: 'var(--color-on-primary)',
                  border: 'none'
                }}
              >
                {isLoggingIn ? t('loading') : t('login')}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={toggleLanguage}
                className="text-sm"
                style={{ 
                  color: 'var(--color-text-muted)',
                  backgroundColor: 'transparent'
                }}
              >
                <Globe className="mr-1" size={16} />
                {language === 'ru' ? 'English' : 'Русский'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
