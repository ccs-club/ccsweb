import {
  facebookPostFromGraph,
  type FacebookPost,
} from "./facebook-post-types";

const GRAPH_VERSION = "v26.0";
const GRAPH_ORIGIN = "https://graph.facebook.com";
const POSTS_LIMIT = 25;
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;

type FacebookConfig = {
  pageId: string;
  accessToken: string;
};

type CachedPosts = {
  expiresAt: number;
  posts: FacebookPost[];
};

let cachedPosts: CachedPosts | undefined;
let pendingRequest: Promise<FacebookPost[]> | undefined;

export class FacebookPostsUnavailableError extends Error {
  constructor() {
    super("Facebook Page posts are unavailable.");
    this.name = "FacebookPostsUnavailableError";
  }
}

function getFacebookConfig(): FacebookConfig | undefined {
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim();
  const accessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN?.trim();
  if (
    !pageId ||
    !/^\d{5,30}$/.test(pageId) ||
    !accessToken ||
    accessToken.length > 4_096 ||
    /[\s\0]/.test(accessToken)
  ) {
    return undefined;
  }

  return { pageId, accessToken };
}

export function isFacebookConfigured(): boolean {
  return Boolean(getFacebookConfig());
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function requestPublishedPosts(config: FacebookConfig): Promise<FacebookPost[]> {
  const url = new URL(`${GRAPH_ORIGIN}/${GRAPH_VERSION}/${config.pageId}/published_posts`);
  url.search = new URLSearchParams({
    fields: "id,message,created_time,permalink_url,full_picture",
    limit: String(POSTS_LIMIT),
    access_token: config.accessToken,
  }).toString();

  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    // Do not retain or log the request URL: it contains the Page access token.
    throw new FacebookPostsUnavailableError();
  }

  if (!response.ok) throw new FacebookPostsUnavailableError();

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new FacebookPostsUnavailableError();
  }
  if (!isRecord(body) || !Array.isArray(body.data)) {
    throw new FacebookPostsUnavailableError();
  }

  return body.data
    .map(facebookPostFromGraph)
    .filter((post): post is FacebookPost => post !== null);
}

/**
 * Reads recent Page-authored posts. Results stay in this server instance for
 * five minutes; callers can force an intentional admin refresh.
 */
export async function getPublishedFacebookPosts({
  forceRefresh = false,
}: {
  forceRefresh?: boolean;
} = {}): Promise<FacebookPost[]> {
  const now = Date.now();
  if (!forceRefresh && cachedPosts && cachedPosts.expiresAt > now) {
    return cachedPosts.posts;
  }
  if (pendingRequest) return pendingRequest;

  const config = getFacebookConfig();
  if (!config) throw new FacebookPostsUnavailableError();

  pendingRequest = requestPublishedPosts(config)
    .then((posts) => {
      cachedPosts = { posts, expiresAt: Date.now() + CACHE_TTL_MS };
      return posts;
    })
    .finally(() => {
      pendingRequest = undefined;
    });

  return pendingRequest;
}
