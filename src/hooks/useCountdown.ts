import { useEffect, useState, useCallback } from "react";

export function useCountdown(initialSeconds: number = 30) {
  const [timer, setTimer] = useState(initialSeconds);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setInterval(() => setTimer((p) => p - 1), 1000);
    return () => clearInterval(t);
  }, [timer]);

  const reset = useCallback(() => setTimer(initialSeconds), [initialSeconds]);

  return { timer, reset, isRunning: timer > 0 };
}
