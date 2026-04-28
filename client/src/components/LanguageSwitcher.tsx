import { Globe, Check } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Language } from "@/lib/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LANGS: { code: Language; short: string; native: string; english: string }[] = [
  { code: "ru", short: "РУС", native: "Русский", english: "Russian" },
  { code: "en", short: "EN", native: "English", english: "English" },
  { code: "hi", short: "हि", native: "हिन्दी", english: "Hindi" },
];

interface LanguageSwitcherProps {
  variant?: "icon" | "compact";
  className?: string;
}

export function LanguageSwitcher({ variant = "icon", className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const current = LANGS.find((l) => l.code === language) ?? LANGS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={
            variant === "icon"
              ? "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors"
              : "inline-flex items-center gap-1.5 text-[13px] py-2 px-3 rounded-md transition-colors"
          }
          style={
            variant === "icon"
              ? {
                  background: "var(--corp-surface)",
                  border: "1px solid var(--corp-line)",
                  color: "var(--corp-ink-2)",
                }
              : { color: "var(--corp-muted)" }
          }
          aria-label="Язык / Language / भाषा"
          title={`${current.native}`}
          data-testid="button-language-switcher"
        >
          {variant === "icon" ? (
            <div className="flex items-center gap-1">
              <Globe size={16} />
              <span
                className="text-[10px] font-bold leading-none"
                style={{ fontFamily: "var(--corp-mono)" }}
              >
                {current.short}
              </span>
            </div>
          ) : (
            <>
              <Globe size={14} />
              <span>{current.native}</span>
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={className}>
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLanguage(l.code)}
            data-testid={`menu-lang-${l.code}`}
            className="flex items-center justify-between gap-3 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span
                className="text-[11px] font-bold w-8 inline-block"
                style={{ fontFamily: "var(--corp-mono)", color: "var(--corp-muted)" }}
              >
                {l.short}
              </span>
              <span className="text-[13px]">{l.native}</span>
            </span>
            {l.code === language && (
              <Check size={14} style={{ color: "var(--corp-ink-2)" }} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
