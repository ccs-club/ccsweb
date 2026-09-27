export const EVENT_TYPES = [
  "must-ctf",
  "ctf-duel",
  "ctf-competition",
  "banksec",
  "workshop",
  "ctf-night",
  "other",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_STATUSES = ["upcoming", "ongoing", "ended"] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export type Event = {
  id: string;
  type: EventType;
  title: string;
  titleMn: string;
  summary: string;
  summaryMn: string;
  /** ISO date in YYYY-MM-DD format. */
  date: string;
  endDate?: string;
  location?: string;
  locationMn?: string;
  format?: string;
  formatMn?: string;
  teamSize?: string;
  teamSizeMn?: string;
  prize?: string;
  prizeMn?: string;
  registrationUrl?: string;
  status: EventStatus;
  tags: string[];
  /** A local path under /public, never a remote Drive URL. */
  coverImage?: string;
  featured: boolean;
  revision: number;
};

export type EventDraft = Omit<Event, "id" | "revision"> & {
  id?: string;
  revision?: number;
};
