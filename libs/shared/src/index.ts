export const MINUTE_MS = 60_000;

export function formatRemaining(availableAt: string | undefined, now = Date.now()): string | null {
  if (!availableAt) return null;
  const seconds = Math.ceil((new Date(availableAt).getTime() - now) / 1_000);
  if (seconds <= 0) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
