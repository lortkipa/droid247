/**
 * Version of the HTTP contract between clients and the server.
 *
 * Bump the major when a change breaks existing clients. Desktop and mobile
 * builds update slower than the server, so clients refuse to talk to a server
 * whose major differs from theirs and tell the user to update.
 */
export const API_VERSION = "1.0";

export function apiMajor(version: string): number {
  return Number.parseInt(version.split(".")[0] ?? "", 10);
}

export function isCompatibleApiVersion(serverVersion: string, clientVersion = API_VERSION) {
  return apiMajor(serverVersion) === apiMajor(clientVersion);
}
