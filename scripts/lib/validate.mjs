import { CATEGORIES } from "./categorise.mjs";

/** True when `[lat, lon]` falls inside `bbox` = [minLat, minLon, maxLat, maxLon]. */
export function inBbox(lat, lon, [minLat, minLon, maxLat, maxLon]) {
  return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
}

function checkImage(image, where, errors) {
  if (!image) return;
  for (const field of ["src", "file", "license", "page"]) {
    if (!image[field]) errors.push(`${where}: image is missing "${field}"`);
  }
}

/**
 * Validates one generated state document. Returns a list of human-readable errors; an empty
 * list means the document is publishable. Rules: every entry has a source, coordinates (when
 * present) fall inside the state's bounding box, images carry license details, categories are
 * known and ids are unique.
 */
export function validateState(doc) {
  const errors = [];
  if (!doc?.id || !doc?.name) errors.push("state: missing id or name");
  const bbox = doc?.bbox;
  if (!Array.isArray(bbox) || bbox.length !== 4) errors.push("state: missing bbox");
  const ids = new Set();
  const check = (item, kind) => {
    const where = `${kind} "${item.name ?? item.id}"`;
    if (!item.id) errors.push(`${where}: missing id`);
    else if (ids.has(item.id)) errors.push(`${where}: duplicate id ${item.id}`);
    ids.add(item.id);
    if (!item.source?.url) errors.push(`${where}: missing source`);
    if (item.lat != null || item.lon != null) {
      if (!Number.isFinite(item.lat) || !Number.isFinite(item.lon))
        errors.push(`${where}: invalid coordinates`);
      else if (bbox && !inBbox(item.lat, item.lon, bbox))
        errors.push(`${where}: coordinates outside ${doc.name}`);
    }
    checkImage(item.image, where, errors);
  };
  (doc?.destinations ?? []).forEach((item) => check(item, "destination"));
  (doc?.places ?? []).forEach((item) => {
    check(item, "place");
    if (!CATEGORIES.includes(item.category))
      errors.push(`place "${item.name}": unknown category ${item.category}`);
  });
  (doc?.dishes ?? []).forEach((item) => check(item, "dish"));
  (doc?.services ?? []).forEach((item) => check(item, "service"));
  checkImage(doc?.hero, "state hero", errors);
  return errors;
}
