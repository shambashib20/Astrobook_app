import type { AvailabilityWindow } from "../types";

// IMPORTANT: time-picker ke liye kabhi `new Date(0, 0, 0, h, m)` mat use karo —
// year 0 → 1900 ho jaata hai aur India ka purana offset (+5:53) aa jaata hai,
// jisse 12:08 AM jaisi ajeeb values dikhti hain. Hamesha AAJ ki date pe setHours().
export function makeTime(hours: number, minutes = 0): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toApiDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toApiTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function timeToMinutes(t: string): number {
  const [h = 0, m = 0] = t.split(":").map(Number);
  return h * 60 + m;
}

export function displayTime(t: string): string {
  const [h = 0, m = 0] = t.split(":").map(Number);
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}

export function durationLabel(start: string, end: string): string {
  const mins = timeToMinutes(end) - timeToMinutes(start);
  if (mins <= 0) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} ghanta`;
  return `${h} ghanta ${m} min`;
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseDate(s: string): Date {
  return new Date(`${s}T00:00:00`);
}

/** "8 Oct" */
export function shortDate(s: string): string {
  const d = parseDate(s);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Aaj" / "Kal" / "Wed" */
export function dayName(s: string, now = new Date()): string {
  const today = toApiDate(now);
  if (s === today) return "Aaj";
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (s === toApiDate(tomorrow)) return "Kal";
  return DAYS[parseDate(s).getDay()];
}

/** "Wed, 8 Oct" — Aaj/Kal ke saath date bhi, jaise "Aaj · 3 Oct" */
export function dayTitle(s: string, now = new Date()): string {
  const name = dayName(s, now);
  return name === "Aaj" || name === "Kal" ? `${name} · ${shortDate(s)}` : `${name}, ${shortDate(s)}`;
}

/** Aaj se shuru hone wale `count` din (API date strings) */
export function upcomingDays(count: number, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    return toApiDate(d);
  });
}

export type DayGroup = { date: string; windows: AvailabilityWindow[] };

/** Sirf aage ke (abhi tak khatam na hue) active specific_open slots, din-wise grouped + sorted */
export function groupUpcoming(windows: AvailabilityWindow[], now = new Date()): DayGroup[] {
  const today = toApiDate(now);
  const nowTime = toApiTime(now);
  const map = new Map<string, AvailabilityWindow[]>();
  for (const w of windows) {
    if (!w.isActive) continue;
    if (w.windowType === 'specific_blocked') continue; // blocked rows dashboard mein nahi dikhte
    const endT = w.endTime ?? '23:59';
    const upcoming = w.date > today || (w.date === today && endT.slice(0, 5) > nowTime);
    if (!upcoming) continue;
    if (!map.has(w.date)) map.set(w.date, []);
    map.get(w.date)!.push(w);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ws]) => ({
      date,
      windows: ws.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? '')),
    }));
}

export const TIME_PRESETS = [
  { label: "Subah", start: [9, 0], end: [12, 0] },
  { label: "Dopahar", start: [12, 0], end: [16, 0] },
  { label: "Shaam", start: [16, 0], end: [20, 0] },
  { label: "Raat", start: [20, 0], end: [23, 0] },
] as const;

/** Form validation — pehla error message ya null */
export function validateSlot(
  dates: string[],
  start: string,
  end: string,
  existing: AvailabilityWindow[],
  now = new Date(),
): string | null {
  if (dates.length === 0) return "Select at least one day";
  if (timeToMinutes(start) >= timeToMinutes(end)) return "End time must be after start time";
  const today = toApiDate(now);
  if (dates.includes(today) && timeToMinutes(start) <= now.getHours() * 60 + now.getMinutes()) {
    return "Cannot create a slot for a time that has already passed today";
  }
  for (const date of [...dates].sort()) {
    const clash = existing.find(
      (w) =>
        w.isActive &&
        w.date === date &&
        w.startTime != null &&
        w.endTime != null &&
        rangesOverlap(start, end, w.startTime, w.endTime),
    );
    if (clash) {
      return `A slot already exists on ${dayTitle(date, now)} from ${displayTime(clash.startTime ?? "")} – ${displayTime(clash.endTime ?? "")}`;
    }
  }
  return null;
}