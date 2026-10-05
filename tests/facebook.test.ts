import assert from "node:assert/strict";
import { test } from "node:test";

const pageId = "110700467422954";
const token = "test-page-access-token-that-never-leaves-this-test";

test("Facebook Page requests stay server-side, parse the allowed fields, and cache results", async () => {
  const previousPageId = process.env.FACEBOOK_PAGE_ID;
  const previousToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const originalFetch = globalThis.fetch;
  process.env.FACEBOOK_PAGE_ID = pageId;
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN = token;
  let requests = 0;
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    requests += 1;
    requestUrl = String(input);
    requestInit = init;
    return new Response(JSON.stringify({
      data: [
        {
          id: "110700467422954_12345678901234567",
          message: " A Page post. ",
          created_time: "2026-06-01T08:30:00+0000",
          permalink_url: "https://www.facebook.com/ccs.cybersec.club/posts/12345678901234567",
          full_picture: "https://scontent.fuln1-1.fna.fbcdn.net/image.jpg",
          ignored_field: "not retained",
        },
        {
          id: "not-a-page-post",
          created_time: "2026-06-01T08:30:00+0000",
          permalink_url: "https://www.facebook.com/ccs.cybersec.club/posts/123",
        },
      ],
    }), { headers: { "Content-Type": "application/json" } });
  };

  try {
    const facebook = await import("../src/lib/facebook");
    assert.equal(facebook.isFacebookConfigured(), true);
    const posts = await facebook.getPublishedFacebookPosts({ forceRefresh: true });
    assert.deepEqual(posts, [{
      id: "110700467422954_12345678901234567",
      message: "A Page post.",
      createdTime: "2026-06-01T08:30:00+0000",
      permalinkUrl: "https://www.facebook.com/ccs.cybersec.club/posts/12345678901234567",
      fullPicture: "https://scontent.fuln1-1.fna.fbcdn.net/image.jpg",
    }]);
    const url = new URL(requestUrl);
    assert.equal(url.origin, "https://graph.facebook.com");
    assert.equal(url.pathname, `/v26.0/${pageId}/published_posts`);
    assert.equal(url.searchParams.get("access_token"), token);
    assert.equal(url.searchParams.get("fields"), "id,message,created_time,permalink_url,full_picture");
    assert.equal(requestInit?.cache, "no-store");

    await facebook.getPublishedFacebookPosts();
    assert.equal(requests, 1, "a five-minute server cache avoids repeated Page calls");

    globalThis.fetch = async () => new Response("failure", { status: 500 });
    await assert.rejects(
      facebook.getPublishedFacebookPosts({ forceRefresh: true }),
      facebook.FacebookPostsUnavailableError,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousPageId === undefined) delete process.env.FACEBOOK_PAGE_ID;
    else process.env.FACEBOOK_PAGE_ID = previousPageId;
    if (previousToken === undefined) delete process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    else process.env.FACEBOOK_PAGE_ACCESS_TOKEN = previousToken;
  }
});
