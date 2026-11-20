import { MapPin, Soup } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SearchBox } from "../components/SearchBox.jsx";
import { CategoryChip, EmptyState, ErrorState, Photo } from "../components/ui.jsx";
import { getIndex, loadSearchIndex } from "../lib/catalogue.js";
import { category as categoryMeta } from "../lib/categories.js";
import { links, replaceParams } from "../lib/router.js";
import { createSearcher } from "../lib/search.js";
import { thumbAt } from "../lib/images.js";

const KINDS = [
  { id: "", label: "Everything" },
  { id: "place", label: "Places" },
  { id: "dish", label: "Dishes" },
  { id: "destination", label: "Destinations" },
];

function resultHref(item) {
  if (item.kind === "place") return links.place(item.state, item.id);
  if (item.kind === "destination") return links.state(item.state, "places", { dest: item.id });
  return links.state(item.state, "food");
}

export function SearchView({ route }) {
  const { q = "", kind = "", state = "" } = route.params;
  const [entries, setEntries] = useState(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const index = getIndex();
  const stateName = useMemo(() => new Map(index.states.map((item) => [item.id, item.name])), [index]);

  useEffect(() => {
    let active = true;
    setFailed(false);
    loadSearchIndex()
      .then((data) => active && setEntries(data))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [attempt]);

  const search = useMemo(() => (entries ? createSearcher(entries) : null), [entries]);
  const results = useMemo(
    () => (search ? search(q, { kind: kind || undefined, state: state || undefined }) : []),
    [search, q, kind, state],
  );

  return (
    <div className="container section search-page">
      <h1 className="page-title">Search</h1>
      <SearchBox
        initial={q}
        size="md"
        autoFocus
        onSearch={(value) => replaceParams({ q: value })}
        placeholder="Try “fort”, “appam”, “Udaipur”…"
      />
      <div className="search-filters">
        <div className="chip-wrap" role="group" aria-label="Result type">
          {KINDS.map((item) => (
            <button
              key={item.id || "all"}
              type="button"
              className={`chip ${kind === item.id ? "active" : ""}`}
              aria-pressed={kind === item.id}
              onClick={() => replaceParams({ kind: item.id })}
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="inline-select">
          <span>State</span>
          <select value={state} onChange={(event) => replaceParams({ state: event.target.value })}>
            <option value="">All states</option>
            {index.states.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {failed && (
        <ErrorState title="Search could not be loaded" onRetry={() => setAttempt((value) => value + 1)} />
      )}
      {!failed && !entries && (
        <p className="muted" role="status">
          Loading search…
        </p>
      )}
      {entries && q.trim().length < 2 && (
        <EmptyState title="What are you looking for?">
          Search across every live state: sights, beaches, temples, dishes and towns.
        </EmptyState>
      )}
      {entries && q.trim().length >= 2 && results.length === 0 && (
        <EmptyState title={`No results for “${q}”`}>
          Check the spelling, or try a broader word like “beach” or “temple”.
        </EmptyState>
      )}
      {results.length > 0 && (
        <>
          <p className="results-count" aria-live="polite">
            {results.length}
            {results.length === 60 ? "+" : ""} results
          </p>
          <ul className="search-results">
            {results.map((item) => {
              const meta = item.kind === "place" ? categoryMeta(item.category) : null;
              return (
                <li key={`${item.kind}-${item.state}-${item.id}`}>
                  <a href={resultHref(item)} className="search-result">
                    <Photo
                      image={item.image ? { src: thumbAt(item.image, 330) } : null}
                      fallbackIcon={meta?.icon ?? (item.kind === "dish" ? Soup : MapPin)}
                      className="search-result-thumb"
                      sizes="88px"
                    />
                    <span className="search-result-body">
                      <strong>{item.name}</strong>
                      <span className="search-result-meta">
                        {item.kind === "place" ? (
                          <CategoryChip id={item.category} />
                        ) : (
                          <span className="chip">{item.kind === "dish" ? "Dish" : "Destination"}</span>
                        )}
                        <span>{[item.where, stateName.get(item.state)].filter(Boolean).join(", ")}</span>
                      </span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
