function tzAbbr(date: Date): string {
  const parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(date);
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}

export function getUserTimezone(): string {
  const now = new Date();
  const abbr = tzAbbr(now);
  const offset = -now.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const h = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const m = String(Math.abs(offset) % 60).padStart(2, '0');
  return `${abbr}, UTC${sign}${h}:${m}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const formatted = d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatted} ${tzAbbr(d)}`;
}

export function formatDateTimeLong(iso: string): string {
  const d = new Date(iso);
  const formatted = d.toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatted} ${tzAbbr(d)}`;
}

export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${date}, ${time} ${tzAbbr(d)}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const formatted = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${formatted} ${tzAbbr(d)}`;
}

export function formatMonth(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short' });
}
