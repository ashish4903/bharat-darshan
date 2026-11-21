import { useMemo } from "react";
import { MapView } from "../../components/MapView.jsx";
import { CategoryChip } from "../../components/ui.jsx";
import { category as categoryMeta, categoryCounts } from "../../lib/categories.js";
import { links, replaceParams } from "../../lib/router.js";

export function MapTab({ doc, params }) {
  const cat = params.cat ?? "";
  const located = useMemo(() => doc.places.filter((place) => place.lat != null), [doc]);
  const counts = useMemo(() => categoryCounts(located), [located]);
  const points = useMemo(
    () =>
      located
        .filter((place) => !cat || place.category === cat)
        .map((place) => ({
          id: place.id,
          name: place.name,
          lat: place.lat,
          lon: place.lon,
          hue: categoryMeta(place.category).hue,
          href: links.place(doc.id, place.id),
        })),
    [located, cat, doc.id],
  );
  return (
    <div className="container stack-md">
      <div className="chip-wrap" role="group" aria-label="Show on map">
        <button
          type="button"
          className={`chip ${!cat ? "active" : ""}`}
          aria-pressed={!cat}
          onClick={() => replaceParams({ cat: "" })}
        >
          Everything <b>{located.length}</b>
        </button>
        {counts.map((item) => (
          <CategoryChip
            key={item.id}
            id={item.id}
            count={item.count}
            as="button"
            active={cat === item.id}
            onClick={() => replaceParams({ cat: cat === item.id ? "" : item.id })}
          />
        ))}
      </div>
      <MapView points={points} center={doc.center} label={`Map of places in ${doc.name}`} height={620} />
      <p className="fine-print">
        {points.length} places shown. Places without coordinates in the sources are listed under Places. Map ©
        OpenFreeMap, data © OpenStreetMap contributors.
      </p>
    </div>
  );
}
