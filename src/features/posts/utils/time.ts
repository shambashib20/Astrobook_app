// Comment/post ke liye chhota "kitna pehle" label: abhi, 5m, 3h, 2d, 4w

export function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

export function formatPostDate(iso: string): string {
  const diffMs   = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1)  return "just now";
  if (diffMins < 60) return diffMins === 1 ? "1 min ago" : `${diffMins} mins ago`;

  const hrs = Math.floor(diffMins / 60);
  if (hrs < 24)      return hrs === 1 ? "1 hr ago" : `${hrs} hrs ago`;

  const days = Math.floor(hrs / 24);
  if (days < 7)      return days === 1 ? "1 day ago" : `${days} days ago`;

  // 7 din se zyada → actual date
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}