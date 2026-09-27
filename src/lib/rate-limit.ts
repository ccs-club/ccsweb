type AttemptBucket = {
  count: number;
  resetAt: number;
};

const attempts = new Map<string, AttemptBucket>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_BUCKETS = 10_000;

function prune(now: number): void {
  for (const [key, bucket] of attempts) {
    if (bucket.resetAt <= now) attempts.delete(key);
  }

  while (attempts.size > MAX_BUCKETS) {
    const oldest = attempts.keys().next().value;
    if (oldest === undefined) break;
    attempts.delete(oldest);
  }
}

export function reserveLoginAttempt(
  key: string,
  now = Date.now(),
): { allowed: boolean; retryAfterSeconds: number } {
  prune(now);
  const bucket = attempts.get(key);
  if (!bucket || bucket.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
