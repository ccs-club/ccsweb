import assert from "node:assert/strict";
import { test } from "node:test";
import { createAdminSessionToken, isAdminConfigured, verifyAdminPassword, verifyAdminSessionToken } from "../src/lib/admin-auth";
import { clearLoginFailures, reserveLoginAttempt } from "../src/lib/rate-limit";
import { isSameOrigin, readRequestText, RequestBodyTooLargeError } from "../src/lib/request-security";

test("admin sessions expire, reject tampering and are invalidated by credential rotation", () => {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  process.env.ADMIN_PASSWORD = "test-only-admin-password";
  process.env.ADMIN_SESSION_SECRET = "test-only-session-secret-at-least-32-characters";
  try {
    const now = Date.UTC(2026, 9, 2);
    assert.equal(isAdminConfigured(), true);
    assert.equal(verifyAdminPassword("test-only-admin-password"), true);
    assert.equal(verifyAdminPassword("incorrect-password"), false);
    const token = createAdminSessionToken(now);
    assert.equal(verifyAdminSessionToken(token, now), true);
    assert.equal(verifyAdminSessionToken(`${token}x`, now), false);
    assert.equal(verifyAdminSessionToken(token, now - 61_000), false);
    assert.equal(verifyAdminSessionToken(token, now + (8 * 60 * 60 + 1) * 1000), false);
    process.env.ADMIN_PASSWORD = "test-only-rotated-password";
    assert.equal(verifyAdminSessionToken(token, now), false);
    process.env.ADMIN_SESSION_SECRET = "test-only-rotated-session-secret-32-characters";
    assert.equal(verifyAdminSessionToken(token, now), false);
  } finally {
    if (password === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = password;
    if (secret === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = secret;
  }
});

test("login limit blocks the sixth attempt and resets after its window", () => {
  const key = "regression-test-client";
  const now = 10_000;
  clearLoginFailures(key);
  for (let index = 0; index < 5; index++) assert.equal(reserveLoginAttempt(key, now).allowed, true);
  assert.deepEqual(reserveLoginAttempt(key, now), { allowed: false, retryAfterSeconds: 900 });
  assert.equal(reserveLoginAttempt(key, now + 900_000).allowed, true);
  clearLoginFailures(key);
});

test("mutation origin must match and request body limits count streamed bytes", async () => {
  const url = "https://club.example/api/admin/events";
  assert.equal(isSameOrigin(new Request(url, { headers: { Origin: "https://club.example" } })), true);
  assert.equal(isSameOrigin(new Request(url, { headers: { Origin: "https://other.example" } })), false);
  assert.equal(isSameOrigin(new Request(url)), false);
  const internalUrl = "https://localhost:3100/api/admin/events";
  assert.equal(isSameOrigin(new Request(internalUrl, { headers: { Host: "club.example", Origin: "https://club.example" } })), true);
  assert.equal(isSameOrigin(new Request(internalUrl, { headers: { Host: "club.example:443", Origin: "https://club.example" } })), true);
  assert.equal(isSameOrigin(new Request(internalUrl, { headers: { Host: "club.example", Origin: "https://other.example", "X-Forwarded-Host": "other.example" } })), false);
  assert.equal(isSameOrigin(new Request(internalUrl, { headers: { Host: "club.example/path", Origin: "https://club.example" } })), false);
  const request = () => new Request(url, { method: "POST", body: "Монгол" });
  assert.equal(await readRequestText(request(), 12), "Монгол");
  await assert.rejects(readRequestText(request(), 11), RequestBodyTooLargeError);
});
