type TFunc = (key: string) => string;

const STATUS_TO_KEY: Record<number, string> = {
  400: "err_validation",
  401: "err_unauthorized",
  403: "err_forbidden",
  404: "err_notFound",
  409: "err_conflict",
  500: "err_serverInternal",
  502: "err_serverInternal",
  503: "err_serverInternal",
  504: "err_serverInternal",
};

export function getServerErrorMessage(error: unknown, t: TFunc): string {
  if (!error) return t("err_unknown");

  if (typeof error === "string") return error;

  if (error instanceof Error) {
    const msg = error.message || "";

    if (
      msg.toLowerCase().includes("failed to fetch") ||
      msg.toLowerCase().includes("network") ||
      msg.toLowerCase().includes("networkerror")
    ) {
      return t("err_network");
    }

    const m = msg.match(/^(\d{3})\s*:\s*(.*)$/);
    if (m) {
      const status = Number(m[1]);
      const body = (m[2] || "").trim();
      try {
        const parsed = JSON.parse(body);
        if (parsed && typeof parsed.message === "string" && parsed.message) {
          return parsed.message;
        }
        if (parsed && typeof parsed.error === "string" && parsed.error) {
          return parsed.error;
        }
      } catch {
        if (body) return body;
      }
      const key = STATUS_TO_KEY[status];
      if (key) return t(key);
      return body || t("err_unknown");
    }

    return msg || t("err_unknown");
  }

  if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.message === "string" && e.message) return e.message;
  }

  return t("err_unknown");
}

