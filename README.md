# Bharat Darshan

[![CI](https://github.com/ashish4903/bharat-darshan/actions/workflows/ci.yml/badge.svg)](https://github.com/ashish4903/bharat-darshan/actions/workflows/ci.yml)

**A free, open-data travel guide to India, state by state.** Places worth the journey, food worth the detour and the practical details in between, in one fast, ad-free site.

The first release covers five pilot states: **Maharashtra, Goa, Rajasthan, Kerala and Delhi**. Every state and union territory is on the roadmap.

## Features

- **Explore by state.** A schematic tile map of all 36 states and union territories, with photo cards for the live ones.
- **Places**, filterable by type and destination: heritage, spiritual, museums, nature, beaches, wildlife, experiences and more.
- **Food guide.** Each state's signature dishes, plus well-known places to eat and drink, grouped by town.
- **Practical guide**:
  - the most comfortable months, from ten years of daily weather data
  - how to get there and nearby airports
  - national helplines, linked to their official sources
  - hospitals, railway stations and bus stations near each main town
- **Maps.** Interactive maps of every state and place, colour-coded by category.
- **Search.** Typo-tolerant search across every place, dish and destination.
- **Place pages.** Photo with credit, details, directions, nearby places and source links.
- **Accessible and responsive.** Light and dark themes, keyboard and screen-reader friendly, from 320 px phones to wide desktops.
- **Private by design.** No accounts, cookies, ads or trackers, and no API keys.

## Where the content comes from

Nothing is invented. A build script gathers entries from open sources and keeps only those it can attribute:

- **Wikivoyage:** destinations, sights, activities and food listings
- **Wikipedia:** dishes and notable attractions
- **Wikidata:** facts, coordinates and nearby services
- **Wikimedia Commons:** photos, each credited
- **Open-Meteo:** climate data

It then validates every entry: each needs a source link, coordinates inside the state, and a license on every photo. See [DATA_LICENSE.md](DATA_LICENSE.md) for licenses.

## Getting started

Requires Node.js 20 or newer.

```bash
npm ci
npm run dev       # http://localhost:5173
```

| Command                              | What it does                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `npm run dev`                        | Development server                                                             |
| `npm run build` / `npm run preview`  | Production build and local preview                                             |
| `npm run lint` / `npm run format`    | ESLint and Prettier                                                            |
| `npm test` / `npm run test:coverage` | Vitest unit and component tests (coverage thresholds enforced)                 |
| `npm run test:e2e`                   | Playwright end-to-end and axe accessibility tests on desktop, tablet and phone |
| `npm run check`                      | Lint, formatting, tests with coverage and build, as run in CI                  |
| `npm run data [-- <state>]`          | Rebuild content from the open sources                                          |

## Project structure

```
data/                 state configuration, tile layout, curated helplines (sources cited)
scripts/              build-data.mjs and its tested helpers (parsing, categories, climate, validation)
src/data/             generated content: index, search index, one file per state (lazy-loaded)
src/lib/              routing, data access, search, formatting, images, theme
src/components/       UI components (cards, maps, charts, header, footer…)
src/views/            Home, States, State (overview / places / food / practical / map), Place, Search, About
src/styles/           design tokens (light and dark), base, layout, components, pages
e2e/                  Playwright tests
```

## Deployment

Every push to `main` runs the full CI suite. If it passes, the site is published to GitHub Pages at <https://ashish4903.github.io/bharat-darshan/>. The site is static, so any static host works.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md). The quickest way to improve content is to improve the open source it comes from.

## License

Code: [MIT](LICENSE). Content: see [DATA_LICENSE.md](DATA_LICENSE.md).
