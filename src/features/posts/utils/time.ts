// Comment/post ke liye chhota "kitna pehle" label: abhi, 5m, 3h, 2d, 4w

// Always parse as UTC — backend stores UTC but sometimes omits the Z suffix,
// which causes JS to treat the timestamp as local time and breaks diff math.
function parseUTC(iso: string): Date {
  if (!iso) return new Date(NaN);
  const normalized =
    iso.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(iso) ? iso : iso + "Z";
  return new Date(normalized);
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - parseUTC(iso).getTime();
  if (isNaN(ms) || ms < 0) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export function formatPostDate(iso: string): string {
  const ms = Date.now() - parseUTC(iso).getTime();
  if (isNaN(ms) || ms < 0) return "just now";
  const diffMins = Math.floor(ms / 60_000);

  if (diffMins < 1)  return "just now";
  if (diffMins < 60) return diffMins === 1 ? "1 min ago" : `${diffMins} mins ago`;

  const hrs = Math.floor(diffMins / 60);
  if (hrs < 24)      return hrs === 1 ? "1 hr ago" : `${hrs} hrs ago`;

  const days = Math.floor(hrs / 24);
  if (days < 30)     return days === 1 ? "1 day ago" : `${days} days ago`;

  // 30 din se zyada → actual date
  return parseUTC(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}