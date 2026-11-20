#!/usr/bin/env node
/**
 * Builds the site's data from open sources:
 *   Wikivoyage (places, food spots, destinations) · Wikidata (facts, classes, images)
 *   Wikipedia (dishes) · Wikimedia Commons (image credits) · Wikidata geo-search (services)
 *   Open-Meteo (climate)
 *
 * Writes src/data/index.json, src/data/search.json and src/data/states/<id>.json.
 * Responses are cached in data/raw (gitignored); set REFRESH=1 to refetch.
 * Usage: npm run data [-- <state-id> ...]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { categorise } from "./lib/categorise.mjs";
import { bestMonths, COMFORT_RULE, monthlyNormals } from "./lib/climate.mjs";
import { distanceKm, slugify, stableId } from "./lib/geo.mjs";
import { destinationLinks, extractListings } from "./lib/listings.mjs";
import {
  categoryDishes,
  commonsImages,
  wikidataAttractions,
  wikipediaExtracts,
  dailyClimate,
  leadParagraphs,
  nearbyServices,
  pageBanner,
  SERVICE_TYPES,
  stateFacts,
  wikidataEntities,
  wikivoyageArticles,
} from "./lib/sources.mjs";
import { inBbox, validateState } from "./lib/validate.mjs";
import { sectionText } from "./lib/wikitext.mjs";

const ROOT = process.cwd();
const OUT = join(ROOT, "src", "data");
const WIKIVOYAGE_LICENSE = { name: "CC BY-SA 4.0", url: "https://creativecommons.org/licenses/by-sa/4.0/" };
const WIKIPEDIA_LICENSE = WIKIVOYAGE_LICENSE;
const CC0 = { name: "CC0 1.0", url: "https://creativecommons.org/publicdomain/zero/1.0/" };
const MAX_DISHES = 24;
const MAX_SERVICE_DESTINATIONS = 10;
const MAX_DESTINATIONS = 45;

const readJson = async (path) => JSON.parse(await readFile(join(ROOT, path), "utf8"));
const log = (...args) => console.log(...args);

function displayName(title) {
  return title.includes("/") ? title.split("/").pop() : title;
}

/** Wikivoyage source reference for an article. */
function voyageSource(article) {
  return {
    name: "Wikivoyage",
    title: article.title,
    url: article.url,
    license: WIKIVOYAGE_LICENSE,
  };
}

