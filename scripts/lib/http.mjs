import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Generic identification, as Wikimedia's API etiquette asks; no personal contact details. */
export const USER_AGENT = "bharat-darshan-data-builder/0.1 (open-data travel guide; build script)";
const CACHE_DIR = join(process.cwd(), "data", "raw");
const lastRequestAt = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits so requests to the same host are at least `gapMs` apart. */
async function throttle(host, gapMs) {
  const wait = (lastRequestAt.get(host) ?? 0) + gapMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(host, Date.now());
}

/**
 * GET (or POST with `body`) returning parsed JSON, cached on disk under data/raw so repeated
 * builds are fast, reproducible and gentle on the public APIs. Set REFRESH=1 to bypass the cache.
 * `accept(data)` can reject a successful-looking response; rejected responses are retried, not cached.
 */
export async function fetchJson(
  url,
  { body, gapMs = 400, retries = 6, headers = {}, timeoutMs = 120000, accept = () => true } = {},
) {
  const key = createHash("sha256")
    .update(`${url}\n${body ?? ""}`)
    .digest("hex")
    .slice(0, 32);
  const file = join(CACHE_DIR, `${key}.json`);
  if (process.env.REFRESH !== "1") {
    try {
      return JSON.parse(await readFile(file, "utf8"));
    } catch {
      // Not cached yet.
    }
  }
  const host = new URL(url).host;
  for (let attempt = 1; ; attempt += 1) {
    await throttle(host, gapMs);
    if (process.env.VERBOSE === "1") console.log(`    GET ${host}${new URL(url).pathname}`);
    let response;
    try {
      response = await fetch(url, {
        method: body ? "POST" : "GET",
        body,
        headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (attempt >= retries)
        throw new Error(
          `${error.name === "TimeoutError" ? "Timed out" : error.message} for ${url.slice(0, 160)}`,
        );
      await sleep(2000 * attempt);
      continue;
    }
    if (response.ok) {
      const data = await response.json();
      // Some APIs (Overpass) report failures inside a 200 response; never cache those.
      if (!accept(data)) {
        if (attempt >= retries) throw new Error(`Unusable response for ${url.slice(0, 160)}`);
        await sleep(5000 * attempt);
        continue;
      }
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(file, JSON.stringify(data));
      return data;
    }
    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt >= retries) {
      throw new Error(`${response.status} ${response.statusText} for ${url.slice(0, 160)}`);
    }
    // Honour Retry-After when the server sends it; otherwise back off exponentially.
    const retryAfter = Number(response.headers.get("retry-after")) * 1000;
    await sleep(Math.max(Number.isFinite(retryAfter) ? retryAfter : 0, 3000 * 2 ** (attempt - 1)));
  }
}

/** Splits an array into chunks of `size`. */
export function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}
