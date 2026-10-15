export interface SmtpConfig {
  host: string;
  port: number;
  /** TLS from the first byte (port 465). Otherwise STARTTLS is used when offered. */
  secure: boolean;
  user?: string;
  pass?: string;
  /** `From` header, e.g. `droid247 <you@gmail.com>`. */
  from: string;
}

export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  databasePath: string;
  /** Unset means codes are printed to the console instead of emailed. */
  smtp?: SmtpConfig;
}

const DEFAULT_CORS_ORIGINS = [
  // Vite dev server and `vite preview`
  "http://localhost:5173",
  "http://localhost:4173",
  // Tauri webviews (desktop now, mobile later): macOS/Linux/iOS, then Windows/Android
  "tauri://localhost",
  "http://tauri.localhost",
];

function parsePort(name: string, value: string | undefined, fallback: number): number {
  const port = Number(value ?? fallback);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
  return port;
}

function loadSmtp(env: NodeJS.ProcessEnv): SmtpConfig | undefined {
  if (!env.SMTP_HOST) return undefined;
  const from = env.MAIL_FROM || env.SMTP_USER;
  if (!from) throw new Error("MAIL_FROM (or SMTP_USER) is required when SMTP_HOST is set");
  const port = parsePort("SMTP_PORT", env.SMTP_PORT, 587);
  return {
    host: env.SMTP_HOST,
    port,
    secure: env.SMTP_SECURE ? env.SMTP_SECURE === "true" : port === 465,
    user: env.SMTP_USER || undefined,
    pass: env.SMTP_PASS || undefined,
    from,
  };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    port: parsePort("PORT", env.PORT, 8787),
    host: env.HOST ?? "0.0.0.0",
    corsOrigins: env.CORS_ORIGINS
      ? env.CORS_ORIGINS.split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : DEFAULT_CORS_ORIGINS,
    databasePath: env.DATABASE_PATH || "data/droid247.db",
    smtp: loadSmtp(env),
  };
}
