const TZ = "Europe/Istanbul";

const dateTime = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const dayMonth = new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, day: "numeric", month: "long" });

export function formatDateTime(date: Date): string {
  return dateTime.format(date);
}

export function formatDayMonth(date: Date): string {
  return dayMonth.format(date);
}

/** "3 saat önce", "dün", "12 Eki" */
export function formatRelative(date: Date, now: Date = new Date()): string {
  const minutes = Math.round((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "az önce";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.round(hours / 24);
  if (days === 1) return "dün";
  if (days < 7) return `${days} gün önce`;
  return new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, day: "numeric", month: "short" }).format(date);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
