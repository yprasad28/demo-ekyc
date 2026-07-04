import { useState, useCallback } from "react";

interface ApiCallState<T> {
  loading: boolean;
  error: string;
  data: T | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useApiCall<T = any>() {
  const [state, setState] = useState<ApiCallState<T>>({
    loading: false,
    error: "",
    data: null,
  });

  const call = useCallback(
    async (
      url: string,
      options?: RequestInit
    ): Promise<{ ok: boolean; data: T | null }> => {
      setState({ loading: true, error: "", data: null });
      try {
        const res = await fetch(url, options);
        const data = await res.json();
        if (!res.ok) {
          setState({ loading: false, error: data.error || "Request failed.", data: null });
          return { ok: false, data: null };
        }
        setState({ loading: false, error: "", data });
        return { ok: true, data };
      } catch {
        setState({ loading: false, error: "Network error. Please try again.", data: null });
        return { ok: false, data: null };
      }
    },
    []
  );

  const setError = useCallback((error: string) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: "", data: null });
  }, []);

  return { ...state, call, setError, reset };
}
