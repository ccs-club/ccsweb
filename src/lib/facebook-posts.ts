import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { connection } from "next/server";
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

async function readFacebookPostsFromDisk(): Promise<FacebookPost[]> {
  let source: string;
  try {
    source = await fs.readFile(/*turbopackIgnore: true*/ FACEBOOK_POSTS_FILE, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (FACEBOOK_POSTS_FILE_CONFIGURED) {
        throw new Error("The configured Facebook posts file is missing.");
      }
      return [];
    }
    throw error;
  }

  let values: unknown;
  try {
    values = JSON.parse(source);
  } catch {
    throw new Error(`Unable to parse Facebook posts file at ${FACEBOOK_POSTS_FILE}`);
  }
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

async function writeFacebookPostsToDisk(posts: FacebookPost[]): Promise<void> {
  await fs.mkdir(path.dirname(FACEBOOK_POSTS_FILE), { recursive: true });
  const temporaryFile = `${FACEBOOK_POSTS_FILE}.${process.pid}.${randomUUID()}.tmp`;
  await fs.writeFile(
    temporaryFile,
    `${JSON.stringify(sortFacebookPosts(posts), null, 2)}\n`,
    { encoding: "utf8", mode: 0o600 },
  );
  await fs.rename(temporaryFile, FACEBOOK_POSTS_FILE);
}

let mutationQueue: Promise<void> = Promise.resolve();

function mutateFacebookPosts<T>(
  mutator: (posts: FacebookPost[]) => { posts: FacebookPost[]; result: T },
): Promise<T> {
  const operation = mutationQueue.then(async () => {
    const current = await readFacebookPostsFromDisk();
    const next = mutator(current);
    await writeFacebookPostsToDisk(next.posts);
    return next.result;
  });

  mutationQueue = operation.then(
    () => undefined,
    () => undefined,
  );
  return operation;
}

/** Reads the public selections fresh for a page render. */
export async function getSelectedFacebookPosts(): Promise<FacebookPost[]> {
  await connection();
  return readFacebookPostsFromDisk();
}

/** Reads selections in a request-time API handler. */
export function getSelectedFacebookPostsForRequest(): Promise<FacebookPost[]> {
  return readFacebookPostsFromDisk();
}

export async function getSelectedFacebookPostForRequest(
  id: string,
): Promise<FacebookPost | undefined> {
  if (!isFacebookPostId(id)) return undefined;
  return (await readFacebookPostsFromDisk()).find((post) => post.id === id);
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
