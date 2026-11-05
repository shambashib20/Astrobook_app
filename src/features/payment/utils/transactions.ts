import type { Transaction } from "../service";

export type PeriodKey = "all" | "7d" | "month" | "lastMonth";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "7d", label: "Last 7 days" },
  { key: "month", label: "This month" },
  { key: "lastMonth", label: "Last month" },
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function inPeriod(iso: string, period: PeriodKey, now = new Date()): boolean {
  if (period === "all") return true;
  const t = new Date(iso).getTime();
  if (period === "7d") return t >= startOfDay(now).getTime() - 6 * 86400000;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  if (period === "month") return t >= monthStart;
  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  return t >= lastStart && t < monthStart;
}

export function filterTransactions(
  list: Transaction[],
  period: PeriodKey,
  query: string,
): Transaction[] {
  const q = query.trim().toLowerCase();
  return list.filter((t) => {
    if (!inPeriod(t.createdAt, period)) return false;
    if (!q) return true;
    return (
      (t.clientName ?? "").toLowerCase().includes(q) ||
      (t.serviceTitle ?? "").toLowerCase().includes(q)
    );
  });
}

export const sumAmount = (list: Transaction[]) =>
  list.reduce((s, t) => s + Number(t.amount || 0), 0);

export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86400000);
  if (diff === 0) return "Aaj";
  if (diff === 1) return "Kal";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: d.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

export function groupByDay(list: Transaction[]): { title: string; data: Transaction[] }[] {
  const sections: { title: string; data: Transaction[] }[] = [];
  for (const t of list) {
    const title = dayLabel(t.createdAt);
    const last = sections[sections.length - 1];
    if (last && last.title === title) last.data.push(t);
    else sections.push({ title, data: [t] });
  }
  return sections;
}

export const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });

export const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
