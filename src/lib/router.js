import { useEffect, useState } from "react";

/**
 * Hash routes (work on GitHub Pages without server rewrites):
 *   #/                         home
 *   #/states                   all states
 *   #/state/<id>[/<tab>]       state page; tabs: overview, places, food, practical, map
 *   #/place/<state>/<id>       place page
 *   #/search                   search
 *   #/about                    about and credits
 * Query parameters after "?" hold filters, e.g. #/state/goa/places?cat=beach&dest=panaji
 */
export const STATE_TABS = ["overview", "places", "food", "practical", "map"];

export function parseHash(hash = "") {
  const raw = hash.replace(/^#/, "");
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  const params = Object.fromEntries(new URLSearchParams(query));
  const [first, second, third] = parts;
  if (!first) return { name: "home", params };
  if (first === "states" && !second) return { name: "states", params };
  if (first === "state" && second) {
    const tab = STATE_TABS.includes(third) ? third : "overview";
    return { name: "state", stateId: second, tab, params };
  }
  if (first === "place" && second && third) return { name: "place", stateId: second, placeId: third, params };
  if (first === "search") return { name: "search", params };
  if (first === "about") return { name: "about", params };
  return { name: "not-found", params };
}

/** Builds a hash link. Empty and default parameter values are left out. */
export function href(path, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "" && value !== false,
    ),
  ).toString();
  return `#${path}${query ? `?${query}` : ""}`;
}

export const links = {
  home: () => href("/"),
  states: () => href("/states"),
  state: (id, tab, params) =>
    href(`/state/${encodeURIComponent(id)}${tab && tab !== "overview" ? `/${tab}` : ""}`, params),
  place: (stateId, placeId) => href(`/place/${encodeURIComponent(stateId)}/${encodeURIComponent(placeId)}`),
  search: (params) => href("/search", params),
  about: () => href("/about"),
};

/** Current route; re-renders on hash changes. */
export function useRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

/** Replaces query parameters on the current route without adding a history entry per keystroke. */
export function replaceParams(params) {
  const current = parseHash(window.location.hash);
  const path = window.location.hash.replace(/^#/, "").split("?")[0] || "/";
  const next = href(path, { ...current.params, ...params });
  if (next !== window.location.hash) {
    window.history.replaceState(null, "", next);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
}
