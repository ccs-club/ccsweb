import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin-auth";
import {
  FacebookPostsUnavailableError,
  getPublishedFacebookPosts,
  isFacebookConfigured,
} from "@/lib/facebook";
import {
  FacebookPostStoreError,
  getSelectedFacebookPostsForRequest,
  removeSelectedFacebookPost,
  saveSelectedFacebookPost,
} from "@/lib/facebook-posts";
import { isFacebookPostId } from "@/lib/facebook-post-types";
import {
  isSameOrigin,
  jsonResponse,
  readRequestText,
  RequestBodyTooLargeError,
} from "@/lib/request-security";

export const runtime = "nodejs";

class InvalidRequestBodyError extends Error {}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const value: unknown = JSON.parse(await readRequestText(request, 4_096));
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      throw new InvalidRequestBodyError();
    }
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) throw error;
    if (error instanceof InvalidRequestBodyError) throw error;
    throw new InvalidRequestBodyError();
  }
}

function invalidBodyError(error: unknown): Response | undefined {
  if (error instanceof RequestBodyTooLargeError) {
    return jsonResponse({ error: "Request is too large." }, 413);
  }
  if (error instanceof InvalidRequestBodyError) {
    return jsonResponse({ error: "Invalid request body." }, 400);
  }
  return undefined;
}

function curationError(error: unknown): Response {
  if (error instanceof FacebookPostStoreError) {
    return jsonResponse({ error: "The Facebook post selection is unavailable." }, 503);
  }
  if (error instanceof FacebookPostsUnavailableError) {
    return jsonResponse({ error: "Facebook Page posts are unavailable." }, 503);
  }

  // Keep Graph request details out of logs because its URL contains the Page token.
  console.error("Facebook post curation request failed");
  return jsonResponse({ error: "Facebook Page posts are unavailable." }, 503);
}

export async function GET(request: Request): Promise<Response> {
  if (!(await isAdmin())) return jsonResponse({ error: "Unauthorized." }, 401);

  let selectedPosts;
  try {
    selectedPosts = await getSelectedFacebookPostsForRequest();
  } catch {
    console.error("Facebook post selection read failed");
    return jsonResponse({ error: "The Facebook post selection is unavailable." }, 503);
  }

  const refresh = new URL(request.url).searchParams.get("refresh") === "1";
  const configured = isFacebookConfigured();
  if (!refresh || !configured) {
    return jsonResponse({ selectedPosts, configured });
  }

  try {
    const posts = await getPublishedFacebookPosts({ forceRefresh: true });
    return jsonResponse({ selectedPosts, posts, configured });
  } catch (error) {
    if (!(error instanceof FacebookPostsUnavailableError)) {
      console.error("Facebook Page post refresh failed");
    }
    return jsonResponse(
      { error: "Facebook Page posts are unavailable.", selectedPosts, configured },
      503,
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!(await isAdmin())) return jsonResponse({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  try {
    const { id } = await readBody(request);
    if (!isFacebookPostId(id)) {
      return jsonResponse({ error: "A Facebook post id is required." }, 400);
    }

    const publishedPosts = await getPublishedFacebookPosts();
    const publishedPost = publishedPosts.find((post) => post.id === id);
    if (!publishedPost) {
      return jsonResponse({ error: "That Page post is no longer available." }, 404);
    }

    const selectedPost = await saveSelectedFacebookPost(publishedPost);
    const selectedPosts = await getSelectedFacebookPostsForRequest();
    revalidatePath("/posts");
    return jsonResponse({ selectedPost, selectedPosts });
  } catch (error) {
    const bodyError = invalidBodyError(error);
    return bodyError || curationError(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!(await isAdmin())) return jsonResponse({ error: "Unauthorized." }, 401);
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: "Invalid request origin." }, 403);
  }

  try {
    const { id } = await readBody(request);
    if (!isFacebookPostId(id)) {
      return jsonResponse({ error: "A Facebook post id is required." }, 400);
    }

    const deleted = await removeSelectedFacebookPost(id);
    if (deleted) revalidatePath("/posts");
    return jsonResponse({ deleted });
  } catch (error) {
    const bodyError = invalidBodyError(error);
    return bodyError || curationError(error);
  }
}
