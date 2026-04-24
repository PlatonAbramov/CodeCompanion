import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { useLocation } from "wouter";
import { Globe } from "lucide-react";
import logoImage from "@assets/1 (1)_1756713794265.jpg";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { user, login, isLoggingIn, isLoading } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin' || user.role === 'director') {
        setLocation('/director');
      } else if (user.role === 'master') {
        setLocation('/master');
      } else if (user.role === 'client') {
        setLocation('/client-projects');
      }
    }
  }, [user, isLoading, setLocation]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username, password });
  };

  const toggleLanguage = () => {
    setLanguage(language === 'ru' ? 'en' : 'ru');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'var(--corp-bg)',
        fontFamily: 'var(--corp-font)',
        color: 'var(--corp-ink)',
      }}
    >
      <div className="w-full max-w-md">
        <div
          className="overflow-hidden"
          style={{
            background: 'var(--corp-surface)',
            borderRadius: 'var(--corp-r-xl)',
            border: '1px solid var(--corp-line)',
            boxShadow: '0 1px 2px rgba(10,10,11,0.04), 0 8px 24px rgba(10,10,11,0.06)',
          }}
        >
          <div className="px-7 pt-8 pb-7">
            <div className="text-center mb-7">
              <div
                className="w-full max-w-[280px] mx-auto mb-5 overflow-hidden"
                style={{ borderRadius: 'var(--corp-r-lg)' }}
              >
                <img
                  src={logoImage}
                  alt="PLATON ABRAMOV GROUP"
                  className="w-full h-auto block"
                />
              </div>
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: 'var(--corp-muted)' }}
              >
                {t('loginSubtitle')}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
              autoComplete="on"
              method="post"
              action="/api/auth/login"
            >
              <div>
                <label
                  htmlFor="login-username"
                  className="block text-[12px] font-semibold mb-2 tracking-wide"
                  style={{ color: 'var(--corp-ink-2)' }}
                >
                  {t('username')}
                </label>
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('username')}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode="text"
                  className="w-full px-4 py-3 text-[15px] outline-none transition-colors min-h-[48px]"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r)',
                    color: 'var(--corp-ink)',
                    fontFamily: 'var(--corp-font)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--corp-accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--corp-accent-soft)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--corp-line)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-[12px] font-semibold mb-2 tracking-wide"
                  style={{ color: 'var(--corp-ink-2)' }}
                >
                  {t('password')}
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('password')}
                  required
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full px-4 py-3 text-[15px] outline-none transition-colors min-h-[48px]"
                  style={{
                    background: 'var(--corp-surface)',
                    border: '1px solid var(--corp-line)',
                    borderRadius: 'var(--corp-r)',
                    color: 'var(--corp-ink)',
                    fontFamily: 'var(--corp-font)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--corp-accent)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--corp-accent-soft)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--corp-line)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 text-[15px] font-semibold transition-all min-h-[48px] disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--corp-ink)',
                  color: 'var(--corp-brand-text)',
                  borderRadius: 'var(--corp-r)',
                  fontFamily: 'var(--corp-font)',
                  letterSpacing: '-0.1px',
                }}
                onMouseEnter={(e) => {
                  if (!isLoggingIn) e.currentTarget.style.background = 'var(--corp-ink-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--corp-ink)';
                }}
              >
                {isLoggingIn ? t('loading') : t('login')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleLanguage}
                className="inline-flex items-center gap-1.5 text-[13px] py-2 px-3 rounded-md transition-colors"
                style={{ color: 'var(--corp-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--corp-ink-2)';
                  e.currentTarget.style.background = 'var(--corp-surface-2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--corp-muted)';
                  e.currentTarget.style.background = 'transparent';
                }}
                data-testid="button-toggle-language"
              >
                <Globe size={14} />
                {language === 'ru' ? 'English' : 'Русский'}
              </button>
            </div>
          </div>
        </div>

        <p
          className="text-center mt-5 text-[11px] tracking-wider uppercase"
          style={{
            color: 'var(--corp-muted)',
            fontFamily: 'var(--corp-mono)',
            letterSpacing: '0.08em',
          }}
        >
          Pag CRM · Corporate v1
        </p>
      </div>
    </div>
  );
}