async function buildState(config, helplines) {
  log(`\n▸ ${config.name}`);
  const stateArticle = (await wikivoyageArticles([config.wikivoyage])).get(config.wikivoyage);
  if (!stateArticle) throw new Error(`Wikivoyage article "${config.wikivoyage}" not found`);

  // ---- Destinations: linked from the state article, plus district sub-articles of big cities.
  // Region articles (e.g. "North Goa") list many more destinations; descend one level into them.
  const regionTitles = destinationLinks(stateArticle.wikitext, ["Regions", "Divisions"]);
  const regionArticles = await wikivoyageArticles(regionTitles);
  const cityTitles = [
    ...destinationLinks(stateArticle.wikitext, [config.destinationSections[0]]),
    ...[...regionArticles.values()].flatMap((region) => destinationLinks(region.wikitext, ["Cities"])),
  ];
  const otherTitles = [
    ...destinationLinks(stateArticle.wikitext, config.destinationSections.slice(1)),
    ...[...regionArticles.values()].flatMap((region) =>
      destinationLinks(region.wikitext, ["Other destinations"]),
    ),
  ];
  const regionNames = new Set([
    ...regionTitles,
    ...[...regionArticles.values()].map((region) => region.title),
  ]);
  const topTitles = [...new Set([...cityTitles, ...otherTitles])]
    .filter((title) => title !== config.wikivoyage && !regionNames.has(title))
    .slice(0, MAX_DESTINATIONS);
  const firstSectionTitles = new Set(cityTitles);
  const topArticles = await wikivoyageArticles(topTitles);
  const districtOf = new Map();
  const districtTitles = [];
  for (const title of topTitles) {
    const article = topArticles.get(title);
    if (!article) continue;
    const districts = destinationLinks(article.wikitext, ["Districts"]).filter((target) =>
      target.startsWith(`${article.title}/`),
    );
    districts.forEach((district) => districtOf.set(district, article.title));
    districtTitles.push(...districts);
  }
  const districtArticles = await wikivoyageArticles(districtTitles);
  // Delhi-style states whose own article has districts: the districts are the destinations.
  const destinations = [];
  for (const title of topTitles) {
    const article = topArticles.get(title);
    if (!article) {
      log(`  · skipped missing article "${title}"`);
      continue;
    }
    // Two links (e.g. a redirect and its target) can resolve to the same article.
    if (destinations.some((existing) => existing.article.title === article.title)) continue;
    if (article.lat == null || !inBbox(article.lat, article.lon, config.bbox)) {
      log(`  · skipped "${title}" (no coordinates inside ${config.name})`);
      continue;
    }
    destinations.push({
      id: slugify(displayName(article.title)),
      name: displayName(article.title),
      kind: firstSectionTitles.has(title) ? "city" : "destination",
      lat: article.lat,
      lon: article.lon,
      intro: leadParagraphs(article.wikitext, 1)[0] ?? null,
      banner: pageBanner(article.wikitext),
      source: voyageSource(article),
      article,
    });
  }
  const destinationByTitle = new Map(
    destinations.map((destination) => [destination.article.title, destination]),
  );

  // ---- Listings from the state article, destinations and their districts.
  const listingSources = [
    { article: stateArticle, destination: null, area: null },
    ...[...regionArticles.values()].map((article) => ({ article, destination: null, area: null })),
    ...destinations.map((destination) => ({ article: destination.article, destination, area: null })),
    ...[...districtArticles.entries()].map(([title, article]) => ({
      article,
      destination: destinationByTitle.get(districtOf.get(title)) ?? null,
      area: displayName(article.title),
    })),
  ];
  const listings = listingSources.flatMap(({ article, destination, area }) =>
    extractListings(article.wikitext, { article: article.title }).map((listing) => ({
      ...listing,
      destination,
      area,
      articleRef: article,
    })),
  );
  log(
    `  ${destinations.length} destinations, ${districtArticles.size} district articles, ${listings.length} listings`,
  );

  // ---- Wikidata enrichment (classes, coordinates, images, popularity, local names).
  const entities = await wikidataEntities(listings.map((listing) => listing.wikidata).filter(Boolean));

  const places = [];
  const seen = new Map();
  for (const listing of listings) {
    const entity = listing.wikidata ? entities.get(listing.wikidata) : null;
    let lat = listing.lat ?? entity?.lat ?? null;
    let lon = listing.lon ?? entity?.lon ?? null;
    if (lat != null && !inBbox(lat, lon, config.bbox)) {
      lat = null;
      lon = null;
    }
    let destination = listing.destination;
    if (!destination && lat != null) {
      const nearest = destinations
        .map((candidate) => ({ candidate, km: distanceKm({ lat, lon }, candidate) }))
        .sort((a, b) => a.km - b.km)[0];
      if (nearest && nearest.km <= 25) destination = nearest.candidate;
    }
    const category = categorise(listing, entity?.classes ?? []);
    const key = listing.wikidata ?? `${slugify(listing.name)}@${destination?.id ?? "state"}`;
    const description = listing.description ?? null;
    const candidate = {
      id: stableId(listing.name, `${config.id}/${destination?.id ?? "state"}/${listing.type}`),
      name: listing.name,
      alt: listing.alt,
      names: { hi: entity?.labelHi ?? null, mr: entity?.labelMr ?? null },
      type: listing.type,
      category,
      description,
      destination: destination?.id ?? null,
      area: listing.area,
      lat,
      lon,
      address: listing.address,
      hours: listing.hours,
      price: listing.price,
      website: listing.url,
      wikidata: listing.wikidata,
      wikipedia: entity?.enwiki ?? null,
      imageFile: listing.image ?? entity?.image ?? null,
      popularity: entity?.sitelinks ?? 0,
      source: voyageSource(listing.articleRef),
    };
    const previous = seen.get(key);
    if (previous) {
      // Same place listed twice (e.g. in the state and the city article): keep the richer entry.
      if ((description?.length ?? 0) > (previous.description?.length ?? 0))
        Object.assign(previous, { ...candidate, id: previous.id });
      continue;
    }
    seen.set(key, candidate);
    places.push(candidate);
  }

  // ---- Notable attractions from Wikidata. Many sights (beaches, forts, sanctuaries) are towns or
  // regions on Wikivoyage rather than listings; this fills that gap with sourced, located entries.
  const attractions = await wikidataAttractions(config.wikidata);
  const extracts = await wikipediaExtracts(attractions.map((item) => item.wikipedia));
  const byWikidata = new Map(
    places.filter((place) => place.wikidata).map((place) => [place.wikidata, place]),
  );
  const nameKey = (name) => slugify(name).replace(/-(beach|fort|temple|church|museum|falls)$/, "");
  const namesTaken = new Set(places.map((place) => `${nameKey(place.name)}@${place.destination ?? ""}`));
  let added = 0;
  for (const item of attractions) {
    if (!inBbox(item.lat, item.lon, config.bbox)) continue;
    const description = extracts.get(item.wikipedia) ?? null;
    const existing = byWikidata.get(item.wikidata);
    if (existing) {
      // Same place already listed by Wikivoyage: keep it, fill gaps from Wikidata/Wikipedia.
      existing.lat ??= item.lat;
      existing.lon ??= item.lon;
      existing.imageFile ??= item.image;
      existing.wikipedia ??= item.wikipedia;
      existing.popularity = Math.max(existing.popularity, item.sitelinks);
      if (!existing.description && description) existing.description = description;
      continue;
    }
    const nearest = destinations
      .map((candidate) => ({ candidate, km: distanceKm(item, candidate) }))
      .sort((a, b) => a.km - b.km)[0];
    const destination = nearest && nearest.km <= 25 ? nearest.candidate : null;
    const key = `${nameKey(item.name)}@${destination?.id ?? ""}`;
    if (namesTaken.has(key) || !description) continue;
    namesTaken.add(key);
    const entity = entities.get(item.wikidata);
    places.push({
      id: stableId(item.name, `${config.id}/${item.wikidata}`),
      name: item.name,
      alt: null,
      names: { hi: entity?.labelHi ?? null, mr: entity?.labelMr ?? null },
      type: "see",
      category: categorise({ type: "see", name: item.name, description }, item.classes),
      description,
      destination: destination?.id ?? null,
      area: null,
      lat: item.lat,
      lon: item.lon,
      address: null,
      hours: null,
      price: null,
      website: null,
      wikidata: item.wikidata,
      wikipedia: item.wikipedia,
      imageFile: item.image,
      popularity: item.sitelinks,
      source: {
        name: "Wikipedia",
        title: item.wikipedia,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.wikipedia.replace(/ /g, "_"))}`,
        license: WIKIPEDIA_LICENSE,
      },
    });
    added += 1;
  }
  log(`  ${attractions.length} Wikidata attractions, ${added} added as new places`);

  // ---- Dishes from Wikipedia cuisine categories, ranked by recent pageviews.
  // Categories also hold ingredients and plants (e.g. a yam species); keep prepared dishes and
  // foods by dropping biological taxa and cultivars.
  const regionalWords = [config.name, ...config.foodCategories.map((category) => category.split(" ")[0])];
  const regionalPattern = new RegExp(`\\b(${[...new Set(regionalWords)].join("|")})`, "i");
  const NOT_DISHES = new Set([
    "Q16521",
    "Q4886",
    "Q55983715",
    "Q756",
    "Q7432",
    "Q11707",
    "Q4830453",
    "Q43229",
  ]);
  const dishCandidates = (await categoryDishes(config.foodCategories))
    .filter((page) => !/cuisine|^list of|\(disambiguation\)/i.test(page.title) && page.extract.length > 40)
    // Dishes whose description names the state or its cuisine first, then by popularity, so
    // regional specialities outrank pan-Indian dishes that are also filed under the category.
    .map((page) => ({ ...page, regional: regionalPattern.test(page.extract) }))
    .sort((a, b) => Number(b.regional) - Number(a.regional) || b.views - a.views)
    .slice(0, MAX_DISHES * 2);
  const dishEntities = await wikidataEntities(dishCandidates.map((page) => page.wikidata).filter(Boolean));
  const dishPages = dishCandidates
    .filter((page) => !(dishEntities.get(page.wikidata)?.classes ?? []).some((id) => NOT_DISHES.has(id)))
    .slice(0, MAX_DISHES);

  // ---- Images and their licenses (Commons only; files without license data are dropped).
  const hero = pageBanner(stateArticle.wikitext);
  const files = [
    hero,
    ...destinations.map((destination) => destination.banner),
    ...places.map((place) => place.imageFile),
    ...dishPages.map((dish) => dish.image),
  ];
  const images = await commonsImages(files.filter(Boolean));
  const imageFor = (file) => (file ? (images.get(file) ?? null) : null);

  // ---- Services near the main destinations (Wikidata geo-search).
  const serviceHubs = (
    destinations.some((destination) => destination.kind === "city")
      ? destinations.filter((destination) => destination.kind === "city")
      : destinations
  ).slice(0, MAX_SERVICE_DESTINATIONS);
  if (serviceHubs.length === 0 && stateArticle.lat != null) {
    serviceHubs.push({ id: null, name: config.name, lat: stateArticle.lat, lon: stateArticle.lon });
  }
  const services = [];
  for (const hub of serviceHubs) {
    const found = await nearbyServices(hub.lat, hub.lon);
    for (const { type, radiusKm, keep } of SERVICE_TYPES) {
      found
        .filter((item) => item.type === type && item.km <= radiusKm)
        .slice(0, keep)
        .forEach((item) => {
          const id = `wd-${item.wikidata}-${hub.id ?? "state"}`;
          const inside = inBbox(item.lat, item.lon, config.bbox);
          services.push({
            id,
            type,
            name: item.name,
            destination: hub.id,
            km: Math.round(item.km * 10) / 10,
            lat: inside ? item.lat : null,
            lon: inside ? item.lon : null,
            iata: item.iata,
            wikidata: item.wikidata,
            source: { name: "Wikidata", url: `https://www.wikidata.org/wiki/${item.wikidata}`, license: CC0 },
          });
        });
    }
  }

  // ---- Climate for the representative destination.
  const climateArticle =
    config.climateDestination === config.wikivoyage
      ? stateArticle
      : (destinations.find((destination) => destination.article.title === config.climateDestination)
          ?.article ??
        (await wikivoyageArticles([config.climateDestination])).get(config.climateDestination));
  let climate = null;
  if (climateArticle?.lat != null) {
    const normals = monthlyNormals(await dailyClimate(climateArticle.lat, climateArticle.lon));
    climate = {
      place: displayName(climateArticle.title),
      period: "2014–2023",
      months: normals,
      best: bestMonths(normals),
      rule: COMFORT_RULE,
      source: {
        name: "Open-Meteo historical weather API (ERA5 reanalysis)",
        url: "https://open-meteo.com/en/docs/historical-weather-api",
        license: { name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
      },
    };
  }

  const facts = await stateFacts(config.wikidata);
  const intro = leadParagraphs(stateArticle.wikitext, 2);
  const getIn = leadParagraphs(sectionText(stateArticle.wikitext, "Get in").replace(/^==.*==\s*$/m, ""), 2);

  // Photos: the best-ranked landscape place photo makes the hero and each destination's cover.
  // Wikivoyage page banners (thin panoramas) are only a fallback.
  const rankedPlaces = places
    .map(({ imageFile, ...place }) => ({ ...place, image: imageFor(imageFile) }))
    .map((place) => ({ ...place, score: rank(place) }))
    .sort((a, b) => b.score - a.score);
  const isLandscape = (image, minWidth) =>
    image && image.width >= minWidth && image.width > image.height * 1.2;
  const heroImage =
    rankedPlaces.find((place) => place.category !== "food" && isLandscape(place.image, 1600))?.image ??
    imageFor(hero);
  const coverFor = (destination) =>
    rankedPlaces.find(
      (place) =>
        place.destination === destination.id && place.category !== "food" && isLandscape(place.image, 900),
    )?.image ?? imageFor(destination.banner);

  const doc = {
    id: config.id,
    code: config.code,
    name: config.name,
    nativeName: facts.nativeName,
    nativeLang: facts.nativeNameLang ?? config.nativeLang,
    accent: config.accent,
    bbox: config.bbox,
    center: stateArticle.lat != null ? { lat: stateArticle.lat, lon: stateArticle.lon } : null,
    intro,
    getIn,
    facts,
    hero: heroImage,
    source: voyageSource(stateArticle),
    destinations: destinations.map(({ article: _article, banner: _banner, ...destination }) => ({
      ...destination,
      image: coverFor({ ...destination, banner: _banner }),
    })),
    places: rankedPlaces,
    dishes: dishPages.map((dish) => ({
      id: stableId(dish.title, `${config.id}/dish`),
      name: dish.title.replace(/\s*\([^)]*\)$/, ""),
      description: dish.extract,
      wikidata: dish.wikidata,
      views: dish.views,
      image: imageFor(dish.image),
      source: { name: "Wikipedia", title: dish.title, url: dish.url, license: WIKIPEDIA_LICENSE },
    })),
    foodNote: config.foodNote,
    services,
    helplines,
    climate,
  };

  const errors = validateState(doc);
  if (errors.length) {
    errors.slice(0, 30).forEach((error) => console.error(`  ✗ ${error}`));
    throw new Error(`${config.name}: ${errors.length} validation error(s)`);
  }
  const counts = countByCategory(doc.places);
  log(
    `  ✓ ${doc.places.length} places (${Object.entries(counts)
      .map(([key, value]) => `${key} ${value}`)
      .join(
        ", ",
      )}), ${doc.dishes.length} dishes, ${doc.services.length} services, climate: ${climate ? climate.best.length + " comfortable months" : "n/a"}`,
  );
  return doc;
}

