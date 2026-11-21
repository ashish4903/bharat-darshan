import { createHash } from "node:crypto";

/** Great-circle distance in kilometres between `{ lat, lon }` points. */
export function distanceKm(a, b) {
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** URL-safe slug: "Gateway of India" -> "gateway-of-india". Non-Latin text falls back to "item". */
export function slugify(text) {
  return (
    String(text ?? "")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

/** A readable id that stays the same between builds: "<slug>-<5-char hash of scope+name>". */
export function stableId(name, scope) {
  const hash = createHash("sha1").update(`${scope}|${name}`).digest("hex").slice(0, 5);
  return `${slugify(name)}-${hash}`;
}
