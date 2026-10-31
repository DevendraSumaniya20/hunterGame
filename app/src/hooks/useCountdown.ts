import { useEffect, useState } from 'react';

const secsLeft = (endsAt: number | null) =>
  endsAt ? Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)) : 0;

/** Seconds left until `endsAt` (epoch ms), ticking every second. */
export function useCountdown(endsAt: number | null): number {
  const [secs, setSecs] = useState(() => secsLeft(endsAt));
  useEffect(() => {
    setSecs(secsLeft(endsAt));
    if (!endsAt) return;
    const id = setInterval(() => setSecs(secsLeft(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return secs;
}

export const formatClock = (secs: number) =>
  `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
