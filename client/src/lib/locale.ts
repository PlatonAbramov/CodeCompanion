import { Language } from "@/lib/translations";

const LOCALE_MAP: Record<Language, string> = {
  ru: "ru-RU",
  en: "en-US",
  hi: "hi-IN",
};

export function localeOf(lang: Language): string {
  return LOCALE_MAP[lang] ?? "ru-RU";
}

export function fmtDate(value: string | Date | null | undefined, lang: Language): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(localeOf(lang), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function fmtDateLong(value: string | Date | null | undefined, lang: Language): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(localeOf(lang), {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function fmtToday(lang: Language): string {
  return new Date().toLocaleDateString(localeOf(lang), {
    day: "numeric",
    month: "long",
  });
}

export function fmtDateTime(value: string | Date | null | undefined, lang: Language): string {
  if (!value) return "—";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString(localeOf(lang), {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function fmtNumber(n: number | string | null | undefined, lang: Language): string {
  if (n === null || n === undefined || n === "") return "0";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "0";
  return num.toLocaleString(localeOf(lang), {
    maximumFractionDigits: 2,
  });
}
