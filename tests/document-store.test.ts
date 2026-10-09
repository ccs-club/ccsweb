import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Client } from "pg";

// Runs only when TEST_DATABASE_URL points at a disposable Postgres database.
// The test deletes every row in site_documents, so never aim it at real data.
const databaseUrl = process.env.TEST_DATABASE_URL;
const skip = databaseUrl ? false : "TEST_DATABASE_URL is not set";

async function resetDocuments(): Promise<void> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(
      "CREATE TABLE IF NOT EXISTS site_documents (key text PRIMARY KEY, data jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())",
    );
    await client.query("DELETE FROM site_documents");
  } finally {
    await client.end();
  }
}

test("Postgres document store", { skip }, async (t) => {
  process.env.DATABASE_URL = databaseUrl;
  await resetDocuments();
  const directory = await mkdtemp(path.join(os.tmpdir(), "ccs-document-store-test-"));
  const seedFilePath = path.join(directory, "seed.json");
  await writeFile(seedFilePath, JSON.stringify({ count: 100 }));
  const { createDocumentStore } = await import("../src/lib/document-store");
  const store = createDocumentStore({
    key: "counter",
    label: "counter",
    filePath: path.join(directory, "unused.json"),
    fileConfigured: false,
    seedFilePath,
  });

  try {
    await t.test("an empty database reads and starts from the bundled seed", async () => {
      assert.deepEqual(await store.read(), { count: 100 });
      const result = await store.update((current) => ({
        next: { count: (current as { count: number }).count + 1 },
        result: "first write",
      }));
      assert.equal(result, "first write");
      assert.deepEqual(await store.read(), { count: 101 });
    });

    await t.test("concurrent writers never lose an update", async () => {
      await Promise.all(
        Array.from({ length: 30 }, () =>
          store.update(async (current) => {
            const { count } = current as { count: number };
            // Yield so an unlocked implementation would interleave here.
            await new Promise((resolve) => setTimeout(resolve, 2));
            return { next: { count: count + 1 }, result: undefined };
          }),
        ),
      );
      assert.deepEqual(await store.read(), { count: 131 });
    });

    await t.test("a failing update rolls back and releases the lock", async () => {
      await assert.rejects(
        store.update(() => {
          throw new Error("rejected change");
        }),
        /rejected change/,
      );
      assert.deepEqual(await store.read(), { count: 131 });
      await store.update((current) => ({ next: current, result: undefined }));
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("Event store on Postgres keeps validation, revisions and seed data", { skip }, async (t) => {
  process.env.DATABASE_URL = databaseUrl;
  await resetDocuments();
  const events = await import("../src/lib/events");

  const draft = {
    type: "other",
    title: "Regression test event",
    titleMn: "Туршилтын арга хэмжээ",
    summary: "Test fixture, not public content.",
    summaryMn: "Туршилтын мэдээлэл.",
    date: "2026-10-02",
    status: "upcoming",
    tags: [],
    featured: false,
  };

  await t.test("first read shows the bundled events", async () => {
    const seeded = await events.getEventsForRequest();
    assert.ok(seeded.some((event) => event.id === "halloween-special-ctf-2024"));
  });

  await t.test("creates keep unique ids under concurrency and reads see them", async () => {
    const before = (await events.getEventsForRequest()).length;
    const created = await Promise.all(
      Array.from({ length: 12 }, () => events.createEvent(draft)),
    );
    assert.equal(new Set(created.map((event) => event.id)).size, 12);
    assert.equal((await events.getEventsForRequest()).length, before + 12);
  });

  await t.test("invalid input is rejected and stale revisions conflict", async () => {
    await assert.rejects(
      events.createEvent({ ...draft, date: "2026-02-30" }),
      events.EventValidationError,
    );
    const original = (await events.getEventsForRequest()).find(
      (event) => event.title === "Regression test event",
    )!;
    const updated = await events.updateEvent(original.id, { ...original, title: "Updated" });
    assert.equal(updated.revision, original.revision + 1);
    await assert.rejects(events.updateEvent(original.id, original), events.EventConflictError);
    await assert.rejects(
      events.deleteEvent(original.id, original.revision),
      events.EventConflictError,
    );
    assert.equal(await events.deleteEvent(updated.id, updated.revision), true);
  });
});
