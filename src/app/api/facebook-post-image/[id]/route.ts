import { getSelectedFacebookPostForRequest } from "@/lib/facebook-posts";
import { isFacebookImageUrl } from "@/lib/facebook-post-types";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_CONTENT_TYPE = /^image\/(?:avif|gif|jpe?g|png|webp)$/i;
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

function unavailableImage(): Response {
  return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
}

async function fetchTrustedImage(source: string): Promise<Response | undefined> {
  let url = source;
  for (let redirect = 0; redirect < 4; redirect += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      return undefined;
    }

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    if (!location) return undefined;
    try {
      const nextUrl = new URL(location, url).toString();
      if (!isFacebookImageUrl(nextUrl)) return undefined;
      url = nextUrl;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

async function readImage(response: Response): Promise<Uint8Array | undefined> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength) {
    const length = Number(declaredLength);
    if (!Number.isSafeInteger(length) || length < 0 || length > MAX_IMAGE_BYTES) {
      return undefined;
    }
  }
  if (!response.body) return undefined;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const image = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    image.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return image;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  let post;
  try {
    post = await getSelectedFacebookPostForRequest(id);
  } catch {
    return unavailableImage();
  }
  if (!post?.fullPicture || !isFacebookImageUrl(post.fullPicture)) {
    return unavailableImage();
  }

  const response = await fetchTrustedImage(post.fullPicture);
  if (!response) return unavailableImage();

  const contentType = response.headers.get("content-type")?.split(";", 1)[0] || "";
  if (
    !response.ok ||
    !isFacebookImageUrl(response.url || post.fullPicture) ||
    !IMAGE_CONTENT_TYPE.test(contentType)
  ) {
    return unavailableImage();
  }

  try {
    const image = await readImage(response);
    if (!image) return unavailableImage();
    const body = new ArrayBuffer(image.byteLength);
    new Uint8Array(body).set(image);
    return new Response(body, {
      headers: {
        "Cache-Control": CACHE_CONTROL,
        "Content-Length": String(image.byteLength),
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return unavailableImage();
  }
}