function rank(place) {
  return (
    place.popularity * 3 +
    (place.image ? 12 : 0) +
    (place.wikidata ? 4 : 0) +
    Math.min(10, Math.floor((place.description?.length ?? 0) / 60)) +
    (place.lat != null ? 2 : 0)
  );
}

function countByCategory(places) {
  return places.reduce(
    (counts, place) => ({ ...counts, [place.category]: (counts[place.category] ?? 0) + 1 }),
    {},
  );
}

/** The best-known sights (not food) of a state that have a photo, for the home page. */
function featuredPlaces(doc, count) {
  const destinationName = new Map(doc.destinations.map((destination) => [destination.id, destination.name]));
  return doc.places
    .filter((place) => place.image && place.category !== "food" && place.description)
    .slice(0, count)
    .map((place) => ({
      id: place.id,
      name: place.name,
      category: place.category,
      description: place.description,
      image: place.image,
      state: doc.id,
      where: destinationName.get(place.destination) ?? null,
    }));
}

function searchEntries(doc) {
  const destinationName = new Map(doc.destinations.map((destination) => [destination.id, destination.name]));
  const thumb = (image) => image?.src ?? null;
  return [
    ...doc.destinations.map((destination) => ({
      kind: "destination",
      id: destination.id,
      name: destination.name,
      state: doc.id,
      image: thumb(destination.image),
    })),
    ...doc.places.map((place) => ({
      kind: "place",
      id: place.id,
      name: place.name,
      alt: place.alt ?? undefined,
      local: [place.names.hi, place.names.mr].filter(Boolean).join(" ") || undefined,
      category: place.category,
      state: doc.id,
      where: destinationName.get(place.destination) ?? place.area ?? undefined,
      image: thumb(place.image),
    })),
    ...doc.dishes.map((dish) => ({
      kind: "dish",
      id: dish.id,
      name: dish.name,
      state: doc.id,
      image: thumb(dish.image),
    })),
  ];
}

