import { ArrowLeft, Check, Clock, Copy, Globe, IndianRupee, MapPin, Navigation, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PlaceCard } from "../components/Cards.jsx";
import { MapView } from "../components/MapView.jsx";
import {
  CategoryChip,
  Credit,
  ErrorState,
  PageSkeleton,
  Photo,
  SectionHeader,
  SourceLink,
} from "../components/ui.jsx";
import { destinationName, findPlace, useStateData } from "../lib/catalogue.js";
import { category as categoryMeta } from "../lib/categories.js";
import { distanceKm } from "../lib/format.js";
import { links } from "../lib/router.js";
import { NotFoundView } from "./NotFoundView.jsx";

const NEARBY_KM = 15;

function ShareButton({ title }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Cancelled or not allowed; nothing to do.
    }
  }
  const Icon = copied ? Check : navigator.share ? Share2 : Copy;
  return (
    <button type="button" className="button button-secondary" onClick={share}>
      <Icon size={16} aria-hidden="true" /> {copied ? "Link copied" : "Share"}
    </button>
  );
}

export function PlaceView({ route }) {
  const { status, data: doc, retry } = useStateData(route.stateId);
  const place = findPlace(doc, route.placeId);
  const nearby = useMemo(() => {
    if (!doc || !place || place.lat == null) return [];
    return doc.places
      .filter((other) => other.id !== place.id && other.lat != null && other.category !== "food")
      .map((other) => ({ place: other, km: distanceKm(place, other) }))
      .filter(({ km }) => km <= NEARBY_KM)
      .sort((a, b) => a.km - b.km)
      .slice(0, 6);
  }, [doc, place]);
  useEffect(() => {
    if (place) document.title = `${place.name} — ${doc.name} · Bharat Darshan`;
  }, [place, doc]);

  if (status === "loading") return <PageSkeleton label="Loading place…" />;
  if (status === "error") {
    return (
      <div className="container section">
        <ErrorState title="This place could not be loaded" onRetry={retry} />
      </div>
    );
  }
  if (!doc || !place) return <NotFoundView title="We couldn't find that place" />;

  const meta = categoryMeta(place.category);
  const where = destinationName(doc, place.destination);
  const coords = place.lat != null ? `${place.lat},${place.lon}` : null;
  const localNames = [place.names?.hi, place.names?.mr].filter(
    (name, index, all) => name && all.indexOf(name) === index,
  );

  return (
    <article className="place-page" style={{ "--accent": doc.accent, "--chip-hue": meta.hue }}>
      <div className="container">
        <nav aria-label="Breadcrumb" className="breadcrumbs breadcrumbs-dark">
          <a href={links.state(doc.id)}>{doc.name}</a>
          <span aria-hidden="true">/</span>
          <a
            href={links.state(
              doc.id,
              place.category === "food" ? "food" : "places",
              place.destination ? { dest: place.destination } : undefined,
            )}
          >
            {where ?? (place.category === "food" ? "Food" : "Places")}
          </a>
        </nav>
      </div>
      <div className="container place-layout">
        <div className="place-main">
          <figure className="place-photo">
            <Photo
              image={place.image}
              alt={place.image ? place.name : ""}
              fallbackIcon={meta.icon}
              sizes="(max-width: 960px) 100vw, 760px"
              eager
            />
            {place.image && (
              <figcaption>
                <Credit image={place.image} />
              </figcaption>
            )}
          </figure>
          <header className="place-header">
            <CategoryChip id={place.category} />
            <h1>{place.name}</h1>
            {(place.alt || localNames.length > 0) && (
              <p className="place-alt">{[place.alt, ...localNames].filter(Boolean).join(" · ")}</p>
            )}
            {(where || place.area) && (
              <p className="place-where">
                <MapPin size={16} aria-hidden="true" />
                {[place.area, where, doc.name].filter(Boolean).join(", ")}
              </p>
            )}
          </header>
          {place.description ? (
            <p className="place-description">{place.description}</p>
          ) : (
            <p className="muted">No description in the sources yet.</p>
          )}
          <div className="place-actions">
            {coords && (
              <a
                className="button button-accent"
                href={`https://www.google.com/maps/dir/?api=1&destination=${coords}`}
                target="_blank"
                rel="noreferrer"
              >
                <Navigation size={16} aria-hidden="true" /> Directions
              </a>
            )}
            {coords && (
              <a
                className="button button-secondary"
                href={`https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}#map=16/${place.lat}/${place.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={16} aria-hidden="true" /> OpenStreetMap
              </a>
            )}
            <ShareButton title={place.name} />
          </div>
          <SourceLink source={place.source} />
          {place.wikipedia && place.source.name !== "Wikipedia" && (
            <a
              className="source-link"
              href={`https://en.wikipedia.org/wiki/${encodeURIComponent(place.wikipedia.replace(/ /g, "_"))}`}
              target="_blank"
              rel="noreferrer"
            >
              Wikipedia: {place.wikipedia}
            </a>
          )}
        </div>
        <aside className="place-side">
          {(place.address || place.hours || place.price || place.website) && (
            <dl className="info-list">
              {place.address && (
                <div>
                  <dt>
                    <MapPin size={15} aria-hidden="true" />
                    Address
                  </dt>
                  <dd>{place.address}</dd>
                </div>
              )}
              {place.hours && (
                <div>
                  <dt>
                    <Clock size={15} aria-hidden="true" />
                    Hours
                  </dt>
                  <dd>{place.hours}</dd>
                </div>
              )}
              {place.price && (
                <div>
                  <dt>
                    <IndianRupee size={15} aria-hidden="true" />
                    Price
                  </dt>
                  <dd>{place.price}</dd>
                </div>
              )}
              {place.website && (
                <div>
                  <dt>
                    <Globe size={15} aria-hidden="true" />
                    Website
                  </dt>
                  <dd>
                    <a href={place.website} target="_blank" rel="noreferrer">
                      {new URL(place.website).hostname.replace(/^www\./, "")}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          )}
          {coords && (
            <MapView
              compact
              height={300}
              label={`Map of ${place.name} and nearby places`}
              points={[
                { id: place.id, name: place.name, lat: place.lat, lon: place.lon, hue: meta.hue },
                ...nearby.map(({ place: other }) => ({
                  id: other.id,
                  name: other.name,
                  lat: other.lat,
                  lon: other.lon,
                  hue: categoryMeta(other.category).hue,
                  href: links.place(doc.id, other.id),
                })),
              ]}
            />
          )}
          <p className="fine-print">
            Details come from travellers&apos; listings and can change. Confirm timings and prices locally.
          </p>
        </aside>
      </div>
      {nearby.length > 0 && (
        <section className="container section" aria-labelledby="nearby-heading">
          <SectionHeader id="nearby-heading" eyebrow={`Within ${NEARBY_KM} km`} title="Nearby" />
          <div className="card-grid">
            {nearby.map(({ place: other, km }) => (
              <PlaceCard key={other.id} place={other} stateId={doc.id} distanceKm={km} />
            ))}
          </div>
        </section>
      )}
      <div className="container">
        <a className="text-link back-link" href={links.state(doc.id, "places")}>
          <ArrowLeft size={16} aria-hidden="true" /> All places in {doc.name}
        </a>
      </div>
    </article>
  );
}
