import { useEffect, useState } from "react";
import index from "../data/index.json";

/**
 * Data access. The index (states, tiles, featured items) ships with the app; each state's full
 * document and the search index are separate chunks loaded on demand.
 */
const stateModules = import.meta.glob("../data/states/*.json", { import: "default" });
const cache = new Map();

export function getIndex() {
  return index;
}

export function stateSummary(id) {
  return index.states.find((state) => state.id === id) ?? null;
}

export function loadState(id) {
  const loader = stateModules[`../data/states/${id}.json`];
  if (!loader) return Promise.resolve(null);
  if (!cache.has(id))
    cache.set(
      id,
      loader().catch((error) => {
        cache.delete(id);
        throw error;
      }),
    );
  return cache.get(id);
}

let searchPromise = null;
export function loadSearchIndex() {
  searchPromise ??= import("../data/search.json")
    .then((module) => module.default)
    .catch((error) => {
      searchPromise = null;
      throw error;
    });
  return searchPromise;
}

/** `{ status: "loading" | "ready" | "missing" | "error", data, retry }` for a state document. */
export function useStateData(id) {
  const [state, setState] = useState({ status: "loading", data: null, id });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    loadState(id)
      .then((data) => active && setState({ status: data ? "ready" : "missing", data, id }))
      .catch(() => active && setState({ status: "error", data: null, id }));
    return () => {
      active = false;
    };
  }, [id, attempt]);
  // While a different state is loading, never show the previous one's data.
  const current = state.id === id ? state : { status: "loading", data: null, id };
  return { ...current, retry: () => setAttempt((value) => value + 1) };
}

/** Helpers over a loaded state document. */
export function destinationName(doc, id) {
  return doc?.destinations.find((destination) => destination.id === id)?.name ?? null;
}

export function findPlace(doc, id) {
  return doc?.places.find((place) => place.id === id) ?? null;
}
