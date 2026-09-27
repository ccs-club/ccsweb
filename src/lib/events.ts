import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
import {
  EVENT_STATUSES,
  EVENT_TYPES,
  type Event,
  type EventStatus,
  type EventType,
} from "./event-types";

const DEFAULT_EVENTS_FILE = path.join(process.cwd(), "data", "events.json");
const EVENTS_FILE_CONFIGURED = Boolean(process.env.EVENTS_FILE_PATH);
const EVENTS_FILE = path.resolve(
  /*turbopackIgnore: true*/
  process.env.EVENTS_FILE_PATH || DEFAULT_EVENTS_FILE,
);
const MAX_EVENTS = 500;

const STATUS_ORDER: Record<EventStatus, number> = {
  upcoming: 0,
  ongoing: 1,
  ended: 2,
};

export class EventValidationError extends Error {
  constructor(message: string) {
    super(`Invalid event data: ${message}`);
    this.name = "EventValidationError";
  }
}

export class EventConflictError extends Error {
  constructor(id: string) {
    super(`Event ${id} changed before this update was saved.`);
    this.name = "EventConflictError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fail(message: string): never {
  throw new EventValidationError(message);
}

function requiredString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
): string {
  const value = record[key];
  if (typeof value !== "string" || !value.trim()) {
    fail(`${key} is required`);
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    fail(`${key} must be ${maxLength} characters or fewer`);
  }

  return trimmed;
}

function optionalString(
  record: Record<string, unknown>,
  key: string,
  maxLength: number,
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") fail(`${key} must be a string`);

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > maxLength) {
    fail(`${key} must be ${maxLength} characters or fewer`);
  }

  return trimmed;
}

