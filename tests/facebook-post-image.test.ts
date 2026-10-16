import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const post = {
  id: "110700467422954_12345678901234567",
  message: "A selected Page post.",
  createdTime: "2026-06-01T08:30:00+0000",
  permalinkUrl: "https://www.facebook.com/ccs.cybersec.club/posts/12345678901234567",
  fullPicture: "https://scontent.fbcdn.net/expired.jpg?oe=1",
};
const freshPicture = "https://scontent.fbcdn.net/fresh.jpg?oe=7fffffff";
const imageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

test("image route refreshes an expired Facebook image URL and stores replacement", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ccs-facebook-image-test-"));
  const previousPath = process.env.FACEBOOK_POSTS_FILE_PATH;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousPageId = process.env.FACEBOOK_PAGE_ID;
  const previousToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const originalFetch = globalThis.fetch;
  const postsFile = path.join(directory, "facebook-posts.json");

  delete process.env.DATABASE_URL;
  process.env.FACEBOOK_POSTS_FILE_PATH = postsFile;
  process.env.FACEBOOK_PAGE_ID = "110700467422954";
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN = "test-page-access-token";
  await writeFile(postsFile, `${JSON.stringify([post])}\n`);

  let expiredImageRequests = 0;
  let freshImageRequests = 0;
  let pageFeedRequests = 0;
  const unselectedId = "110700467422954_12345678901234568";
  globalThis.fetch = async (input) => {
    const url = new URL(String(input));
    if (url.origin === "https://graph.facebook.com") {
      assert.equal(url.searchParams.get("access_token"), "test-page-access-token");
      if (url.pathname === `/v26.0/${post.id}`) {
        assert.equal(url.searchParams.get("fields"), "id,full_picture");
        return Response.json({ id: post.id, full_picture: freshPicture });
      }
      if (url.pathname === "/v26.0/110700467422954/published_posts") {
        pageFeedRequests += 1;
        return Response.json({ data: [
          {
            id: post.id,
            message: `${post.message} #ccsinfo`,
            created_time: post.createdTime,
            permalink_url: post.permalinkUrl,
            full_picture: freshPicture,
          },
          {
            id: unselectedId,
            message: "Regular unselected post.",
            created_time: post.createdTime,
            permalink_url: "https://www.facebook.com/ccs.cybersec.club/posts/12345678901234568",
            full_picture: freshPicture,
          },
        ] });
      }
    }
    if (url.hostname === "scontent.fbcdn.net" && url.pathname === "/expired.jpg") {
      expiredImageRequests += 1;
      return new Response("expired", {
        status: 403,
        headers: { "Content-Type": "text/plain" },
      });
    }
    if (url.hostname === "scontent.fbcdn.net" && url.pathname === "/fresh.jpg") {
      freshImageRequests += 1;
      return new Response(imageBytes, {
        headers: { "Content-Type": "image/jpeg" },
      });
    }
    throw new Error("Unexpected image request destination");
  };

  try {
    const { GET } = await import("../src/app/api/facebook-post-image/[id]/route");
    const response = await GET(
      new Request(`https://ccs.example/api/facebook-post-image/${post.id}`),
      { params: Promise.resolve({ id: post.id }) },
    );

    assert.equal(response.status, 200);
    assert.equal(expiredImageRequests, 0);
    assert.equal(response.headers.get("content-type"), "image/jpeg");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), imageBytes);
    const stored = JSON.parse(await readFile(postsFile, "utf8"));
    assert.equal(stored[0].fullPicture, freshPicture);
    assert.equal(stored[0].message, post.message);

    const { removeSelectedFacebookPost } = await import("../src/lib/facebook-posts");
    assert.equal(await removeSelectedFacebookPost(post.id), true);

    const informationImage = await GET(
      new Request(`https://ccs.example/api/facebook-post-image/${post.id}`),
      { params: Promise.resolve({ id: post.id }) },
    );
    assert.equal(informationImage.status, 200);
    assert.deepEqual(new Uint8Array(await informationImage.arrayBuffer()), imageBytes);

    const regularImage = await GET(
      new Request(`https://ccs.example/api/facebook-post-image/${unselectedId}`),
      { params: Promise.resolve({ id: unselectedId }) },
    );
    assert.equal(regularImage.status, 404);
    assert.equal(expiredImageRequests, 0);
    assert.equal(freshImageRequests, 2);
    assert.equal(pageFeedRequests, 1);
    assert.deepEqual(JSON.parse(await readFile(postsFile, "utf8")), []);
  } finally {
    globalThis.fetch = originalFetch;
    if (previousPath === undefined) delete process.env.FACEBOOK_POSTS_FILE_PATH;
    else process.env.FACEBOOK_POSTS_FILE_PATH = previousPath;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousPageId === undefined) delete process.env.FACEBOOK_PAGE_ID;
    else process.env.FACEBOOK_PAGE_ID = previousPageId;
    if (previousToken === undefined) delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    else process.env.FACEBOOK_PAGE_ACCESS_TOKEN = previousToken;
    await rm(directory, { recursive: true, force: true });
  }
});
