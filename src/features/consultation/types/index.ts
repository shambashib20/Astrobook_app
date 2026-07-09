// ─── Consultation Service ───────────────────────────────────────────────────
// Koi Premium/Elite tier nahi — sirf ek auto-created "Basic" consultancy
// (platform banata hai upgrade-to-astrologer ke waqt, koi image nahi) +
// astrologer ki apni "normal" services (image + tags ke saath).

export const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;
export type DurationMinutes = (typeof DURATION_OPTIONS)[number];

// Explore ke categories jaisi hi tags (same ids jo (user)/explore/index.tsx
// mein ALL_CATEGORIES mein hain) — consultancy creation ke waqt select karne ke liye
export const SERVICE_TAGS = [
  { id: "numerology", label: "Numerology" },
  { id: "numerology-name", label: "Name Analysis" },
  { id: "vastu", label: "Vastu" },
  { id: "vastu-home", label: "Home Vastu" },
  { id: "vedic-astrology", label: "Vedic Astrology" },
  { id: "kundli", label: "Kundli" },
  { id: "tarot", label: "Tarot" },
  { id: "tarot-love", label: "Tarot Love" },
  { id: "palmistry", label: "Palmistry" },
  { id: "face-reading", label: "Face Reading" },
  { id: "reiki", label: "Reiki" },
  { id: "past-life", label: "Past Life" },
  { id: "meditation", label: "Meditation" },
  { id: "gemstones", label: "Gemstones" },
] as const;
export type ServiceTagId = (typeof SERVICE_TAGS)[number]["id"];

// Matches `consultation_services` table (server/src/core/database/schema/consultation.ts)
export type ConsultationService = {
  id: string;
  astrologerId: string;
  isBasic: boolean;
  title: string;
  shortDescription: string;
  coverImage: string | null; // Basic consultancy ke liye null
  about: string;
  durationMinutes: number;
  // numeric column → drizzle returns as string over JSON
  price: string | null;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Explore category detail page ke liye — kisi bhi astrologer ki service,
// astrologer ka naam bhi joined (server/service.repository.ts findByTag)
export type BrowsedService = {
  id: string;
  astrologerId: string;
  astrologerName: string;
  title: string;
  shortDescription: string;
  coverImage: string | null;
  durationMinutes: number;
  price: string | null;
  tags: string[];
};

// Nayi "normal" service banate waqt — cover image zaroori
export type CreateServicePayload = {
  title: string;
  shortDescription: string;
  coverImage: string;
  about: string;
  durationMinutes: DurationMinutes;
  price?: number;
  tags: string[];
};

// Existing service edit karte waqt (Basic ho ya normal) — sab optional
export type UpdateServicePayload = Partial<CreateServicePayload>;

// ─── Availability Window ────────────────────────────────────────────────────
// Matches `availability_windows` table

export type AvailabilityWindow = {
  id: string;
  astrologerId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAvailabilityPayload = {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  timezone?: string; // defaults to Asia/Kolkata on backend
};

// ─── Slots (user-facing booking) ────────────────────────────────────────────

export type TimeSlot = {
  startTime: string; // ISO string
  endTime: string; // ISO string
  available: boolean;
};

export type GetSlotsQuery = {
  astrologerId: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
};

// ─── Booking / Appointments ─────────────────────────────────────────────────

export const APPOINTMENT_STATUS = [
  "pending",
  "confirmed",
  "ongoing",
  "completed",
  "cancelled",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

export type Appointment = {
  id: string;
  astrologerId: string;
  userId: string;
  serviceId: string;
  parentId: string | null;
  bundleStatus: "in_progress" | "paused" | "completed" | null;
  scheduledAt: string; // ISO
  endsAt: string; // ISO
  durationMinutes: number;
  agoraChannel: string | null;
  agoraToken: string | null;
  status: AppointmentStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InitiateBookingPayload = {
  astrologerId: string;
  serviceId: string;
  scheduledAt: string; // ISO datetime with offset
  notes?: string;
};

export type CancelAppointmentPayload = {
  reason?: string;
};

// ─── Detailed / joined appointment shape ────────────────────────────────────
// Yeh shape `getMyAppointments`, `getSchedule`, `getAppointmentById` se aati hai
// (appointment.repository.ts → baseDetailQuery — service + astrologerName joined).
// `initiateBooking` alag se flat `Appointment` row deta hai (upar wala type).

export type AppointmentServiceSummary = {
  id: string;
  isBasic: boolean;
  title: string;
  coverImage: string | null;
  durationMinutes: number;
  price: string | null;
};

export type AppointmentDetailed = {
  id: string;
  scheduledAt: string; // ISO
  endsAt: string; // ISO
  durationMinutes: number;
  status: AppointmentStatus;
  bundleStatus: "in_progress" | "paused" | "completed" | null;
  parentId: string | null;
  agoraChannel: string | null;
  agoraToken: string | null;
  notes: string | null;
  createdAt: string;
  service: AppointmentServiceSummary;
  astrologerName: string | null;
  // Astrologer-side session list mein client ka naam dikhane ke liye
  userName: string | null;
  astrologerId: string;
  userId: string;
};

export type AppointmentWithChildren = AppointmentDetailed & {
  children: AppointmentDetailed[];
};

// GET /consultation/appointments/mine → { upcoming, ongoing, completed, cancelled }
export type GroupedAppointments = {
  upcoming: AppointmentDetailed[];
  ongoing: AppointmentDetailed[];
  completed: AppointmentDetailed[];
  cancelled: AppointmentDetailed[];
};

// ─── Schedule (astrologer's "today" view) ───────────────────────────────────

export type ScheduleResponse = {
  date: string;
  schedule: AppointmentDetailed[];
};
