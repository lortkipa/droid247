export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
}

const DEFAULT_CORS_ORIGINS = [
  // Vite dev server and `vite preview`
  "http://localhost:5173",
  "http://localhost:4173",
  // Tauri webviews (desktop now, mobile later): macOS/Linux/iOS, then Windows/Android
  "tauri://localhost",
  "http://tauri.localhost",
];

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const port = Number(env.PORT ?? 8787);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${env.PORT}`);
  }
  return {
    port,
    host: env.HOST ?? "0.0.0.0",
    corsOrigins: env.CORS_ORIGINS
      ? env.CORS_ORIGINS.split(",")
          .map((o) => o.trim())
          .filter(Boolean)
      : DEFAULT_CORS_ORIGINS,
  };
}
