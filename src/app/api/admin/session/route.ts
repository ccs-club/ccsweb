import {
  clearAdminSession,
  isAdmin,
  isAdminConfigured,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import {
  clearLoginFailures,
  reserveLoginAttempt,
} from "@/lib/rate-limit";
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

function response(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

function getClientKey(request: Request): string {
  const forwarded = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return forwarded?.at(-1) || request.headers.get("x-real-ip") || "unknown";
}

export async function GET(): Promise<Response> {
  return response({
    authenticated: await isAdmin(),
    configured: isAdminConfigured(),
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return response({ error: "Invalid request origin." }, 403);
  }
  if (!isAdminConfigured()) {
    return response(
      { error: "Admin authentication is not configured on this server." },
      503,
    );
  }

  const clientKey = getClientKey(request);
  let body: unknown;
  try {
    const text = await readRequestText(request, 4096);
    body = JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return response({ error: "Request is too large." }, 413);
    }
    return response({ error: "Invalid request body." }, 400);
  }

  const password =
    typeof body === "object" && body !== null && "password" in body
      ? (body as { password?: unknown }).password
      : undefined;
  if (typeof password !== "string" || password.length > 256) {
    return response({ error: "Enter the admin password." }, 400);
  }

  const attempt = reserveLoginAttempt(clientKey);
  if (!attempt.allowed) {
    return response(
      { error: "Too many login attempts. Try again later." },
      429,
      { "Retry-After": String(attempt.retryAfterSeconds) },
    );
  }

  if (!verifyAdminPassword(password)) {
    return response({ error: "Invalid password." }, 401);
  }

  clearLoginFailures(clientKey);
  await setAdminSession();
  return response({ authenticated: true });
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) {
    return response({ error: "Invalid request origin." }, 403);
  }
  await clearAdminSession();
  return response({ authenticated: false });
}
