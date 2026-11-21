import {
  ArrowRight,
  CalendarHeart,
  Compass,
  Landmark,
  Languages,
  Map as MapIcon,
  MapPin,
  Ruler,
  ShieldPlus,
  Sparkles,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { useMemo } from "react";
import { DishCard, PlaceCard } from "../components/Cards.jsx";
import { Credit, ErrorState, PageSkeleton, Photo, SectionHeader, SourceLink } from "../components/ui.jsx";
import { useStateData } from "../lib/catalogue.js";
import { formatArea, formatPopulation, formatYear, monthRanges, sentences } from "../lib/format.js";
import { links } from "../lib/router.js";
import { FoodTab } from "./state/FoodTab.jsx";
import { MapTab } from "./state/MapTab.jsx";
import { PlacesTab } from "./state/PlacesTab.jsx";
import { PracticalTab } from "./state/PracticalTab.jsx";
import { NotFoundView } from "./NotFoundView.jsx";

const TABS = [
  { id: "overview", label: "Overview", icon: Compass },
  { id: "places", label: "Places", icon: Landmark },
  { id: "food", label: "Food", icon: UtensilsCrossed },
  { id: "practical", label: "Practical", icon: ShieldPlus },
  { id: "map", label: "Map", icon: MapIcon },
];

function StateHeader({ doc, compact }) {
  const { facts } = doc;
  const season = monthRanges(doc.climate?.best ?? []);
  const chips = [
    facts.capital && { icon: MapPin, label: "Capital", value: facts.capital },
    facts.areaKm2 && { icon: Ruler, label: "Area", value: formatArea(facts.areaKm2) },
    facts.population && {
      icon: Users,
      label: "Population",
      value: `${formatPopulation(facts.population)}${facts.populationYear ? ` (${facts.populationYear})` : ""}`,
    },
    facts.districts && { icon: Compass, label: "Districts", value: facts.districts },
    facts.languages?.length && {
      icon: Languages,
      label: "Official language",
      value: facts.languages.slice(0, 2).join(", "),
    },
    formatYear(facts.formed) && { icon: Landmark, label: "Formed", value: formatYear(facts.formed) },
    season && { icon: CalendarHeart, label: "Best months", value: season },
  ].filter(Boolean);
  return (
    <header className={`state-hero ${compact ? "state-hero-compact" : ""}`}>
      <div className="state-hero-media">
        <Photo image={doc.hero} alt="" sizes="100vw" eager />
      </div>
      <div className="state-hero-inner container">
        <nav aria-label="Breadcrumb" className="breadcrumbs">
          <a href={links.home()}>Home</a>
          <span aria-hidden="true">/</span>
          <a href={links.states()}>States</a>
        </nav>
        <h1>
          {doc.name}
          {doc.nativeName && doc.nativeName !== doc.name && (
            <span className="native-name" lang={doc.nativeLang}>
              {doc.nativeName}
            </span>
          )}
        </h1>
        {!compact && doc.intro[0] && <p className="state-hero-lead">{sentences(doc.intro[0], 2)}</p>}
        {!compact && (
          <dl className="fact-chips" tabIndex={0} aria-label="Key facts">
            {chips.map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <dt>
                  <Icon size={14} aria-hidden="true" />
                  {label}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {doc.hero && <Credit image={doc.hero} className="credit-light state-hero-credit" />}
    </header>
  );
}

function Tabs({ doc, tab }) {
  return (
    <nav className="tabs" aria-label={`${doc.name} sections`}>
      <div className="tabs-inner container">
        {TABS.map(({ id, label, icon: Icon }) => (
          <a key={id} href={links.state(doc.id, id)} aria-current={tab === id ? "page" : undefined}>
            <Icon size={16} aria-hidden="true" />
            {label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function OverviewTab({ doc }) {
  const destinationName = useMemo(
    () => new Map(doc.destinations.map((destination) => [destination.id, destination.name])),
    [doc],
  );
  const sights = doc.places.filter((place) => place.category !== "food" && place.image).slice(0, 6);
  const destinations = [...doc.destinations]
    .sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)))
    .slice(0, 8);
  return (
    <div className="container stack-xl">
      {doc.intro.length > 0 && (
        <section className="prose-block" aria-label="About">
          {doc.intro.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
          <SourceLink source={doc.source}>Read more on Wikivoyage</SourceLink>
        </section>
      )}

      <section aria-labelledby="top-sights">
        <SectionHeader
          id="top-sights"
          eyebrow="Don't miss"
          title="Top sights"
          action={
            <a className="text-link" href={links.state(doc.id, "places")}>
              All {doc.places.filter((place) => place.category !== "food").length} places{" "}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          }
        />
        <div className="card-grid">
          {sights.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              stateId={doc.id}
              where={destinationName.get(place.destination)}
            />
          ))}
        </div>
      </section>

      {destinations.length > 0 && (
        <section aria-labelledby="destinations">
          <SectionHeader id="destinations" eyebrow="Where to go" title="Destinations" />
          <div className="destination-grid">
            {destinations.map((destination) => (
              <a
                key={destination.id}
                className="destination-card"
                href={links.state(doc.id, "places", { dest: destination.id })}
              >
                <Photo
                  image={destination.image}
                  fallbackIcon={MapPin}
                  sizes="(max-width: 720px) 50vw, 300px"
                />
                <span className="destination-card-body">
                  <strong>{destination.name}</strong>{" "}
                  {destination.intro && (
                    <span>
                      {destination.intro.slice(0, 90)}
                      {destination.intro.length > 90 ? "…" : ""}
                    </span>
                  )}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {doc.dishes.length > 0 && (
        <section aria-labelledby="signature-dishes">
          <SectionHeader
            id="signature-dishes"
            eyebrow="Taste"
            title="Signature dishes"
            action={
              <a className="text-link" href={links.state(doc.id, "food")}>
                Food guide <ArrowRight size={16} aria-hidden="true" />
              </a>
            }
          />
          <div className="dish-scroller">
            {doc.dishes.slice(0, 6).map((dish) => (
              <DishCard key={dish.id} dish={dish} />
            ))}
          </div>
        </section>
      )}

      <section className="cta-band" style={{ "--accent": doc.accent }}>
        <Sparkles aria-hidden="true" />
        <div>
          <h2>Planning a trip?</h2>
          <p>See the most comfortable months, how to get there, helplines and nearby services.</p>
        </div>
        <a className="button button-accent" href={links.state(doc.id, "practical")}>
          Practical guide
        </a>
      </section>
    </div>
  );
}

export function StateView({ route }) {
  const { status, data: doc, retry } = useStateData(route.stateId);
  if (status === "loading") return <PageSkeleton label="Loading state guide…" />;
  if (status === "missing") return <NotFoundView title="We don't cover this state yet" />;
  if (status === "error") {
    return (
      <div className="container section">
        <ErrorState title="This guide could not be loaded" onRetry={retry}>
          Check your connection and try again.
        </ErrorState>
      </div>
    );
  }
  return (
    <article className="state-page" style={{ "--accent": doc.accent }}>
      <StateHeader doc={doc} compact={route.tab !== "overview"} />
      <Tabs doc={doc} tab={route.tab} />
      <div className="state-body">
        {route.tab === "overview" && <OverviewTab doc={doc} />}
        {route.tab === "places" && <PlacesTab doc={doc} params={route.params} />}
        {route.tab === "food" && <FoodTab doc={doc} params={route.params} />}
        {route.tab === "practical" && <PracticalTab doc={doc} params={route.params} />}
        {route.tab === "map" && <MapTab doc={doc} params={route.params} />}
      </div>
    </article>
  );
}