async function main() {
  const { states } = await readJson("data/states.config.json");
  const { tiles } = await readJson("data/india-tiles.json");
  const { helplines } = await readJson("data/curated/india.json");
  const only = process.argv.slice(2);
  const selected = only.length ? states.filter((state) => only.includes(state.id)) : states;
  await mkdir(join(OUT, "states"), { recursive: true });

  const docs = [];
  for (const config of selected) {
    const doc = await buildState(config, helplines);
    await writeFile(join(OUT, "states", `${doc.id}.json`), `${JSON.stringify(doc)}\n`);
    docs.push(doc);
  }

  // The index and search file always cover every configured state, reading unchanged ones from disk.
  const allDocs = [];
  for (const config of states) {
    const built = docs.find((doc) => doc.id === config.id);
    if (built) {
      allDocs.push(built);
      continue;
    }
    try {
      allDocs.push(JSON.parse(await readFile(join(OUT, "states", `${config.id}.json`), "utf8")));
    } catch {
      log(`  · ${config.name} has not been built yet; left out of the index`);
    }
  }
  const index = {
    generatedAt: new Date().toISOString().slice(0, 10),
    tiles,
    states: allDocs.map((doc) => ({
      id: doc.id,
      code: doc.code,
      name: doc.name,
      nativeName: doc.nativeName,
      nativeLang: doc.nativeLang,
      accent: doc.accent,
      capital: doc.facts.capital,
      tagline: doc.intro[0]?.split(/(?<=\.)\s/)[0] ?? null,
      hero: doc.hero,
      counts: {
        destinations: doc.destinations.length,
        places: doc.places.filter((place) => place.category !== "food").length,
        food: doc.places.filter((place) => place.category === "food").length,
        dishes: doc.dishes.length,
      },
      best: doc.climate?.best ?? [],
    })),
    featured: {
      places: allDocs.flatMap((doc) => featuredPlaces(doc, 2)),
      dishes: allDocs.flatMap((doc) =>
        doc.dishes
          .filter((dish) => dish.image)
          .slice(0, 2)
          .map((dish) => ({ ...dish, state: doc.id })),
      ),
    },
  };
  await writeFile(join(OUT, "index.json"), `${JSON.stringify(index, null, 1)}\n`);
  await writeFile(join(OUT, "search.json"), `${JSON.stringify(allDocs.flatMap(searchEntries))}\n`);
  log(`\nWrote ${allDocs.length} states to src/data.`);
}

main().catch((error) => {
  console.error(`\nData build failed: ${error.message}`);
  process.exit(1);
});
