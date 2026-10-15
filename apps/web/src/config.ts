const DEV_API_URL = "http://localhost:8787";

/**
 * Backend base URL, baked in at build time.
 *
 * Desktop and mobile builds can't rely on same-origin requests, so this is
 * always an absolute URL. Set VITE_API_URL for production builds.
 */
export const API_URL: string = import.meta.env.VITE_API_URL || DEV_API_URL;
