import { useState } from "react";
import { StateCard } from "../components/StateCard.jsx";
import { TileMap } from "../components/TileMap.jsx";
import { SectionHeader } from "../components/ui.jsx";

export function StatesView({ index }) {
  const [highlighted, setHighlighted] = useState(null);
  const comingSoon = index.tiles.filter((tile) => !index.states.some((state) => state.code === tile.code));
  return (
    <div className="container section">
      <SectionHeader
        as="h1"
        eyebrow="India"
        title="States and union territories"
        intro={`${index.states.length} live now, ${comingSoon.length} on the way.`}
      />
      <div className="states-layout">
        <TileMap tiles={index.tiles} live={index.states} highlighted={highlighted} onHover={setHighlighted} />
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
      <section className="section-tight" aria-labelledby="soon-heading">
        <h2 id="soon-heading" className="subheading">
          Coming soon
        </h2>
        <ul className="soon-list">
          {comingSoon.map((tile) => (
            <li key={tile.code}>
              {tile.name}
              {tile.type === "ut" && <span className="soon-ut">UT</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const SOURCES = [
  {
    name: "Wikivoyage",
    use: "Destinations, places to see, things to do and where to eat; state introductions and how to get there.",
    license: "CC BY-SA 4.0",
    url: "https://en.wikivoyage.org/",
  },
  {
    name: "Wikipedia",
    use: "Regional dishes and their descriptions.",
    license: "CC BY-SA 4.0",
    url: "https://en.wikipedia.org/",
  },
  {
    name: "Wikidata",
    use: "State facts, notable attractions, place types, coordinates, local-language names, and nearby hospitals, stations and airports.",
    license: "CC0",
    url: "https://www.wikidata.org/",
  },
  {
    name: "Wikimedia Commons",
    use: "Photographs. Each photo is credited where it appears, with its own license.",
    license: "Per file",
    url: "https://commons.wikimedia.org/",
  },
  {
    name: "OpenStreetMap",
    use: "The map data behind the interactive maps.",
    license: "ODbL 1.0",
    url: "https://www.openstreetmap.org/copyright",
  },
  {
    name: "OpenFreeMap",
    use: "Map tiles.",
    license: "OpenStreetMap data, ODbL",
    url: "https://openfreemap.org/",
  },
  {
    name: "Open-Meteo",
    use: "Ten years of daily weather (ERA5) behind the best-months charts.",
    license: "CC BY 4.0",
    url: "https://open-meteo.com/",
  },
  {
    name: "Government of India portals",
    use: "National helpline numbers, each linked to its official source.",
    license: "Public information",
    url: "https://112.gov.in/",
  },
];

export function AboutView({ index }) {
  return (
    <div className="container section about">
      <SectionHeader
        as="h1"
        eyebrow="About"
        title="A free guide built on open knowledge"
        intro="Bharat Darshan brings together what open communities have already written about India's states — places, food and practical details — in one fast, ad-free place."
      />
      <div className="two-col">
        <section className="panel">
          <h2 className="subheading">How it works</h2>
          <ol className="steps">
            <li>A build script reads the open sources below and keeps only entries it can attribute.</li>
            <li>
              It checks every entry: a source link, coordinates inside the state and a license for every
              photo.
            </li>
            <li>The site is static: no accounts, cookies, ads or tracking.</li>
          </ol>
          <p className="muted">Data last refreshed {index.generatedAt}.</p>
        </section>
        <section className="panel">
          <h2 className="subheading">Improve the guide</h2>
          <p>
            Spotted something missing or wrong? Fix it at the source — edit the place on{" "}
            <a href="https://en.wikivoyage.org/">Wikivoyage</a> or{" "}
            <a href="https://www.wikidata.org/">Wikidata</a> — and it will appear here after the next refresh.
          </p>
          <p className="muted">
            Information can change. Always confirm timings, prices and conditions locally before you travel.
          </p>
        </section>
      </div>
      <section className="section-tight" aria-labelledby="credits-heading">
        <h2 id="credits-heading" className="subheading">
          Sources and licenses
        </h2>
        <div className="table-wrap">
          <table className="credits-table">
            <thead>
              <tr>
                <th scope="col">Source</th>
                <th scope="col">Used for</th>
                <th scope="col">License</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map((source) => (
                <tr key={source.name}>
                  <th scope="row">
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.name}
                    </a>
                  </th>
                  <td>{source.use}</td>
                  <td>{source.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          Text from Wikivoyage and Wikipedia is shown under CC BY-SA 4.0; each entry links to its source. The
          site&apos;s code is MIT-licensed.
        </p>
      </section>
    </div>
  );
}
