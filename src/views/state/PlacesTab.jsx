import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { PlaceCard } from "../../components/Cards.jsx";
import { CategoryChip, EmptyState } from "../../components/ui.jsx";
import { categoryCounts } from "../../lib/categories.js";
import { replaceParams } from "../../lib/router.js";

const PAGE = 24;
const SORTS = [
  { id: "popular", label: "Most notable" },
  { id: "name", label: "A–Z" },
];

/** Applies the Places filters; exported for tests. */
export function filterPlaces(places, { cat, dest, photos, sort }) {
  const filtered = places.filter(
    (place) =>
      place.category !== "food" &&
      (!cat || place.category === cat) &&
      (!dest || place.destination === dest) &&
      (!photos || Boolean(place.image)),
  );
  return sort === "name" ? [...filtered].sort((a, b) => a.name.localeCompare(b.name)) : filtered;
}

export function PlacesTab({ doc, params }) {
  const { cat = "", dest = "", sort = "popular" } = params;
  const photos = params.photos === "1";
  const [shown, setShown] = useState(PAGE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const sights = useMemo(() => doc.places.filter((place) => place.category !== "food"), [doc]);
  const scoped = useMemo(() => sights.filter((place) => !dest || place.destination === dest), [sights, dest]);
  const counts = useMemo(() => categoryCounts(scoped), [scoped]);
  const results = useMemo(
    () => filterPlaces(doc.places, { cat, dest, photos, sort }),
    [doc, cat, dest, photos, sort],
  );
  const destinationName = useMemo(
    () => new Map(doc.destinations.map((destination) => [destination.id, destination.name])),
    [doc],
  );
  const destinationsWithPlaces = doc.destinations.filter((destination) =>
    sights.some((place) => place.destination === destination.id),
  );
  const activeFilters = [cat, dest, photos].filter(Boolean).length;

  const update = (next) => {
    setShown(PAGE);
    replaceParams(next);
  };

  return (
    <div className="container places-layout">
      <aside className={`filters ${filtersOpen ? "is-open" : ""}`} aria-label="Filters">
        <div className="filters-head">
          <h2>Filter places</h2>
          <button
            type="button"
            className="icon-button filters-close"
            onClick={() => setFiltersOpen(false)}
            aria-label="Close filters"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <fieldset className="filter-group">
          <legend>Type</legend>
          <div className="chip-wrap">
            <button
              type="button"
              className={`chip ${!cat ? "active" : ""}`}
              aria-pressed={!cat}
              onClick={() => update({ cat: "" })}
            >
              All <b>{scoped.length}</b>
            </button>
            {counts.map((item) => (
              <CategoryChip
                key={item.id}
                id={item.id}
                count={item.count}
                as="button"
                active={cat === item.id}
                onClick={() => update({ cat: cat === item.id ? "" : item.id })}
              />
            ))}
          </div>
        </fieldset>
        <label className="filter-group">
          <span className="filter-label">Destination</span>
          <select value={dest} onChange={(event) => update({ dest: event.target.value })}>
            <option value="">All of {doc.name}</option>
            {destinationsWithPlaces.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={photos}
            onChange={(event) => update({ photos: event.target.checked ? "1" : "" })}
          />
          <span>Only places with photos</span>
        </label>
        {activeFilters > 0 && (
          <button
            type="button"
            className="button button-ghost button-block"
            onClick={() => update({ cat: "", dest: "", photos: "" })}
          >
            Clear filters
          </button>
        )}
      </aside>

      <section className="results" aria-labelledby="places-heading">
        <div className="results-bar">
          <h2 id="places-heading" aria-live="polite">
            {results.length} {results.length === 1 ? "place" : "places"}
            {dest && destinationName.get(dest) ? ` in ${destinationName.get(dest)}` : ""}
          </h2>
          <div className="results-tools">
            <button
              type="button"
              className="button button-secondary filters-open"
              onClick={() => setFiltersOpen(true)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal size={16} aria-hidden="true" /> Filters
              {activeFilters ? ` (${activeFilters})` : ""}
            </button>
            <label className="sort">
              <span className="visually-hidden">Sort by</span>
              <select
                value={sort}
                onChange={(event) =>
                  update({ sort: event.target.value === "popular" ? "" : event.target.value })
                }
              >
                {SORTS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        {results.length === 0 ? (
          <EmptyState title="No places match these filters">
            Try another type or destination, or clear the filters.
          </EmptyState>
        ) : (
          <>
            <div className="card-grid">
              {results.slice(0, shown).map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  stateId={doc.id}
                  where={destinationName.get(place.destination) ?? place.area}
                />
              ))}
            </div>
            {shown < results.length && (
              <div className="more">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => setShown((value) => value + PAGE)}
                >
                  Show more ({results.length - shown} left)
                </button>
              </div>
            )}
          </>
        )}
      </section>
      {filtersOpen && (
        <button
          type="button"
          className="sheet-backdrop"
          aria-label="Close filters"
          onClick={() => setFiltersOpen(false)}
        />
      )}
    </div>
  );
}
