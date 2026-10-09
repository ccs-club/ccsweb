import path from "node:path";
import { connection } from "next/server";
import { createDocumentStore } from "./document-store";
import {
  isFacebookPostId,
  normalizeFacebookPost,
  type FacebookPost,
} from "./facebook-post-types";

const DEFAULT_FACEBOOK_POSTS_FILE = path.join(process.cwd(), "data", "facebook-posts.json");
const FACEBOOK_POSTS_FILE_CONFIGURED = Boolean(process.env.FACEBOOK_POSTS_FILE_PATH);
const FACEBOOK_POSTS_FILE = path.resolve(
  /*turbopackIgnore: true*/
  process.env.FACEBOOK_POSTS_FILE_PATH || DEFAULT_FACEBOOK_POSTS_FILE,
);
const store = createDocumentStore({
  key: "facebook-posts",
  label: "Facebook posts",
  filePath: FACEBOOK_POSTS_FILE,
  fileConfigured: FACEBOOK_POSTS_FILE_CONFIGURED,
  seedFilePath: DEFAULT_FACEBOOK_POSTS_FILE,
});
const MAX_SELECTED_POSTS = 24;

export class FacebookPostStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FacebookPostStoreError";
  }
}

function fail(message: string): never {
  throw new FacebookPostStoreError(message);
}

function sortFacebookPosts(posts: FacebookPost[]): FacebookPost[] {
  return [...posts].sort((a, b) => b.createdTime.localeCompare(a.createdTime));
}

function parseStoredFacebookPosts(values: unknown): FacebookPost[] {
  if (values === undefined) return [];
  if (!Array.isArray(values)) {
    throw new Error("Facebook posts file must contain an array of posts");
  }
  if (values.length > MAX_SELECTED_POSTS) {
    throw new Error(`Facebook posts file cannot contain more than ${MAX_SELECTED_POSTS} posts`);
  }

  const ids = new Set<string>();
  const posts = values.map((value, index) => {
    const post = normalizeFacebookPost(value);
    if (!post) throw new Error(`Facebook post ${index + 1} is invalid`);
    if (ids.has(post.id)) throw new Error(`Facebook post ${index + 1} duplicates an earlier post`);
    ids.add(post.id);
    return post;
  });

  return sortFacebookPosts(posts);
}

async function readFacebookPosts(): Promise<FacebookPost[]> {
  return parseStoredFacebookPosts(await store.read());
}

function mutateFacebookPosts<T>(
  mutator: (posts: FacebookPost[]) => { posts: FacebookPost[]; result: T },
): Promise<T> {
  return store.update((stored) => {
    const next = mutator(parseStoredFacebookPosts(stored));
    return { next: sortFacebookPosts(next.posts), result: next.result };
  });
}

/** Reads the public selections fresh for a page render. */
export async function getSelectedFacebookPosts(): Promise<FacebookPost[]> {
  await connection();
  return readFacebookPosts();
}

/** Reads selections in a request-time API handler. */
export function getSelectedFacebookPostsForRequest(): Promise<FacebookPost[]> {
  return readFacebookPosts();
}

export async function getSelectedFacebookPostForRequest(
  id: string,
): Promise<FacebookPost | undefined> {
  if (!isFacebookPostId(id)) return undefined;
  return (await readFacebookPosts()).find((post) => post.id === id);
}

/** Adds or refreshes one admin-selected Page post snapshot. */
export function saveSelectedFacebookPost(value: unknown): Promise<FacebookPost> {
  const post = normalizeFacebookPost(value);
  if (!post) fail("Facebook post is invalid");

  return mutateFacebookPosts((current) => {
    const existingIndex = current.findIndex((item) => item.id === post.id);
    if (existingIndex === -1 && current.length >= MAX_SELECTED_POSTS) {
      fail(`no more than ${MAX_SELECTED_POSTS} Facebook posts can be selected`);
    }

    const posts = [...current];
    if (existingIndex === -1) posts.push(post);
    else posts[existingIndex] = post;
    return { posts, result: post };
  });
}

export function removeSelectedFacebookPost(id: unknown): Promise<boolean> {
  if (!isFacebookPostId(id)) fail("Facebook post id is invalid");

  return mutateFacebookPosts((current) => {
    const posts = current.filter((post) => post.id !== id);
    return { posts, result: posts.length !== current.length };
  });
}
