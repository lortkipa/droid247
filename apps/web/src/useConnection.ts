import { ApiError, type HealthResult } from "@droid247/client";
import { useCallback, useEffect, useState } from "react";
import { api } from "./api.ts";

export type ConnectionState =
  | { status: "checking" }
  | { status: "connected"; result: HealthResult }
  | { status: "error"; message: string };

export function useConnection() {
  const [state, setState] = useState<ConnectionState>({ status: "checking" });

  const check = useCallback(async (signal?: { cancelled: boolean }) => {
    setState({ status: "checking" });
    try {
      const result = await api.health();
      if (!signal?.cancelled) setState({ status: "connected", result });
    } catch (err) {
      if (signal?.cancelled) return;
      const message = err instanceof ApiError ? err.message : "Unexpected error";
      setState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    check(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [check]);

  return { state, apiUrl: api.baseUrl, retry: () => check() };
}
