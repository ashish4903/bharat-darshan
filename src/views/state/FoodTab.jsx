import { Clock, IndianRupee, MapPin } from "lucide-react";
import { useMemo } from "react";
import { DishCard } from "../../components/Cards.jsx";
import { EmptyState, SectionHeader } from "../../components/ui.jsx";
import { excerpt } from "../../lib/format.js";
import { links, replaceParams } from "../../lib/router.js";

/** Signature dishes, then well-known places to eat and drink, grouped by destination. */
export function FoodTab({ doc, params }) {
  const dest = params.dest ?? "";
  const eateries = useMemo(() => doc.places.filter((place) => place.category === "food"), [doc]);
  const groups = useMemo(() => {
    const byDestination = new Map();
    eateries
      .filter((place) => !dest || place.destination === dest)
      .forEach((place) => {
        const key = place.destination ?? "_";
        byDestination.set(key, [...(byDestination.get(key) ?? []), place]);
      });
    const name = new Map(doc.destinations.map((destination) => [destination.id, destination.name]));
    return [...byDestination.entries()]
      .map(([id, places]) => ({ id, name: name.get(id) ?? `Around ${doc.name}`, places }))
      .sort((a, b) => b.places.length - a.places.length);
  }, [eateries, dest, doc]);
  const destinationsWithFood = doc.destinations.filter((destination) =>
    eateries.some((place) => place.destination === destination.id),
  );

  return (
    <div className="container stack-xl">
      <section aria-labelledby="dishes-heading">
        <SectionHeader
          id="dishes-heading"
          eyebrow="What to eat"
          title={`Signature dishes of ${doc.name}`}
          intro={doc.foodNote ?? "Ordered by how often people read about them on Wikipedia."}
        />
        {doc.dishes.length ? (
          <div className="dish-grid">
            {doc.dishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        ) : (
          <EmptyState title="No dishes listed yet" />
        )}
      </section>

      <section aria-labelledby="eat-heading">
        <SectionHeader
          id="eat-heading"
          eyebrow="Where to eat"
          title="Well-known places to eat and drink"
          intro="As listed by Wikivoyage travellers. Prices and hours change — check before you go."
          action={
            destinationsWithFood.length > 1 && (
              <label className="inline-select">
                <span>Destination</span>
                <select value={dest} onChange={(event) => replaceParams({ dest: event.target.value })}>
                  <option value="">Everywhere</option>
                  {destinationsWithFood.map((destination) => (
                    <option key={destination.id} value={destination.id}>
                      {destination.name}
                    </option>
                  ))}
                </select>
              </label>
            )
          }
        />
        {groups.length === 0 ? (
          <EmptyState title="No eateries listed here yet" />
        ) : (
          <div className="eatery-groups">
            {groups.map((group) => (
              <section key={group.id} className="eatery-group" aria-label={group.name}>
                <h3>
                  {group.name} <span>{group.places.length}</span>
                </h3>
                <ul>
                  {group.places.slice(0, 12).map((place) => (
                    <li key={place.id}>
                      <a href={links.place(doc.id, place.id)}>{place.name}</a>
                      {place.description && <p>{excerpt(place.description, 120)}</p>}
                      <span className="eatery-meta">
                        {place.price && (
                          <span>
                            <IndianRupee size={13} aria-hidden="true" />
                            {excerpt(place.price, 40)}
                          </span>
                        )}
                        {place.hours && (
                          <span>
                            <Clock size={13} aria-hidden="true" />
                            {excerpt(place.hours, 40)}
                          </span>
                        )}
                        {place.area && (
                          <span>
                            <MapPin size={13} aria-hidden="true" />
                            {place.area}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
