# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-11-20

### Added

- **Five pilot states:** Maharashtra, Goa, Rajasthan, Kerala and Delhi.
- **Open-data pipeline** (`npm run data`):
  - Sources:
    - Wikivoyage listings and destinations
    - Wikidata attractions, facts and nearby services
    - Wikipedia dishes
    - Wikimedia Commons photo credits
    - Open-Meteo climate normals
  - Validation that fails the build on a missing source, coordinates outside the state, or an unlicensed photo.
- **Home page:** rotating photo hero, search, a schematic tile map of all states and union territories, state cards, iconic places and dishes.
- **State pages** with overview, places (filterable by type and destination), food (dishes and eateries), practical information (climate chart, best months, arrival, helplines, nearby services) and a map.
- **Place pages:** photo with credit, details, directions, sharing, a mini map, nearby places and source links.
- **Search:** typo-tolerant, across all places, dishes and destinations, with filters.
- **About page** with every source and license.
- **Accessibility and responsiveness:** light and dark themes, responsive layouts from 320 px, keyboard support and reduced motion.
- **Quality gates:**
  - ESLint and Prettier
  - Vitest unit and component tests with coverage thresholds
  - Playwright end-to-end tests with axe WCAG 2.2 A/AA checks
  - CI on pull requests, and deployment to GitHub Pages
