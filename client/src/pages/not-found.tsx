import { useLocation } from "wouter";
import { AlertCircle, Home } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6"
      style={{ background: 'var(--corp-bg)', fontFamily: 'var(--corp-font)' }}
    >
      <div
        className="w-full max-w-md p-8 text-center"
        style={{
          background: 'var(--corp-surface)',
          border: '1px solid var(--corp-line)',
          borderRadius: 'var(--corp-r-lg)',
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'var(--corp-neg-soft)', color: 'var(--corp-neg)' }}
        >
          <AlertCircle size={32} />
        </div>

        <p
          className="text-[10px] font-bold uppercase mb-2"
          style={{ color: 'var(--corp-muted)', letterSpacing: '0.08em', fontFamily: 'var(--corp-mono)' }}
        >
          Ошибка 404
        </p>

        <h1
          className="text-[22px] font-bold mb-2"
          style={{ color: 'var(--corp-ink)', letterSpacing: '-0.4px' }}
        >
          Страница не найдена
        </h1>

        <p className="text-[13px] mb-6" style={{ color: 'var(--corp-ink-3)' }}>
          Возможно, страница была удалена или вы перешли по неверной ссылке
        </p>

        <button
          type="button"
          onClick={() => setLocation('/')}
          className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-semibold transition-colors"
          style={{ background: 'var(--corp-ink)', color: '#fff', borderRadius: 'var(--corp-r)' }}
          data-testid="button-go-home"
        >
          <Home size={14} /> На главную
        </button>
      </div>
    </div>
  );
}
