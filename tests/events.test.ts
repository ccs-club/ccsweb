import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

test("Halloween Special CTF has its supplied local cover", async () => {
  const events = JSON.parse(await readFile("data/events.json", "utf8"));
  const event = events.find((item: { id: string }) => item.id === "halloween-special-ctf-2024");
  assert.equal(event?.coverImage, "/events/halloween-special-ctf-2024.webp");
  await access(path.join("public", event.coverImage.slice(1)));
});

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

test("event validation, serialized writes and revision conflicts", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "ccs-events-test-"));
  const previousPath = process.env.EVENTS_FILE_PATH;
  process.env.EVENTS_FILE_PATH = path.join(directory, "events.json");
  await writeFile(process.env.EVENTS_FILE_PATH, "[]\n");
  const store = await import("../src/lib/events");

  try {
    await t.test("rejects invalid fields without changing the store", async () => {
      for (const invalid of [
        { date: "2026-02-30" },
        { endDate: "2026-10-01" },
        { titleMn: "" },
        { type: "unknown" },
        { status: "unknown" },
        { registrationUrl: "javascript:alert(1)" },
        { coverImage: "/events/../gallery/test.webp" },
        { coverImage: "/events/nonexistent-test-file.webp" },
        { tags: Array(13).fill("test") },
      ]) {
        await assert.rejects(store.createEvent({ ...draft, ...invalid }), store.EventValidationError);
      }
      assert.deepEqual(await store.getEventsForRequest(), []);
    });

    await t.test("keeps concurrent creates and gives them unique ids", async () => {
      const created = await Promise.all(Array.from({ length: 12 }, () => store.createEvent(draft)));
      assert.equal(new Set(created.map((event) => event.id)).size, 12);
      const persisted = JSON.parse(await readFile(process.env.EVENTS_FILE_PATH!, "utf8"));
      assert.equal(persisted.length, 12);
      assert.equal((await store.getEventsForRequest()).length, 12);
    });

    await t.test("updates require the current revision and stale deletes cannot remove an event", async () => {
      const original = (await store.getEventsForRequest())[0];
      const updated = await store.updateEvent(original.id, { ...original, title: "Updated test event" });
      assert.equal(updated.revision, original.revision + 1);
      await assert.rejects(store.updateEvent(original.id, original), store.EventConflictError);
      await assert.rejects(store.deleteEvent(original.id, original.revision), store.EventConflictError);
      assert.equal(await store.deleteEvent(updated.id, updated.revision), true);
      assert.equal(await store.deleteEvent(updated.id, updated.revision), false);
    });

    await t.test("changing the featured event also revises the previous featured event", async () => {
      const first = await store.createEvent({ ...draft, featured: true });
      const second = await store.createEvent({ ...draft, featured: true });
      const events = await store.getEventsForRequest();
      assert.deepEqual(events.filter((event) => event.featured).map((event) => event.id), [second.id]);
      const demoted = events.find((event) => event.id === first.id)!;
      assert.equal(demoted.featured, false);
      assert.equal(demoted.revision, first.revision + 1);
      await assert.rejects(store.updateEvent(first.id, first), store.EventConflictError);
    });
  } finally {
    if (previousPath === undefined) delete process.env.EVENTS_FILE_PATH;
    else process.env.EVENTS_FILE_PATH = previousPath;
    await rm(directory, { recursive: true, force: true });
  }
});
