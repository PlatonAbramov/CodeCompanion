import { ArrowLeft, Plus } from "lucide-react";

export function fmtNum(n: number) {
  return Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ');
}

export function fmtDateRu(s?: string) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function MoneyAED({
  amount, size = 14, weight = 600, tone = 'ink',
}: {
  amount: number | string;
  size?: number;
  weight?: 400 | 500 | 600 | 700;
  tone?: 'ink' | 'pos' | 'neg' | 'muted' | 'inherit';
}) {
  const num = typeof amount === 'string' ? parseFloat(amount || '0') : amount;
  const color =
    tone === 'pos' ? 'var(--corp-pos)' :
    tone === 'neg' ? 'var(--corp-neg)' :
    tone === 'muted' ? 'var(--corp-muted)' :
    tone === 'inherit' ? 'inherit' :
    'var(--corp-ink)';
  return (
    <span style={{ fontFamily: 'var(--corp-mono)', fontSize: size, fontWeight: weight, color, whiteSpace: 'nowrap' }}>
      {fmtNum(num)}
      <span style={{ marginLeft: '0.35em', fontSize: '0.78em', opacity: 0.7, fontWeight: 500 }}>AED</span>
    </span>
  );
}

export function CorpHeader({
  title, subtitle, onBack, action,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  action?: React.ReactNode;
}) {
  return (
    <header
      className="sticky top-0 z-40"
      style={{ background: 'var(--corp-surface)', borderBottom: '1px solid var(--corp-line)' }}
    >
      <div className="px-3 sm:px-4 h-14 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
          style={{ color: 'var(--corp-ink-2)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--corp-surface-2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          data-testid="button-back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h2
            className="text-[14px] sm:text-[15px] font-bold truncate"
            style={{ color: 'var(--corp-ink)', letterSpacing: '-0.2px' }}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] truncate" style={{ color: 'var(--corp-muted)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
}

export function CorpEmpty({
  icon, title, description, actionLabel, onAction,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="p-8 text-center"
      style={{
        background: 'var(--corp-surface)',
        border: '1px dashed var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
      }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
        style={{ background: 'var(--corp-surface-2)', color: 'var(--corp-ink-3)' }}
      >
        {icon}
      </div>
      <p className="text-[14px] font-semibold mb-1" style={{ color: 'var(--corp-ink-2)' }}>
        {title}
      </p>
      <p className="text-[12px] mb-4" style={{ color: 'var(--corp-muted)' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-1.5 h-9 px-4 text-[13px] font-semibold transition-colors"
          style={{ background: 'var(--corp-accent)', color: '#fff', borderRadius: 'var(--corp-r)' }}
        >
          <Plus size={14} /> {actionLabel}
        </button>
      )}
    </div>
  );
}

export function CorpHeroSummary({
  label, amount, subtext, tone = 'brand',
}: {
  label: string;
  amount: number;
  subtext?: string;
  tone?: 'brand' | 'pos' | 'neg' | 'dark';
}) {
  const bg =
    tone === 'pos' ? 'var(--corp-pos)' :
    tone === 'neg' ? 'var(--corp-neg)' :
    tone === 'dark' ? 'var(--corp-ink)' :
    'var(--corp-brand)';
  return (
    <div
      className="p-5 mb-4"
      style={{ background: bg, color: '#fff', borderRadius: 'var(--corp-r-lg)' }}
    >
      <p
        className="text-[10px] font-bold uppercase"
        style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}
      >
        {label}
      </p>
      <div
        className="mt-2 font-bold"
        style={{
          fontSize: 'clamp(24px, 6vw, 32px)',
          letterSpacing: '-0.8px',
          fontFamily: 'var(--corp-mono)',
          lineHeight: 1.05,
        }}
      >
        {fmtNum(amount)}
        <span style={{ fontSize: '0.5em', opacity: 0.55, marginLeft: 8, fontWeight: 500 }}>AED</span>
      </div>
      {subtext && (
        <p className="mt-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
          {subtext}
        </p>
      )}
    </div>
  );
}

export function CorpItemCard({
  amount, amountTone = 'ink', date, title, description, addedBy, menu,
}: {
  amount: number | string;
  amountTone?: 'ink' | 'pos' | 'neg';
  date?: string;
  title?: string;
  description?: string;
  addedBy?: string;
  menu?: React.ReactNode;
}) {
  return (
    <div
      className="p-4"
      style={{
        background: 'var(--corp-surface)',
        border: '1px solid var(--corp-line)',
        borderRadius: 'var(--corp-r-lg)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <MoneyAED amount={amount} size={18} weight={700} tone={amountTone} />
        <div className="flex items-center gap-1">
          {date && (
            <span
              className="text-[11px]"
              style={{ color: 'var(--corp-ink-3)', fontFamily: 'var(--corp-mono)', whiteSpace: 'nowrap' }}
            >
              {date}
            </span>
          )}
          {menu}
        </div>
      </div>
      {title && (
        <p className="text-[13px] font-medium mb-0.5" style={{ color: 'var(--corp-ink-2)' }}>
          {title}
        </p>
      )}
      {description && (
        <p className="text-[12px] mb-1" style={{ color: 'var(--corp-ink-3)' }}>
          {description}
        </p>
      )}
      {addedBy && (
        <p className="text-[11px]" style={{ color: 'var(--corp-muted)' }}>
          Добавил: {addedBy}
        </p>
      )}
    </div>
  );
}
