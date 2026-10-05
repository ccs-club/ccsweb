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

const STATUS_ORDER: Record<EventStatus, number> = {
  upcoming: 0,
  ongoing: 1,
  ended: 2,
};

/* Upcoming first by soonest date, ended last by newest date first. Shared by
   the server store and the admin list; lives here because the store module
   imports node:fs and cannot enter a client bundle. */
export function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const statusDifference = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDifference !== 0) return statusDifference;

    const dateDifference = a.date.localeCompare(b.date);
    return STATUS_ORDER[a.status] === STATUS_ORDER.ended
      ? -dateDifference
      : dateDifference;
  });
}
