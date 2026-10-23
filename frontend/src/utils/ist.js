// Every user-visible match time is formatted in India Standard Time,
// never in the browser's own timezone.
const TZ = "Asia/Kolkata";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  day: "numeric",
  month: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

function parts(iso) {
  const out = {};
  for (const p of formatter.formatToParts(new Date(iso))) out[p.type] = p.value;
  return out;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const p = parts(iso);
  return `${p.day} ${MONTHS[Number(p.month) - 1]} ${p.year}`;
}

export function formatTime(iso) {
  if (!iso) return "—";
  const p = parts(iso);
  return `${p.hour}:${p.minute} ${String(p.dayPeriod).toUpperCase()} IST`;
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function formatDuration(seconds) {
  if (seconds == null) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
