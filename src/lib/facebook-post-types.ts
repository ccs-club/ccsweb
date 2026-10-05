export type FacebookPost = {
  id: string;
  message: string;
  createdTime: string;
  permalinkUrl: string;
  fullPicture?: string;
};

const MAX_MESSAGE_LENGTH = 12_000;
const MAX_URL_LENGTH = 2_000;
const POST_ID_PATTERN = /^\d{5,30}(?:_\d{5,30})?$/;
const CREATED_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFacebookHostname(hostname: string): boolean {
  return hostname === "facebook.com" || hostname.endsWith(".facebook.com");
}

function isFacebookImageHostname(hostname: string): boolean {
  return (
    isFacebookHostname(hostname) ||
    hostname === "fbcdn.net" ||
    hostname.endsWith(".fbcdn.net") ||
    hostname === "facebook.net" ||
    hostname.endsWith(".facebook.net") ||
    hostname === "fbsbx.com" ||
    hostname.endsWith(".fbsbx.com")
  );
}

function isTrustedUrl(value: string, hostname: (value: string) => boolean): boolean {
  if (value.length === 0 || value.length > MAX_URL_LENGTH || /[\0\r\n]/.test(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      hostname(url.hostname.toLowerCase())
    );
  } catch {
    return false;
  }
}

export function isFacebookPostId(value: unknown): value is string {
  return typeof value === "string" && POST_ID_PATTERN.test(value);
}

export function isFacebookPermalink(value: unknown): value is string {
  return typeof value === "string" && isTrustedUrl(value, isFacebookHostname);
}

export function isFacebookImageUrl(value: unknown): value is string {
  return typeof value === "string" && isTrustedUrl(value, isFacebookImageHostname);
}

/** Normalizes the small, public-safe subset of a Page post that the site stores. */
export function normalizeFacebookPost(value: unknown): FacebookPost | null {
  if (!isRecord(value)) return null;
  if (!isFacebookPostId(value.id) || !isFacebookPermalink(value.permalinkUrl)) {
    return null;
  }
  if (typeof value.createdTime !== "string" || !CREATED_TIME_PATTERN.test(value.createdTime)) {
    return null;
  }
  if (Number.isNaN(Date.parse(value.createdTime))) return null;

  const rawMessage = value.message;
  if (rawMessage !== undefined && rawMessage !== null && typeof rawMessage !== "string") {
    return null;
  }
  const message = typeof rawMessage === "string" ? rawMessage.trim() : "";
  if (message.length > MAX_MESSAGE_LENGTH || message.includes("\0")) return null;

  const rawPicture = value.fullPicture;
  if (rawPicture !== undefined && rawPicture !== null && rawPicture !== "") {
    if (!isFacebookImageUrl(rawPicture)) return null;
    return {
      id: value.id,
      message,
      createdTime: value.createdTime,
      permalinkUrl: value.permalinkUrl,
      fullPicture: rawPicture,
    };
  }

  return {
    id: value.id,
    message,
    createdTime: value.createdTime,
    permalinkUrl: value.permalinkUrl,
  };
}

/** Converts a Graph API record without retaining fields the public site does not use. */
export function facebookPostFromGraph(value: unknown): FacebookPost | null {
  if (!isRecord(value)) return null;
  return normalizeFacebookPost({
    id: value.id,
    message: value.message,
    createdTime: value.created_time,
    permalinkUrl: value.permalink_url,
    fullPicture: value.full_picture,
  });
}
