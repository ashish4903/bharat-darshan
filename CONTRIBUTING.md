# Contributing

Thanks for helping improve Bharat Darshan. There are two kinds of contribution.

## 1. Content: fix it at the source

All places, dishes, photos and facts come from open projects. To add a place or correct a detail, edit the source. The change appears here at the next data refresh.

| What                                                     | Where to edit                                                                                      |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Places to see, things to do, where to eat                | The destination's article on [Wikivoyage](https://en.wikivoyage.org/), using its listing templates |
| Dishes                                                   | The dish's article and cuisine category on [Wikipedia](https://en.wikipedia.org/)                  |
| Facts, coordinates, types, hospitals, stations, airports | The item on [Wikidata](https://www.wikidata.org/)                                                  |
| Photos                                                   | [Wikimedia Commons](https://commons.wikimedia.org/)                                                |

Helpline numbers live in `data/curated/india.json`. Every entry there must link to an official source.

## 2. Code

```bash
npm ci
npm run dev          # local site
npm run check        # lint, formatting, unit tests with coverage, build
npx playwright install chromium   # once
npm run test:e2e     # end-to-end and accessibility tests
```

Work on a branch, open a pull request and fill in the template. Conventions:

- [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, for example `feat: add Karnataka`.
- Plain React and CSS. One component per file in `src/components`; pure logic goes in `src/lib` with tests next to it.
- Accessibility first. Pages must pass the axe checks in light and dark themes.
- Add a line to `CHANGELOG.md` under "Unreleased".

### Refreshing or adding data

```bash
npm run data                 # rebuild every state (cached responses in data/raw)
npm run data -- goa          # rebuild one state
REFRESH=1 npm run data       # ignore the cache and refetch
```

To add a state:

1. Add an entry to `data/states.config.json`: its Wikidata item, Wikivoyage article, Wikipedia cuisine categories, climate destination, bounding box and accent colour.
2. Run `npm run data -- <id>`.
3. Review the counts and spot-check entries.

The build fails if any entry lacks a source, has coordinates outside the state, or has a photo without license details.

No API keys are needed. Never commit secrets, `.env` files or the `data/raw` cache.
