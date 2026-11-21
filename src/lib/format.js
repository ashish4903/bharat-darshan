export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Indian-style large numbers: 1.26 crore, 3.4 lakh, 12,345. */
export function formatPopulation(value) {
  if (!Number.isFinite(value)) return null;
  if (value >= 1e7) return `${trim(value / 1e7)} crore`;
  if (value >= 1e5) return `${trim(value / 1e5)} lakh`;
  return new Intl.NumberFormat("en-IN").format(value);
}

function trim(value) {
  return Number(value.toFixed(value >= 10 ? 1 : 2)).toString();
}

export function formatArea(km2) {
  return Number.isFinite(km2) ? `${new Intl.NumberFormat("en-IN").format(Math.round(km2))} km²` : null;
}

export function formatYear(date) {
  const year = Number(String(date ?? "").slice(0, 4));
  return Number.isFinite(year) && year > 0 ? String(year) : null;
}

export function formatDistance(km) {
  if (!Number.isFinite(km)) return null;
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

/**
 * Compresses month indexes into readable ranges, wrapping around the year:
 * [0,1,2,9,10,11] -> "Oct–Mar"; [] -> null. `long` uses full month names.
 */
export function monthRanges(indexes, { long = false } = {}) {
  const names = long ? MONTHS_LONG : MONTHS;
  const set = new Set(indexes);
  if (set.size === 0) return null;
  if (set.size === 12) return "all year";
  const ranges = [];
  for (let month = 0; month < 12; month += 1) {
    if (!set.has(month) || set.has((month + 11) % 12)) continue;
    let end = month;
    while (set.has((end + 1) % 12) && (end + 1) % 12 !== month) end = (end + 1) % 12;
    ranges.push(month === end ? names[month] : `${names[month]}–${names[end]}`);
  }
  return ranges.join(", ");
}

/** Great-circle distance in km between `{ lat, lon }` points. */
export function distanceKm(a, b) {
  const rad = (degrees) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The first `count` sentences of a text. */
export function sentences(text, count = 2) {
  const parts = String(text ?? "").match(/[^.!?]+[.!?]+(?:["')\]]+)?(?=\s|$)|[^.!?]+$/g) ?? [];
  return parts.slice(0, count).join("").trim();
}

export function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count.toLocaleString("en-IN")} ${count === 1 ? singular : pluralForm}`;
}

/** First sentence(s) up to `max` characters, cut at a word boundary. */
export function excerpt(text, max = 160) {
  const value = String(text ?? "").trim();
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "")}…`;
}
