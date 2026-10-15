import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createStore, openDatabase } from "./db.ts";
import { createGoogleOAuth } from "./google.ts";
import { consoleMailer, createSmtpMailer } from "./mailer.ts";

const config = loadConfig();
const db = openDatabase(config.databasePath);

if (!config.smtp) {
  console.warn("SMTP_HOST is not set: sign-in codes will be printed here instead of emailed.");
}
const mailer = config.smtp ? createSmtpMailer(config.smtp) : consoleMailer;
if (!config.google) {
  console.warn("GOOGLE_CLIENT_ID is not set: Google sign-in will report that it's unavailable.");
}
const google = config.google ? createGoogleOAuth(config.google) : undefined;
const app = createApp(config, { store: createStore(db), mailer, google });

const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`droid247 server listening on http://${info.address}:${info.port}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  // Don't hang forever on keep-alive connections.
  setTimeout(() => process.exit(0), 5000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
