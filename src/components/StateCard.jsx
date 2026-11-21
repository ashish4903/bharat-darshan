import { ArrowUpRight, CalendarHeart, MapPin, UtensilsCrossed } from "lucide-react";
import { monthRanges, plural } from "../lib/format.js";
import { links } from "../lib/router.js";
import { Photo } from "./ui.jsx";

export function StateCard({ state, highlighted, onHover }) {
  const season = monthRanges(state.best);
  return (
    <a
      className={`state-card ${highlighted ? "is-highlighted" : ""}`}
      href={links.state(state.id)}
      style={{ "--accent": state.accent }}
      onMouseEnter={() => onHover?.(state.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="state-card-media">
        <Photo image={state.hero} sizes="(max-width: 720px) 100vw, 400px" />
        <span className="state-card-code" aria-hidden="true">
          {state.code}
        </span>
      </div>
      <div className="state-card-body">
        <div className="state-card-title">
          <h3>{state.name}</h3>
          {state.nativeName && state.nativeName !== state.name && (
            <span className="native-name" lang={state.nativeLang}>
              {state.nativeName}
            </span>
          )}
          <ArrowUpRight className="state-card-arrow" size={20} aria-hidden="true" />
        </div>
        {state.tagline && <p className="state-card-tagline">{state.tagline}</p>}
        <ul className="state-card-stats">
          <li>
            <MapPin size={14} aria-hidden="true" /> {plural(state.counts.places, "place")}
          </li>
          <li>
            <UtensilsCrossed size={14} aria-hidden="true" /> {plural(state.counts.dishes, "dish", "dishes")}
          </li>
          {season && (
            <li>
              <CalendarHeart size={14} aria-hidden="true" /> {season}
            </li>
          )}
        </ul>
      </div>
    </a>
  );
}
