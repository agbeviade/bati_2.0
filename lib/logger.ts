// Logger structuré minimaliste — JSON lines en prod, lisible en dev.
//
// Pas de dépendance externe : pino/winston sont overkill pour la taille
// actuelle. À remplacer par pino + transport Logflare/Better Stack quand
// le volume justifie un agrégateur dédié.
//
// Si Sentry est configuré, les .error() sont aussi envoyés en exception.

type Level = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: number = LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? LEVELS.info;
const isDev = process.env.NODE_ENV !== "production";

function emit(level: Level, msg: string, ctx?: LogContext) {
  if (LEVELS[level] < minLevel) return;

  if (isDev) {
    const tag = `[${level.toUpperCase()}]`;
    if (ctx && Object.keys(ctx).length > 0) {
      // eslint-disable-next-line no-console
      console[level === "debug" ? "log" : level](tag, msg, ctx);
    } else {
      // eslint-disable-next-line no-console
      console[level === "debug" ? "log" : level](tag, msg);
    }
    return;
  }

  // Prod : JSON lines pour ingestion par Vercel / agrégateur.
  const line = JSON.stringify({
    level,
    msg,
    time: new Date().toISOString(),
    ...ctx,
  });
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](line);
}

type SentryCaptureCtx = { extra?: Record<string, unknown>; level?: string };
type SentryModule = {
  captureException: (e: unknown, ctx?: SentryCaptureCtx) => void;
  captureMessage: (msg: string, ctx?: SentryCaptureCtx) => void;
};

function toSentry(err: unknown, ctx?: LogContext) {
  // Lazy : ne charge @sentry/nextjs que s'il est installé et qu'on est côté
  // serveur. Erreurs silencieusement avalées si Sentry absent.
  if (typeof window !== "undefined") return;
  // String variable pour éviter que TS ne tente de résoudre le module à la compile.
  const mod = "@sentry/nextjs";
  (import(/* webpackIgnore: true */ mod) as Promise<SentryModule>)
    .then((Sentry) => {
      if (err instanceof Error) {
        Sentry.captureException(err, { extra: ctx });
      } else {
        Sentry.captureMessage(String(err), { extra: ctx, level: "error" });
      }
    })
    .catch(() => {
      /* Sentry not installed yet — no-op */
    });
}

export const logger = {
  debug(msg: string, ctx?: LogContext) {
    emit("debug", msg, ctx);
  },
  info(msg: string, ctx?: LogContext) {
    emit("info", msg, ctx);
  },
  warn(msg: string, ctx?: LogContext) {
    emit("warn", msg, ctx);
  },
  error(msg: string, err?: unknown, ctx?: LogContext) {
    const errorCtx =
      err instanceof Error
        ? { error: err.message, stack: err.stack, ...ctx }
        : err !== undefined
          ? { error: String(err), ...ctx }
          : ctx;
    emit("error", msg, errorCtx);
    if (err !== undefined) toSentry(err, ctx);
  },
};