function parseDate(value: unknown, key: string): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${key} must be an ISO date in YYYY-MM-DD format`);
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    fail(`${key} is not a valid calendar date`);
  }

  return value;
}

function parseOptionalDate(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === "") return undefined;
  return parseDate(value, key);
}

function parseRevision(value: unknown, required: boolean): number | undefined {
  if (value === undefined || value === null) {
    if (required) fail("revision is required");
    return undefined;
  }
  if (!Number.isSafeInteger(value) || (value as number) < 1) {
    fail("revision must be a positive integer");
  }
  return value as number;
}

function parseId(value: unknown, required: boolean): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) fail("id is required");
    return undefined;
  }

  if (typeof value !== "string") fail("id must be a string");
  const id = value.trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 80) {
    fail("id must contain lowercase letters, numbers and hyphens only");
  }
  return id;
}

function parseType(value: unknown): EventType {
  if (typeof value !== "string" || !EVENT_TYPES.includes(value as EventType)) {
    fail(`type must be one of: ${EVENT_TYPES.join(", ")}`);
  }
  return value as EventType;
}

function parseStatus(value: unknown): EventStatus {
  if (
    typeof value !== "string" ||
    !EVENT_STATUSES.includes(value as EventStatus)
  ) {
    fail(`status must be one of: ${EVENT_STATUSES.join(", ")}`);
  }
  return value as EventStatus;
}

function parseTags(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > 12) {
    fail("tags must be an array with 12 items or fewer");
  }

  const tags = value.map((tag) => {
    if (typeof tag !== "string" || !tag.trim() || tag.trim().length > 24) {
      fail("each tag must be a non-empty string of 24 characters or fewer");
    }
    return tag.trim();
  });

  return [...new Set(tags)];
}

function parseOptionalUrl(value: unknown, key: string): string | undefined {
  const url = optionalString({ [key]: value }, key, 500);
  if (!url) return undefined;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      fail(`${key} must use http or https`);
    }
  } catch {
    fail(`${key} must be a valid URL`);
  }

  return url;
}

function parseCoverImage(value: unknown): string | undefined {
  const image = optionalString({ coverImage: value }, "coverImage", 240);
  if (!image) return undefined;

  let decoded: string;
  try {
    decoded = decodeURIComponent(image);
  } catch {
    fail("coverImage must be a valid local path");
  }

  const normalized = path.posix.normalize(decoded);
  if (
    decoded.includes("\\") ||
    decoded.includes("\0") ||
    decoded.includes("?") ||
    decoded !== normalized ||
    !normalized.startsWith("/events/") ||
    normalized.split("/").includes("..") ||
    !/\.(avif|gif|jpe?g|png|webp)$/i.test(normalized)
  ) {
    fail("coverImage must be a local image path under /events/");
  }

  return normalized;
}

type EventFields = Omit<Event, "id" | "revision">;

function parseFields(value: unknown): EventFields {
  if (!isRecord(value)) fail("event must be an object");

  const date = parseDate(value.date, "date");
  const endDate = parseOptionalDate(value, "endDate");
  if (endDate && endDate < date) {
    fail("endDate cannot be before date");
  }

  const featured = value.featured;
  if (featured !== undefined && typeof featured !== "boolean") {
    fail("featured must be a boolean");
  }

  return {
    type: parseType(value.type),
    title: requiredString(value, "title", 120),
    titleMn: requiredString(value, "titleMn", 120),
    summary: requiredString(value, "summary", 600),
    summaryMn: requiredString(value, "summaryMn", 600),
    date,
    endDate,
    location: optionalString(value, "location", 120),
    locationMn: optionalString(value, "locationMn", 120),
    format: optionalString(value, "format", 120),
    formatMn: optionalString(value, "formatMn", 120),
    teamSize: optionalString(value, "teamSize", 80),
    teamSizeMn: optionalString(value, "teamSizeMn", 80),
    prize: optionalString(value, "prize", 120),
    prizeMn: optionalString(value, "prizeMn", 120),
    registrationUrl: parseOptionalUrl(value.registrationUrl, "registrationUrl"),
    status: parseStatus(value.status),
    tags: parseTags(value.tags),
    coverImage: parseCoverImage(value.coverImage),
    featured: featured ?? false,
  };
}

function parseEvent(value: unknown): Event {
  if (!isRecord(value)) fail("event must be an object");
  const id = parseId(value.id, true);
  const revision = value.revision === undefined ? 1 : parseRevision(value.revision, true);
  return { id: id as string, ...parseFields(value), revision: revision as number };
}

function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const statusDifference = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDifference !== 0) return statusDifference;

    const dateDifference = a.date.localeCompare(b.date);
    return STATUS_ORDER[a.status] === STATUS_ORDER.ended
      ? -dateDifference
      : dateDifference;
  });
}

function keepOneFeaturedEvent(events: Event[], preferredId?: string): Event[] {
  const featuredId =
    events.find((event) => event.id === preferredId && event.featured)?.id ??
    events.find((event) => event.featured)?.id;

  return events.map((event) => {
    if (!event.featured || event.id === featuredId) return event;
    return { ...event, featured: false, revision: event.revision + 1 };
  });
}

async function readEventsFromDisk(): Promise<Event[]> {
  let source: string;
  try {
    source = await fs.readFile(/*turbopackIgnore: true*/ EVENTS_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (EVENTS_FILE_CONFIGURED) {
        throw new Error("The configured events file is missing.");
      }
      return [];
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error(`Unable to parse events file at ${EVENTS_FILE}`);
  }

  const values = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.events)
      ? parsed.events
      : null;
  if (!values) throw new Error("Events file must contain an array of events");

  return sortEvents(
    values.map((value, index) => {
      try {
        return parseEvent(value);
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        throw new Error(`Event ${index + 1}: ${message}`);
      }
    }),
  );
}

async function writeEventsToDisk(events: Event[]): Promise<void> {
  await fs.mkdir(path.dirname(EVENTS_FILE), { recursive: true });
  const temporaryFile = `${EVENTS_FILE}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(
    temporaryFile,
    `${JSON.stringify(sortEvents(events), null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await fs.rename(temporaryFile, EVENTS_FILE);
}

let mutationQueue: Promise<void> = Promise.resolve();

function mutateEvents<T>(
  mutator: (events: Event[]) => Promise<{ events: Event[]; result: T }> | { events: Event[]; result: T },
): Promise<T> {
  const operation = mutationQueue.then(async () => {
    const current = await readEventsFromDisk();
    const next = await mutator(current);
    await writeEventsToDisk(next.events);
    return next.result;
  });

  mutationQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

/** Read fresh event data for a page render. */
export async function getEvents(): Promise<Event[]> {
  await connection();
  return readEventsFromDisk();
}

/** Read fresh event data for a request-time API handler. */
export function getEventsForRequest(): Promise<Event[]> {
  return readEventsFromDisk();
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function availableId(base: string, current: Event[]): string {
  let candidate = base.slice(0, 80).replace(/-+$/g, "") || "event";
  let suffix = 2;

  while (current.some((event) => event.id === candidate)) {
    const suffixText = `-${suffix}`;
    const prefix = base.slice(0, 80 - suffixText.length).replace(/-+$/g, "");
    candidate = `${prefix || "event"}${suffixText}`;
    suffix += 1;
  }

  return parseId(candidate, true) as string;
}

async function assertCoverImageExists(coverImage: string | undefined): Promise<void> {
  if (!coverImage) return;

  const publicRoot = await fs.realpath(path.join(process.cwd(), "public"));
  const relativePath = coverImage.slice("/events/".length);
  let filePath: string;
  try {
    filePath = await fs.realpath(path.join(publicRoot, "events", relativePath));
  } catch {
    fail("coverImage file does not exist");
  }

  if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) {
    fail("coverImage must stay inside /events/");
  }

  const stat = await fs.stat(filePath);
  if (!stat.isFile()) fail("coverImage must point to a file");
}

export function createEvent(value: unknown): Promise<Event> {
  return mutateEvents(async (current) => {
    if (current.length >= MAX_EVENTS) {
      fail(`no more than ${MAX_EVENTS} events can be stored`);
    }
    const fields = parseFields(value);
    await assertCoverImageExists(fields.coverImage);
    const requestedId = isRecord(value) ? parseId(value.id, false) : undefined;
    const baseId =
      requestedId ||
      `${slugify(fields.title)}-${fields.date}`.replace(/^-+|-+$/g, "");
    const id = availableId(baseId || "event", current);

    const event: Event = { id, ...fields, revision: 1 };
    const events = keepOneFeaturedEvent(
      [...current, event],
      event.featured ? event.id : undefined,
    );
    return { events, result: event };
  });
}

export function updateEvent(id: string, value: unknown): Promise<Event> {
  return mutateEvents(async (current) => {
    const index = current.findIndex((event) => event.id === id);
    if (index === -1) fail(`event ${id} was not found`);
    if (!isRecord(value)) fail("event must be an object");

    const submittedRevision = parseRevision(value.revision, true) as number;
    if (current[index].revision !== submittedRevision) {
      throw new EventConflictError(id);
    }

    const fields = parseFields(value);
    await assertCoverImageExists(fields.coverImage);
    const event: Event = {
      id,
      ...fields,
      revision: current[index].revision + 1,
    };
    const events = [...current];
    events[index] = event;
    return {
      events: keepOneFeaturedEvent(events, event.featured ? event.id : undefined),
      result: event,
    };
  });
}

export function deleteEvent(
  id: string,
  expectedRevision: unknown,
): Promise<boolean> {
  const submittedRevision = parseRevision(expectedRevision, true) as number;

  return mutateEvents((current) => {
    const index = current.findIndex((event) => event.id === id);
    if (index === -1) return { events: current, result: false };
    if (current[index].revision !== submittedRevision) {
      throw new EventConflictError(id);
    }

    const events = current.filter((event) => event.id !== id);
    return {
      events: keepOneFeaturedEvent(events),
      result: true,
    };
  });
}
