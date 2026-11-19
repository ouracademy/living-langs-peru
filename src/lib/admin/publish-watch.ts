/**
 * Tells when a photo just saved is already served by the web (UI-9). A save is
 * a commit; Vercel then builds and deploys, which usually takes 1–2 minutes.
 * The new file answering 200 is the cheapest sign that the deploy is live.
 *
 * Pure apart from the timer: `fetchImpl` and the clock come from the caller,
 * so the unit test drives it with fake timers.
 */

export type PublishState = "waiting" | "published" | "slow";

export type PublishWatchOptions = {
  fetchImpl?: typeof fetch;
  intervalMs?: number;
  timeoutMs?: number;
  onChange: (state: PublishState) => void;
};

export const PUBLISH_CHECK_INTERVAL_MS = 15_000;
export const PUBLISH_TIMEOUT_MS = 5 * 60_000;

/** Starts checking `src` and returns a function that stops it. */
export function watchPublication(
  src: string,
  {
    fetchImpl = fetch,
    intervalMs = PUBLISH_CHECK_INTERVAL_MS,
    timeoutMs = PUBLISH_TIMEOUT_MS,
    onChange,
  }: PublishWatchOptions,
): () => void {
  const startedAt = Date.now();
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  async function check() {
    let published = false;
    try {
      // no-store: a 404 cached from before the deploy must not hide the file.
      const response = await fetchImpl(src, {
        method: "HEAD",
        cache: "no-store",
      });
      published = response.ok;
    } catch (error) {
      // Offline for a moment is not an answer either way: keep waiting.
      console.warn(
        "admin/fotos: publish check failed",
        error instanceof Error ? error.name : "unknown",
      );
    }
    if (stopped) return;
    if (published) {
      onChange("published");
      return;
    }
    if (Date.now() - startedAt >= timeoutMs) {
      onChange("slow");
      return;
    }
    timer = setTimeout(check, intervalMs);
  }

  timer = setTimeout(check, intervalMs);
  return () => {
    stopped = true;
    if (timer !== undefined) clearTimeout(timer);
  };
}
