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
};

test("Facebook post selections validate, serialize, and retain concurrent writes", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ccs-facebook-posts-test-"));
  const previousPath = process.env.FACEBOOK_POSTS_FILE_PATH;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  // These tests exercise the file store; never let them reach a real database.
  delete process.env.DATABASE_URL;
  process.env.FACEBOOK_POSTS_FILE_PATH = path.join(directory, "facebook-posts.json");
  await writeFile(process.env.FACEBOOK_POSTS_FILE_PATH, "[]\n");
  const store = await import("../src/lib/facebook-posts");

  try {
    await t.test("rejects unsafe snapshots before writing", () => {
      assert.throws(
        () => store.saveSelectedFacebookPost({ ...post, permalinkUrl: "javascript:alert(1)" }),
        store.FacebookPostStoreError,
      );
      assert.throws(
        () => store.saveSelectedFacebookPost({ ...post, fullPicture: "https://example.com/photo.jpg" }),
        store.FacebookPostStoreError,
      );
    });

    await t.test("keeps one normalized snapshot per post id", async () => {
      await store.saveSelectedFacebookPost(post);
      const refreshed = await store.saveSelectedFacebookPost({ ...post, message: "Updated selected Page post." });
      assert.equal(refreshed.message, "Updated selected Page post.");
      const selected = await store.getSelectedFacebookPostsForRequest();
      assert.equal(selected.length, 1);
      assert.equal(selected[0].message, "Updated selected Page post.");
      assert.equal(
        (await store.getSelectedFacebookPostForRequest(post.id))?.permalinkUrl,
        post.permalinkUrl,
      );
      assert.equal(await store.getSelectedFacebookPostForRequest("not-a-post"), undefined);
    });

    await t.test("serializes concurrent selections and sorts newest first", async () => {
      const additions = Array.from({ length: 12 }, (_, index) => ({
        ...post,
        id: `110700467422954_1234567890123${String(index).padStart(4, "0")}`,
        createdTime: `2026-06-${String(index + 2).padStart(2, "0")}T08:30:00+0000`,
      }));
      await Promise.all(additions.map((item) => store.saveSelectedFacebookPost(item)));
      const selected = await store.getSelectedFacebookPostsForRequest();
      assert.equal(selected.length, 13);
      assert.deepEqual(
        selected.map((item) => item.createdTime),
        [...selected.map((item) => item.createdTime)].sort().reverse(),
      );
      const persisted = JSON.parse(await readFile(process.env.FACEBOOK_POSTS_FILE_PATH!, "utf8"));
      assert.equal(persisted.length, 13);
    });

    await t.test("removes only the chosen snapshot", async () => {
      assert.equal(await store.removeSelectedFacebookPost(post.id), true);
      assert.equal(await store.removeSelectedFacebookPost(post.id), false);
      assert.equal((await store.getSelectedFacebookPostsForRequest()).length, 12);
    });
  } finally {
    if (previousPath === undefined) delete process.env.FACEBOOK_POSTS_FILE_PATH;
    else process.env.FACEBOOK_POSTS_FILE_PATH = previousPath;
    if (previousDatabaseUrl !== undefined) process.env.DATABASE_URL = previousDatabaseUrl;
    await rm(directory, { recursive: true, force: true });
  }
});
