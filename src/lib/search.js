import Fuse from "fuse.js";

/**
 * Fuzzy search over the search index (places, dishes, destinations of every state).
 * Tolerates typos and partial words; names weigh more than locations.
 */
export function createSearcher(entries) {
  const fuse = new Fuse(entries, {
    keys: [
      { name: "name", weight: 3 },
      { name: "alt", weight: 1.5 },
      { name: "local", weight: 1.5 },
      { name: "where", weight: 1 },
    ],
    threshold: 0.32,
    ignoreLocation: true,
    minMatchCharLength: 2,
    includeScore: true,
  });
  return (query, { kind, state, category, limit = 60 } = {}) => {
    const text = String(query ?? "").trim();
    const matches = (item) =>
      (!kind || item.kind === kind) &&
      (!state || item.state === state) &&
      (!category || item.category === category);
    if (text.length < 2) return [];
    return fuse
      .search(text, { limit: 400 })
      .map((result) => result.item)
      .filter(matches)
      .slice(0, limit);
  };
}
