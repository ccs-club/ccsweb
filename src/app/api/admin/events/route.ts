import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import {
  createEvent,
  deleteEvent,
  EventConflictError,
  EventValidationError,
  getEventsForRequest,
  updateEvent,
} from "@/lib/events";
import {
  isSameOrigin,
  jsonResponse,
  readRequestText,
  RequestBodyTooLargeError,
} from "@/lib/request-security";

export const runtime = "nodejs";

class InvalidRequestBodyError extends Error {}

async function readBody(request: Request): Promise<unknown> {
  try {
    const text = await readRequestText(request, 100_000);
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) throw error;
    throw new InvalidRequestBodyError();
  }
}

function eventPayload(value: unknown): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    "event" in value
  ) {
    return (value as { event: unknown }).event;
  }
  return value;
}

function mutationError(error: unknown): Response {
  if (error instanceof EventConflictError) {
    return jsonResponse(
      { error: "This event changed in another session. Reload the latest version before trying again." },
      409,
    );
  }
  if (error instanceof EventValidationError) {
    return jsonResponse({ error: error.message }, 400);
  }
  if (error instanceof RequestBodyTooLargeError) {
    return jsonResponse({ error: "Request is too large." }, 413);
  }
  if (error instanceof InvalidRequestBodyError) {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }

  console.error("Event store mutation failed", error);
  return jsonResponse(
    { error: "The event store is unavailable. Try again later." },
    503,
  );
}

export async function GET(): Promise<Response> {
  if (!(await isAdmin())) return jsonResponse({ error: "Unauthorized." }, 401);

  try {
    return jsonResponse({ events: await getEventsForRequest() });
  } catch (error) {
    console.error("Event store read failed", error);
    return jsonResponse({ error: "The event store is unavailable." }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!(await isAdmin())) return jsonResponse({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  try {
    const event = await createEvent(eventPayload(await readBody(request)));
    revalidatePath("/events");
    return jsonResponse({ event }, 201);
  } catch (error) {
    return mutationError(error);
  }
}

export async function PUT(request: Request): Promise<Response> {
  if (!(await isAdmin())) return jsonResponse({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  try {
    const body = await readBody(request);
    if (typeof body !== "object" || body === null || !("id" in body)) {
      return jsonResponse({ error: "An event id is required." }, 400);
    }
    const id = (body as { id?: unknown }).id;
    if (typeof id !== "string" || id.length > 80) {
      return jsonResponse({ error: "An event id is required." }, 400);
    }
    const event = await updateEvent(id, eventPayload(body));
    revalidatePath("/events");
    return jsonResponse({ event });
  } catch (error) {
    return mutationError(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!(await isAdmin())) return jsonResponse({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  try {
    const body = await readBody(request);
    const id =
      typeof body === "object" && body !== null && "id" in body
        ? (body as { id?: unknown }).id
        : undefined;
    const revision =
      typeof body === "object" && body !== null && "revision" in body
        ? (body as { revision?: unknown }).revision
        : undefined;
    if (typeof id !== "string" || id.length > 80) {
      return jsonResponse({ error: "An event id is required." }, 400);
    }
    const deleted = await deleteEvent(id, revision);
    revalidatePath("/events");
    return jsonResponse({ deleted });
  } catch (error) {
    return mutationError(error);
  }
}
