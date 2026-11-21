import { Bus, Hospital, Info, Phone, Plane, Shield, TrainFront } from "lucide-react";
import { useMemo } from "react";
import { ClimateChart } from "../../components/ClimateChart.jsx";
import { SectionHeader, SourceLink } from "../../components/ui.jsx";
import { formatDistance, monthRanges } from "../../lib/format.js";
import { replaceParams } from "../../lib/router.js";

const SERVICE_TYPES = [
  { id: "hospital", label: "Hospitals", icon: Hospital },
  { id: "police", label: "Police", icon: Shield },
  { id: "tourist-info", label: "Tourist information", icon: Info },
  { id: "railway", label: "Railway stations", icon: TrainFront },
  { id: "bus", label: "Bus stations", icon: Bus },
  { id: "airport", label: "Airports", icon: Plane },
];

function directions(service) {
  if (service.lat == null) return null;
  return `https://www.openstreetmap.org/directions?to=${service.lat}%2C${service.lon}`;
}

/** Best time to visit, getting there, helplines and services near each main destination. */
export function PracticalTab({ doc, params }) {
  const hubs = useMemo(() => {
    const ids = [...new Set(doc.services.map((service) => service.destination))];
    const name = new Map(doc.destinations.map((destination) => [destination.id, destination.name]));
    return ids.map((id) => ({ id: id ?? "", name: name.get(id) ?? doc.name }));
  }, [doc]);
  const hub = hubs.find((item) => item.id === params.near) ?? hubs[0];
  const services = doc.services.filter((service) => (service.destination ?? "") === hub?.id);
  // The same airport is found near several towns: list each once, scheduled airports (IATA) first.
  const airports = [
    ...new Map(
      doc.services
        .filter((service) => service.type === "airport")
        .map((service) => [service.iata ?? service.name, service]),
    ).values(),
  ].sort((a, b) => Number(Boolean(b.iata)) - Number(Boolean(a.iata)));
  const { climate } = doc;
  const best = monthRanges(climate?.best ?? [], { long: true });

  return (
    <div className="container stack-xl">
      {climate && (
        <section aria-labelledby="when-heading" className="panel">
          <SectionHeader
            id="when-heading"
            eyebrow="When to go"
            title={best ? `Most comfortable: ${best}` : "Climate through the year"}
            intro={`Averages for ${climate.place}, ${climate.period}. "Comfortable" means under ${climate.rule.maxRainMm} mm of rain in the month and average highs of ${climate.rule.maxTempC} °C or less.`}
          />
          <ClimateChart climate={climate} />
          <SourceLink source={climate.source} />
        </section>
      )}

      <div className="two-col">
        <section aria-labelledby="getin-heading" className="panel">
          <SectionHeader id="getin-heading" eyebrow="Getting there" title="Arriving" />
          {doc.getIn.map((paragraph) => (
            <p key={paragraph.slice(0, 40)} className="prose">
              {paragraph}
            </p>
          ))}
          {airports.length > 0 && (
            <ul className="airport-list">
              {airports.map((airport) => (
                <li key={airport.id}>
                  <Plane size={16} aria-hidden="true" />
                  <span>
                    <strong>{airport.name}</strong>
                    {airport.iata && <b className="iata">{airport.iata}</b>}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <SourceLink source={doc.source}>Full &ldquo;Get in&rdquo; guide on Wikivoyage</SourceLink>
        </section>

        <section aria-labelledby="help-heading" className="panel panel-accent">
          <SectionHeader id="help-heading" eyebrow="Save these" title="Helplines" />
          <ul className="helplines">
            {doc.helplines.map((line) => (
              <li key={line.number}>
                <a href={`tel:${line.number}`} className="helpline-number">
                  <Phone size={16} aria-hidden="true" />
                  {line.number}
                </a>
                <span>{line.label}</span>
                <a className="helpline-source" href={line.source.url} target="_blank" rel="noreferrer">
                  {line.source.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {hubs.length > 0 && (
        <section aria-labelledby="services-heading">
          <SectionHeader
            id="services-heading"
            eyebrow="Nearby services"
            title={`Useful places near ${hub.name}`}
            intro="From Wikidata. Listings can be incomplete or out of date; in an emergency call 112."
            action={
              hubs.length > 1 && (
                <label className="inline-select">
                  <span>Near</span>
                  <select value={hub.id} onChange={(event) => replaceParams({ near: event.target.value })}>
                    {hubs.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>
              )
            }
          />
          <div className="service-grid">
            {SERVICE_TYPES.map(({ id, label, icon: Icon }) => {
              const items = services.filter((service) => service.type === id);
              if (items.length === 0) return null;
              return (
                <section key={id} className="service-card" aria-label={label}>
                  <h3>
                    <Icon size={18} aria-hidden="true" />
                    {label}
                  </h3>
                  <ul>
                    {items.map((service) => (
                      <li key={service.id}>
                        <span className="service-name">{service.name}</span>
                        <span className="service-meta">
                          {formatDistance(service.km)}
                          {service.phone && (
                            <>
                              {" "}
                              · <a href={`tel:${service.phone.split(";")[0].replace(/\s+/g, "")}`}>Call</a>
                            </>
                          )}
                          {directions(service) && (
                            <>
                              {" "}
                              ·{" "}
                              <a href={directions(service)} target="_blank" rel="noreferrer">
                                Directions
                              </a>
                            </>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <p className="fine-print">
            Service data from Wikidata (CC0). Distances are straight-line from the town centre.
          </p>
        </section>
      )}
    </div>
  );
}
