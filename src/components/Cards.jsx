import { MapPin } from "lucide-react";
import { category as categoryMeta } from "../lib/categories.js";
import { excerpt, formatDistance } from "../lib/format.js";
import { links } from "../lib/router.js";
import { CategoryChip, Photo } from "./ui.jsx";

/** A place in a grid: photo, category, name, location and a short description. */
export function PlaceCard({ place, stateId, where, distanceKm, showState }) {
  const meta = categoryMeta(place.category);
  return (
    <a className="place-card" href={links.place(stateId, place.id)} style={{ "--chip-hue": meta.hue }}>
      <div className="place-card-media">
        <Photo
          image={place.image}
          fallbackIcon={meta.icon}
          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 380px"
        />
        <CategoryChip id={place.category} />
      </div>
      <div className="place-card-body">
        <h3>{place.name}</h3>
        {(where || showState || distanceKm != null) && (
          <p className="place-card-where">
            <MapPin size={13} aria-hidden="true" />
            {[where, showState, distanceKm != null ? `${formatDistance(distanceKm)} away` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        {place.description && <p className="place-card-text">{excerpt(place.description, 130)}</p>}
      </div>
    </a>
  );
}

/** A dish: photo, name and description, linking to the Wikipedia article. */
export function DishCard({ dish, stateName }) {
  return (
    <article className="dish-card">
      <div className="dish-card-media">
        <Photo image={dish.image} sizes="(max-width: 720px) 100vw, 300px" />
      </div>
      <div className="dish-card-body">
        <h3>{dish.name}</h3>
        {stateName && <p className="dish-card-state">{stateName}</p>}
        <p>{excerpt(dish.description, 170)}</p>
        <a className="text-link" href={dish.source.url} target="_blank" rel="noreferrer">
          Read on Wikipedia<span className="visually-hidden"> about {dish.name}</span>
        </a>
      </div>
    </article>
  );
}
