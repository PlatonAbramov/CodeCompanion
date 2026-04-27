// Серверная отправка чеков расходов в Telegram.
// Полностью аддитивный модуль. Если интеграция выключена или не сконфигурирована —
// просто молча no-op. Никогда не должен ронять основной POST /api/expenses.
//
// Конфигурация через ENV:
//   TELEGRAM_BOT_TOKEN     — токен бота, выданный @BotFather
//   TELEGRAM_CHAT_ID       — ID целевого чата (числовой или @channel)
//   TELEGRAM_NOTIFICATIONS_ENABLED — '1'|'true'|'on' (по умолчанию: включено, если есть токен и chat id)
//
// Использует встроенный fetch + FormData (Node 20+).

import { ObjectStorageService } from "./objectStorage";
import { storage } from "./storage";

const TG_API = "https://api.telegram.org";

const PHOTO_MAX_BYTES = 10 * 1024 * 1024; // 10 МБ — лимит sendPhoto для ботов
const DOCUMENT_MAX_BYTES = 50 * 1024 * 1024; // 50 МБ — лимит sendDocument для ботов

function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = process.env.TELEGRAM_CHAT_ID || "";
  const enabledFlag = (process.env.TELEGRAM_NOTIFICATIONS_ENABLED || "").toLowerCase();
  const explicitlyDisabled = ["0", "false", "off", "no"].includes(enabledFlag);
  const enabled = !!token && !!chatId && !explicitlyDisabled;
  return { token, chatId, enabled };
}

export function isTelegramConfigured(): boolean {
  return getConfig().enabled;
}

function escapeMd(text: string): string {
  // MarkdownV2 special chars per Telegram docs
  return text.replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`);
}

function formatAmount(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isFinite(n)) {
    return n.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return String(amount);
}

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildCaption(args: {
  projectName?: string | null;
  category?: string | null;
  amount: string | number;
  currency?: string | null;
  description?: string | null;
  uploaderName?: string | null;
  createdAt: Date;
  expenseId: string;
}): string {
  const lines: string[] = [];
  lines.push("🧾 *Новый расход*");
  if (args.projectName) lines.push(`📁 *Проект:* ${escapeMd(args.projectName)}`);
  if (args.category) lines.push(`🏷 *Категория:* ${escapeMd(args.category)}`);
  const amt = `${formatAmount(args.amount)}${args.currency ? " " + args.currency : " AED"}`;
  lines.push(`💰 *Сумма:* ${escapeMd(amt)}`);
  if (args.description && args.description.trim()) {
    lines.push(`📝 *Комментарий:* ${escapeMd(args.description.trim())}`);
  }
  if (args.uploaderName) lines.push(`👤 *Загрузил:* ${escapeMd(args.uploaderName)}`);
  lines.push(`🕒 ${escapeMd(formatDate(args.createdAt))}`);
  lines.push(`🆔 \`${escapeMd(args.expenseId)}\``);
  return lines.join("\n");
}

function isImageMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const m = mime.toLowerCase();
  // Только то, что Telegram гарантированно принимает как photo:
  return m === "image/jpeg" || m === "image/jpg" || m === "image/png" || m === "image/webp";
}

