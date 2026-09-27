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
  readRequestText,
  RequestBodyTooLargeError,
} from "@/lib/request-security";

export const runtime = "nodejs";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

class InvalidRequestBodyError extends Error {}

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

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
    return response(
      { error: "This event changed in another session. Reload the latest version before trying again." },
      409,
    );
  }
  if (error instanceof EventValidationError) {
    return response({ error: error.message }, 400);
  }
  if (error instanceof RequestBodyTooLargeError) {
    return response({ error: "Request is too large." }, 413);
  }
  if (error instanceof InvalidRequestBodyError) {
    return response({ error: "Invalid request body." }, 400);
  }

  console.error("Event store mutation failed", error);
  return response(
    { error: "The event store is unavailable. Try again later." },
    503,
  );
}

export async function GET(): Promise<Response> {
  if (!(await isAdmin())) return response({ error: "Unauthorized." }, 401);

  try {
    return response({ events: await getEventsForRequest() });
  } catch (error) {
    console.error("Event store read failed", error);
    return response({ error: "The event store is unavailable." }, 503);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!(await isAdmin())) return response({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) {
    return response({ error: "Invalid request origin." }, 403);
  }

  try {
    const event = await createEvent(eventPayload(await readBody(request)));
    revalidatePath("/events");
    return response({ event }, 201);
  } catch (error) {
    return mutationError(error);
  }
}

export async function PUT(request: Request): Promise<Response> {
  if (!(await isAdmin())) return response({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) {
    return response({ error: "Invalid request origin." }, 403);
  }

  try {
    const body = await readBody(request);
    if (typeof body !== "object" || body === null || !("id" in body)) {
      return response({ error: "An event id is required." }, 400);
    }
    const id = (body as { id?: unknown }).id;
    if (typeof id !== "string" || id.length > 80) {
      return response({ error: "An event id is required." }, 400);
    }
    const event = await updateEvent(id, eventPayload(body));
    revalidatePath("/events");
    return response({ event });
  } catch (error) {
    return mutationError(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!(await isAdmin())) return response({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) {
    return response({ error: "Invalid request origin." }, 403);
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
      return response({ error: "An event id is required." }, 400);
    }
    const deleted = await deleteEvent(id, revision);
    revalidatePath("/events");
    return response({ deleted });
  } catch (error) {
    return mutationError(error);
  }
}
