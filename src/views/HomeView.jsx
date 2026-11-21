import { ArrowRight, BadgeCheck, Database, HeartHandshake, MapPinned } from "lucide-react";
import { useEffect, useState } from "react";
import { DishCard, PlaceCard } from "../components/Cards.jsx";
import { SearchBox } from "../components/SearchBox.jsx";
import { StateCard } from "../components/StateCard.jsx";
import { TileMap } from "../components/TileMap.jsx";
import { Credit, SectionHeader } from "../components/ui.jsx";
import { links } from "../lib/router.js";
import { srcSet } from "../lib/images.js";

const HERO_INTERVAL_MS = 7000;

function useRotation(length) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (length < 2 || reduced) return undefined;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % length), HERO_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [length]);
  return index;
}

function Hero({ index }) {
  const slides = index.states.filter((state) => state.hero);
  const active = useRotation(slides.length);
  const totals = index.states.reduce(
    (sum, state) => ({ places: sum.places + state.counts.places, dishes: sum.dishes + state.counts.dishes }),
    { places: 0, dishes: 0 },
  );
  const current = slides[active];
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-slides" aria-hidden="true">
        {slides.map((state, position) => (
          <img
            key={state.id}
            className={position === active ? "is-active" : ""}
            src={state.hero.src}
            srcSet={srcSet(state.hero)}
            sizes="100vw"
            alt=""
            loading={position === 0 ? "eager" : "lazy"}
            fetchPriority={position === 0 ? "high" : undefined}
          />
        ))}
      </div>
      <div className="hero-inner">
        <p className="eyebrow eyebrow-light">Free · open data · no sign-up</p>
        <h1 id="hero-title">
          Discover India, <span>one state at a time.</span>
        </h1>
        <p className="hero-lead">
          Places worth the journey, food worth the detour and the practical details in between — gathered from
          open sources into one calm, ad-free guide.
        </p>
        <SearchBox />
        <ul className="hero-stats" aria-label="In this guide">
          <li>
            <b>{index.states.length}</b> {index.states.length === 1 ? "state" : "states"} live
          </li>
          <li>
            <b>{totals.places.toLocaleString("en-IN")}</b> places
          </li>
          <li>
            <b>{totals.dishes}</b> signature dishes
          </li>
        </ul>
      </div>
      {current && (
        <div className="hero-caption">
          <a href={links.state(current.id)}>{current.name}</a>
          <Credit image={current.hero} className="credit-light" />
        </div>
      )}
    </section>
  );
}

export function HomeView({ index }) {
  const [highlighted, setHighlighted] = useState(null);
  const names = new Map(index.states.map((state) => [state.id, state.name]));
  return (
    <div className="home">
      <Hero index={index} />

      <section className="section container" aria-labelledby="states-title">
        <SectionHeader
          id="states-title"
          eyebrow="Start exploring"
          title="Pick a state"
          intro="Five states are live, with more on the way. Each one brings places, local food, the best months to visit and what to know before you go."
          action={
            <a className="text-link" href={links.states()}>
              All states <ArrowRight size={16} aria-hidden="true" />
            </a>
          }
        />
        <div className="states-layout">
          <TileMap
            tiles={index.tiles}
            live={index.states}
            highlighted={highlighted}
            onHover={setHighlighted}
          />
          <div className="state-grid">
            {index.states.map((state) => (
              <StateCard
                key={state.id}
                state={state}
                highlighted={highlighted === state.id}
                onHover={setHighlighted}
              />
            ))}
          </div>
        </div>
      </section>

      {index.featured?.places?.length > 0 && (
        <section className="section section-tint" aria-labelledby="sights-title">
          <div className="container">
            <SectionHeader
              id="sights-title"
              eyebrow="Worth the journey"
              title="Iconic places"
              intro="The best-known sights of each live state."
            />
            <div className="card-grid">
              {index.featured.places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  stateId={place.state}
                  where={place.where}
                  showState={names.get(place.state)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {index.featured?.dishes?.length > 0 && (
        <section className="section container" aria-labelledby="food-title">
          <SectionHeader
            id="food-title"
            eyebrow="Taste of India"
            title="Dishes to try"
            intro="The most-read regional dishes from each state."
          />
          <div className="dish-scroller">
            {index.featured.dishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} stateName={names.get(dish.state)} />
            ))}
          </div>
        </section>
      )}

      <section className="section container" aria-labelledby="promise-title">
        <SectionHeader id="promise-title" eyebrow="Why this guide" title="Built on open knowledge" />
        <ul className="promise-grid">
          <li>
            <Database aria-hidden="true" />
            <h3>Open, cited sources</h3>
            <p>
              Every place, dish and photo links back to Wikivoyage, Wikipedia, Wikidata, Commons or
              OpenStreetMap.
            </p>
          </li>
          <li>
            <BadgeCheck aria-hidden="true" />
            <h3>Nothing made up</h3>
            <p>Entries come from the sources as written. If a fact isn&apos;t sourced, it isn&apos;t here.</p>
          </li>
          <li>
            <MapPinned aria-hidden="true" />
            <h3>Practical, not promotional</h3>
            <p>Climate-based best months, helplines and nearby services sit next to the sights.</p>
          </li>
          <li>
            <HeartHandshake aria-hidden="true" />
            <h3>Free for everyone</h3>
            <p>No ads, no accounts and no tracking. Improve the guide by improving the open sources.</p>
          </li>
        </ul>
      </section>
    </div>
  );
}