function pickFilenameFromUrl(u: string, fallback: string): string {
  try {
    const last = u.split("/").pop() || "";
    const cleaned = last.split("?")[0];
    return cleaned || fallback;
  } catch {
    return fallback;
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function downloadReceipt(url: string): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
  const svc = new ObjectStorageService();
  const file = await svc.getObjectEntityFile(url);
  const [meta] = await file.getMetadata();
  const [buf] = await file.download();
  const contentType = (meta as any)?.contentType || "application/octet-stream";
  const baseName = (meta as any)?.name?.split("/")?.pop() || pickFilenameFromUrl(url, "receipt");
  return { buffer: buf, contentType, filename: baseName };
}

async function callTelegram(token: string, method: string, form: FormData): Promise<any> {
  const url = `${TG_API}/bot${token}/${method}`;
  const res = await fetch(url, { method: "POST", body: form });
  const text = await res.text();
  let body: any = null;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  if (!res.ok || (body && body.ok === false)) {
    const desc = body?.description || `HTTP ${res.status}`;
    const err: any = new Error(`Telegram ${method} failed: ${desc}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

async function sendOneAttachment(args: {
  token: string;
  chatId: string;
  caption: string;
  buffer: Buffer;
  contentType: string;
  filename: string;
}): Promise<{ messageId: string; mode: "photo" | "document" }> {
  const { token, chatId, caption, buffer, contentType, filename } = args;
  const blob = new Blob([new Uint8Array(buffer)], { type: contentType });

  // Решаем, как слать: photo или document
  const tryAsPhoto = isImageMime(contentType) && buffer.length <= PHOTO_MAX_BYTES;
  const mode: "photo" | "document" = tryAsPhoto ? "photo" : "document";

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", caption);
  form.append("parse_mode", "MarkdownV2");
  if (mode === "photo") {
    form.append("photo", blob, filename);
  } else {
    form.append("document", blob, filename);
  }

  const result = await callTelegram(token, mode === "photo" ? "sendPhoto" : "sendDocument", form);
  const messageId = String(result?.result?.message_id ?? "");
  return { messageId, mode };
}

async function notifyTooLarge(token: string, chatId: string, expenseId: string, sizeBytes: number): Promise<string | null> {
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(
      "text",
      `⚠️ Чек по расходу #${expenseId} не отправлен — превышен размер файла (${(sizeBytes / 1024 / 1024).toFixed(1)} МБ).`,
    );
    const r = await callTelegram(token, "sendMessage", form);
    return String(r?.result?.message_id ?? "");
  } catch (e) {
    console.error("[telegram] sendMessage(too_large) failed:", e);
    return null;
  }
}

// Главная точка входа: вызывать «fire-and-forget» из POST /api/expenses.
// Никогда не бросает наружу. Все результаты попадают в БД (telegram_notifications).
export function notifyExpenseCreatedAsync(input: {
  expenseId: string;
  receiptUrl: string | null | undefined;
  projectName?: string | null;
  category?: string | null;
  amount: string | number;
  currency?: string | null;
  description?: string | null;
  uploaderName?: string | null;
  createdAt: Date;
}): void {
  // Полностью отвязываем от текущего HTTP-цикла.
  setImmediate(() => {
    void notifyExpenseCreated(input).catch((e) => {
      console.error("[telegram] notifier crashed:", e);
    });
  });
}

async function notifyExpenseCreated(input: {
  expenseId: string;
  receiptUrl: string | null | undefined;
  projectName?: string | null;
  category?: string | null;
  amount: string | number;
  currency?: string | null;
  description?: string | null;
  uploaderName?: string | null;
  createdAt: Date;
}): Promise<void> {
  const { token, chatId, enabled } = getConfig();
  if (!enabled) return;
  if (!input.receiptUrl) return;

  // Идемпотентность: если для этой пары (expense, file) уже была отправка — выходим.
  try {
    const already = await storage.getTelegramNotification(input.expenseId, input.receiptUrl);
    if (already) return;
  } catch (e) {
    console.error("[telegram] idempotency check failed:", e);
    // Если упала проверка — лучше не дублировать; выходим.
    return;
  }

  // Скачиваем файл
  let download: { buffer: Buffer; contentType: string; filename: string };
  try {
    download = await downloadReceipt(input.receiptUrl);
  } catch (e: any) {
    console.error(`[telegram] failed to download receipt for expense ${input.expenseId}:`, e?.message || e);
    await safeRecord({
      expenseId: input.expenseId,
      fileUrl: input.receiptUrl,
      status: "failed",
      error: `download_failed: ${e?.message || "unknown"}`,
      attempts: 0,
      telegramChatId: chatId,
    });
    return;
  }

  // Если файл больше 50 МБ — отправляем уведомление и помечаем too_large
  if (download.buffer.length > DOCUMENT_MAX_BYTES) {
    const msgId = await notifyTooLarge(token, chatId, input.expenseId, download.buffer.length);
    await safeRecord({
      expenseId: input.expenseId,
      fileUrl: input.receiptUrl,
      status: "too_large",
      error: `file_too_large: ${download.buffer.length} bytes`,
      attempts: 0,
      telegramChatId: chatId,
      telegramMessageId: msgId,
    });
    return;
  }

  const caption = buildCaption({
    projectName: input.projectName,
    category: input.category,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    uploaderName: input.uploaderName,
    createdAt: input.createdAt,
    expenseId: input.expenseId,
  });

  // Ретраи: до 4 попыток, экспоненциальный backoff (1s, 3s, 9s)
  const delays = [0, 1000, 3000, 9000];
  let attempts = 0;
  let lastError: any = null;
  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await sleep(delays[i]);
    attempts++;
    try {
      const sent = await sendOneAttachment({
        token, chatId, caption,
        buffer: download.buffer,
        contentType: download.contentType,
        filename: download.filename,
      });
      console.log(`[telegram] sent expense=${input.expenseId} mode=${sent.mode} msg_id=${sent.messageId}`);
      await safeRecord({
        expenseId: input.expenseId,
        fileUrl: input.receiptUrl,
        status: "sent",
        telegramMessageId: sent.messageId,
        telegramChatId: chatId,
        attempts,
      });
      return;
    } catch (e: any) {
      lastError = e;
      console.warn(`[telegram] attempt ${attempts} failed for expense=${input.expenseId}: ${e?.message || e}`);
      // На некоторых ошибках (4xx, кроме 429) ретрай не имеет смысла.
      const status = e?.status as number | undefined;
      if (status && status >= 400 && status < 500 && status !== 429) break;
    }
  }

  console.error(`[telegram] FAILED to send expense=${input.expenseId} after ${attempts} attempts: ${lastError?.message || lastError}`);
  await safeRecord({
    expenseId: input.expenseId,
    fileUrl: input.receiptUrl,
    status: "failed",
    error: `send_failed: ${lastError?.message || "unknown"}`,
    attempts,
    telegramChatId: chatId,
  });
}

async function safeRecord(data: {
  expenseId: string;
  fileUrl: string;
  status: string;
  telegramMessageId?: string | null;
  telegramChatId?: string | null;
  error?: string | null;
  attempts: number;
}): Promise<void> {
  try {
    await storage.createTelegramNotification(data);
  } catch (e) {
    console.error("[telegram] failed to record notification:", e);
  }
}
