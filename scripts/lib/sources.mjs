/**
 * Thin clients for the open-data APIs used at build time. Every call goes through the cached,
 * throttled `fetchJson`. No API keys are needed.
 */
import { chunk, fetchJson } from "./http.mjs";
import { tidyIntro, toPlainText } from "./wikitext.mjs";

const WIKIVOYAGE_API = "https://en.wikivoyage.org/w/api.php";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const SPARQL = "https://query.wikidata.org/sparql";
const OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";

function apiUrl(base, params) {
  return `${base}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`;
}

/** Follows MediaWiki `continue` responses, merging `query.pages` entries by page id. */
async function queryAll(base, params) {
  const pages = new Map();
  let cont = {};
  for (let guard = 0; guard < 50; guard += 1) {
    const data = await fetchJson(apiUrl(base, { action: "query", ...params, ...cont }));
    (data.query?.pages ?? []).forEach((page) => {
      const key = page.pageid ?? page.title;
      pages.set(key, mergeDeep(pages.get(key) ?? {}, page));
    });
    if (!data.continue) break;
    cont = data.continue;
  }
  return [...pages.values()];
}

function mergeDeep(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object"
    ) {
      target[key] = mergeDeep({ ...target[key] }, value);
    } else if (target[key] === undefined) {
      target[key] = value;
    }
  }
  return target;
}

// ---------------------------------------------------------------- Wikivoyage

/**
 * Wikitext and primary coordinates of Wikivoyage articles, keyed by the requested title.
 * Follows redirects; missing articles are omitted.
 */
export async function wikivoyageArticles(titles) {
  const result = new Map();
  for (const batch of chunk([...new Set(titles)], 10)) {
    const pages = new Map();
    const aliases = new Map();
    let cont = {};
    // Follow `continue`: large batches return content and coordinates over several responses.
    for (let guard = 0; guard < 20; guard += 1) {
      const data = await fetchJson(
        apiUrl(WIKIVOYAGE_API, {
          action: "query",
          prop: "revisions|coordinates",
          rvprop: "content",
          rvslots: "main",
          colimit: "max",
          coprimary: "primary",
          titles: batch.join("|"),
          redirects: "1",
          ...cont,
        }),
      );
      [...(data.query?.normalized ?? []), ...(data.query?.redirects ?? [])].forEach((item) =>
        aliases.set(item.to, item.from),
      );
      (data.query?.pages ?? []).forEach((page) => {
        const previous = pages.get(page.title) ?? {};
        pages.set(page.title, {
          ...previous,
          ...page,
          revisions: page.revisions ?? previous.revisions,
          coordinates: page.coordinates ?? previous.coordinates,
        });
      });
      if (!data.continue) break;
      cont = data.continue;
    }
    pages.forEach((page) => {
      if (page.missing || !page.revisions) return;
      let requested = page.title;
      for (let hops = 0; hops < 3 && aliases.has(requested); hops += 1) requested = aliases.get(requested);
      const coords = page.coordinates?.[0];
      result.set(requested, {
        title: page.title,
        wikitext: page.revisions[0].slots.main.content,
        lat: coords?.lat ?? null,
        lon: coords?.lon ?? null,
        url: `https://en.wikivoyage.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
      });
    });
  }
  return result;
}

/** The article's lead text (before the first heading), as plain text paragraphs. */
export function leadParagraphs(wikitext, max = 2) {
  const lead = wikitext.split(/^==/m)[0];
  return lead
    .split(/\n\s*\n/)
    .map((paragraph) => toPlainText(paragraph))
    .filter((paragraph) => paragraph.length > 60)
    .slice(0, max);
}

/** The `{{pagebanner|File}}` image of a Wikivoyage article, if any. */
export function pageBanner(wikitext) {
  const match = wikitext.match(/\{\{\s*pagebanner\s*\|\s*(?:file:|image:)?([^|}\n]+\.(?:jpe?g|png|webp))/i);
  return match ? match[1].trim().replace(/_/g, " ") : null;
}

// ---------------------------------------------------------------- Wikidata

function claimValues(entity, property) {
  return (entity?.claims?.[property] ?? [])
    .filter((claim) => claim.rank !== "deprecated" && claim.mainsnak?.datavalue)
    .sort((a, b) => (a.rank === "preferred" ? -1 : 0) - (b.rank === "preferred" ? -1 : 0))
    .map((claim) => ({ value: claim.mainsnak.datavalue.value, qualifiers: claim.qualifiers ?? {} }));
}

/** Summaries of Wikidata items: classes, image, coordinates, popularity and labels. */
export async function wikidataEntities(ids) {
  const result = new Map();
  for (const batch of chunk([...new Set(ids)], 50)) {
    const data = await fetchJson(
      apiUrl(WIKIDATA_API, {
        action: "wbgetentities",
        ids: batch.join("|"),
        props: "claims|sitelinks|labels|descriptions",
        languages: "en|hi|mr",
      }),
    );
    Object.values(data.entities ?? {}).forEach((entity) => {
      if (entity.missing !== undefined) return;
      const coordinate = claimValues(entity, "P625")[0]?.value;
      result.set(entity.id, {
        id: entity.id,
        classes: claimValues(entity, "P31").map(({ value }) => value.id),
        image: claimValues(entity, "P18")[0]?.value ?? null,
        lat: coordinate?.latitude ?? null,
        lon: coordinate?.longitude ?? null,
        sitelinks: Object.keys(entity.sitelinks ?? {}).length,
        enwiki: entity.sitelinks?.enwiki?.title ?? null,
        label: entity.labels?.en?.value ?? null,
        labelHi: entity.labels?.hi?.value ?? null,
        labelMr: entity.labels?.mr?.value ?? null,
        description: entity.descriptions?.en?.value ?? null,
        claims: entity.claims,
      });
    });
  }
  return result;
}

/** Facts about a state from its Wikidata item, with labels for linked items resolved. */
export async function stateFacts(qid) {
  const entities = await wikidataEntities([qid]);
  const state = entities.get(qid);
  if (!state) throw new Error(`Wikidata item ${qid} not found`);
  const latest = (property) =>
    claimValues(state, property)
      .map(({ value, qualifiers }) => ({ value, time: qualifiers.P585?.[0]?.datavalue?.value?.time ?? "" }))
      .sort((a, b) => b.time.localeCompare(a.time))[0];
  const capitalId = claimValues(state, "P36")[0]?.value?.id ?? null;
  const languageIds = claimValues(state, "P37").map(({ value }) => value.id);
  const linked = await wikidataEntities([capitalId, ...languageIds].filter(Boolean));
  const population = latest("P1082");
  const area = claimValues(state, "P2046")[0]?.value;
  const inception = claimValues(state, "P571")[0]?.value?.time ?? null;
  const native = claimValues(state, "P1705")[0]?.value ?? null;
  const website = claimValues(state, "P856")[0]?.value ?? null;
  const districtQuery = `SELECT (COUNT(DISTINCT ?d) AS ?n) WHERE { ?d wdt:P31 wd:Q1149652 ; wdt:P131 wd:${qid} . }`;
  const districts = await sparql(districtQuery);
  return {
    qid,
    nativeName: native?.text ?? null,
    nativeNameLang: native?.language ?? null,
    nameHi: state.labelHi,
    capital: capitalId ? (linked.get(capitalId)?.label ?? null) : null,
    languages: languageIds.map((id) => linked.get(id)?.label).filter(Boolean),
    population: population ? Number(population.value.amount) : null,
    populationYear: population?.time ? Number(population.time.slice(1, 5)) : null,
    areaKm2: area && /Q712226$/.test(area.unit) ? Number(area.amount) : null,
    formed: inception ? inception.slice(1, 11) : null,
    districts: Number(districts[0]?.n ?? 0) || null,
    website,
    url: `https://www.wikidata.org/wiki/${qid}`,
  };
}

/** Runs a SPARQL query and returns rows as `{ var: value }` objects. */
export async function sparql(query) {
  const data = await fetchJson(`${SPARQL}?${new URLSearchParams({ query })}`, {
    headers: { Accept: "application/sparql-results+json" },
    gapMs: 1000,
  });
  return data.results.bindings.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, cell]) => [
        key,
        cell.value.replace("http://www.wikidata.org/entity/", ""),
      ]),
    ),
  );
}

/** Wikidata classes of notable attractions (instance of), used to find sights Wikivoyage lists as towns. */
export const ATTRACTION_CLASSES = [
  "Q40080",
  "Q1785071",
  "Q44539",
  "Q842402",
  "Q16970",
  "Q2977",
  "Q33506",
  "Q207694",
  "Q34038",
  "Q23397",
  "Q46169",
  "Q473972",
  "Q16560",
  "Q32815",
  "Q35509",
  "Q839954",
  "Q56242215",
  "Q1457465",
  "Q162875",
  "Q4989906",
  "Q381885",
  "Q2232001",
  "Q1144166",
  "Q167346",
  "Q43501",
  "Q5393308",
  "Q160742",
  "Q57821",
];

/**
 * Notable attractions inside a state: items of the classes above, located (transitively) in the
 * state, with coordinates and an English Wikipedia article. Ranked by number of Wikimedia sitelinks.
 */
export async function wikidataAttractions(stateQid, limit = 150) {
  const query = `SELECT ?item ?itemLabel ?class ?coord ?image ?article ?links WHERE {
  VALUES ?class { ${ATTRACTION_CLASSES.map((id) => `wd:${id}`).join(" ")} }
  ?item wdt:P31 ?class ; wdt:P131+ wd:${stateQid} ; wdt:P625 ?coord ; wikibase:sitelinks ?links .
  ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> .
  OPTIONAL { ?item wdt:P18 ?image }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY DESC(?links) LIMIT ${limit * 2}`;
  const rows = await sparql(query);
  const byItem = new Map();
  rows.forEach((row) => {
    const [lon, lat] = (row.coord.match(/Point\(([-\d.]+) ([-\d.]+)\)/) ?? []).slice(1).map(Number);
    if (!Number.isFinite(lat) || /^Q\d+$/.test(row.itemLabel)) return;
    const existing = byItem.get(row.item);
    if (existing) {
      existing.classes.push(row.class);
      return;
    }
    byItem.set(row.item, {
      wikidata: row.item,
      name: row.itemLabel.replace(/\.$/, "").trim(),
      classes: [row.class],
      lat,
      lon,
      image: row.image
        ? decodeURIComponent(row.image.split("/Special:FilePath/")[1] ?? "").replace(/_/g, " ")
        : null,
      wikipedia: decodeURIComponent(row.article.split("/wiki/")[1] ?? "").replace(/_/g, " "),
      sitelinks: Number(row.links) || 0,
    });
  });
  return [...byItem.values()].slice(0, limit);
}

// ---------------------------------------------------------------- Wikipedia

/**
 * Plain-text intro extracts (up to three sentences) of English Wikipedia articles, keyed by the
 * requested title (redirects and title normalisation are followed back to the request).
 */
export async function wikipediaExtracts(titles) {
  const result = new Map();
  for (const batch of chunk([...new Set(titles.filter(Boolean))], 20)) {
    const aliases = new Map();
    let cont = {};
    for (let guard = 0; guard < 20; guard += 1) {
      const data = await fetchJson(
        apiUrl(WIKIPEDIA_API, {
          action: "query",
          titles: batch.join("|"),
          prop: "extracts",
          exintro: "1",
          explaintext: "1",
          exsentences: "3",
          exlimit: "max",
          redirects: "1",
          ...cont,
        }),
      );
      [...(data.query?.normalized ?? []), ...(data.query?.redirects ?? [])].forEach((item) =>
        aliases.set(item.to, item.from),
      );
      (data.query?.pages ?? []).forEach((page) => {
        if (!page.extract) return;
        let requested = page.title;
        for (let hops = 0; hops < 3 && aliases.has(requested); hops += 1) requested = aliases.get(requested);
        const text = tidyIntro(page.extract.replace(/\s+/g, " "));
        result.set(requested, text);
        result.set(page.title, text);
      });
      if (!data.continue) break;
      cont = data.continue;
    }
  }
  return result;
}

/**
 * Dish articles in Wikipedia categories: intro extract, lead image file, Wikidata id and
 * recent pageviews (used to rank how well known a dish is).
 */
export async function categoryDishes(categories) {
  const pages = new Map();
  for (const category of categories) {
    const members = await queryAll(WIKIPEDIA_API, {
      generator: "categorymembers",
      gcmtitle: `Category:${category}`,
      gcmnamespace: "0",
      gcmlimit: "max",
      prop: "extracts|pageimages|pageprops|pageviews",
      exintro: "1",
      explaintext: "1",
      exsentences: "3",
      exlimit: "max",
      piprop: "name",
      pilicense: "free",
      ppprop: "wikibase_item",
      pvipdays: "60",
    });
    members.forEach((page) => {
      if (!pages.has(page.title)) pages.set(page.title, { ...page, category });
    });
  }
  return [...pages.values()].map((page) => ({
    title: page.title,
    category: page.category,
    extract: tidyIntro(page.extract ?? ""),
    image: page.pageimage ? page.pageimage.replace(/_/g, " ") : null,
    wikidata: page.pageprops?.wikibase_item ?? null,
    views: Object.values(page.pageviews ?? {}).reduce((sum, value) => sum + (value ?? 0), 0),
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
  }));
}

// ---------------------------------------------------------------- Commons

/** Commons "Artist" values that are boilerplate rather than a name. */
function cleanAuthor(value) {
  // Keep the name only: drop contact notes and e-mail addresses some photographers add.
  const author = stripHtml(value)
    .replace(/\b(if you would|contact|e-?mail|mail me)\b.*$/i, "")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "")
    .replace(/[\s,;.:(-]+$/, "")
    .trim();
  if (!author || /no machine-readable author|unknown author|^unknown$/i.test(author)) return null;
  return author.length > 120 ? `${author.slice(0, 117)}…` : author;
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * License, author and a resized URL for Commons files. Files without license metadata
 * (or not hosted on Commons) are omitted, so they can never be published without credit.
 */
export async function commonsImages(files, width = 1920) {
  const result = new Map();
  for (const batch of chunk([...new Set(files.filter(Boolean))], 50)) {
    const data = await fetchJson(
      apiUrl(COMMONS_API, {
        action: "query",
        titles: batch.map((file) => `File:${file}`).join("|"),
        prop: "imageinfo",
        iiprop: "url|extmetadata|size",
        iiurlwidth: String(width),
        iiextmetadatafilter: "Artist|LicenseShortName|LicenseUrl|Credit|UsageTerms",
      }),
    );
    const normalized = new Map((data.query?.normalized ?? []).map((item) => [item.to, item.from]));
    (data.query?.pages ?? []).forEach((page) => {
      const info = page.imageinfo?.[0];
      const meta = info?.extmetadata ?? {};
      const license = stripHtml(meta.LicenseShortName?.value);
      if (!info || !license) return;
      const requested = (normalized.get(page.title) ?? page.title).replace(/^File:/, "");
      result.set(requested, {
        file: page.title.replace(/^File:/, ""),
        src: (info.thumburl ?? info.url).split("?")[0],
        width: info.thumbwidth ?? info.width,
        height: info.thumbheight ?? info.height,
        author: cleanAuthor(meta.Artist?.value),
        license,
        licenseUrl: meta.LicenseUrl?.value ?? null,
        page: info.descriptionurl,
      });
    });
  }
  return result;
}

// ---------------------------------------------------------------- Services (Wikidata)

/**
 * Service types found by Wikidata geo-search around a destination, nearest first.
 * (OpenStreetMap's public Overpass servers proved too overloaded for reliable builds.)
 */
export const SERVICE_TYPES = [
  { type: "hospital", classes: ["Q16917"], radiusKm: 8, keep: 5 },
  { type: "railway", classes: ["Q55488"], radiusKm: 15, keep: 4 },
  { type: "bus", classes: ["Q494829"], radiusKm: 12, keep: 2 },
  { type: "airport", classes: ["Q1248784", "Q644371", "Q94993988"], radiusKm: 45, keep: 2 },
];

/** Services near a point: `[{ wikidata, name, type, lat, lon, km, iata }]`. */
export async function nearbyServices(lat, lon) {
  const values = SERVICE_TYPES.flatMap(({ type, classes }) =>
    classes.map((id) => `(wd:${id} "${type}")`),
  ).join(" ");
  const radius = Math.max(...SERVICE_TYPES.map((item) => item.radiusKm));
  const query = `SELECT ?item ?itemLabel ?type ?coord ?dist ?iata WHERE {
  SERVICE wikibase:around { ?item wdt:P625 ?coord . bd:serviceParam wikibase:center "Point(${lon} ${lat})"^^geo:wktLiteral ; wikibase:radius "${radius}" ; wikibase:distance ?dist . }
  VALUES (?class ?type) { ${values} }
  ?item wdt:P31 ?class .
  OPTIONAL { ?item wdt:P238 ?iata }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY ?dist LIMIT 800`;
  const rows = await sparql(query);
  const seen = new Set();
  return rows.flatMap((row) => {
    const [itemLon, itemLat] = (row.coord.match(/Point\(([-\d.]+) ([-\d.]+)\)/) ?? []).slice(1).map(Number);
    if (seen.has(row.item) || !Number.isFinite(itemLat) || /^Q\d+$/.test(row.itemLabel)) return [];
    seen.add(row.item);
    return [
      {
        wikidata: row.item,
        name: row.itemLabel,
        type: row.type,
        lat: itemLat,
        lon: itemLon,
        km: Number(row.dist),
        iata: row.iata ?? null,
      },
    ];
  });
}

// ---------------------------------------------------------------- Open-Meteo

/** Ten years of daily observations (2014–2023) for a point. */
export async function dailyClimate(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    start_date: "2014-01-01",
    end_date: "2023-12-31",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "Asia/Kolkata",
  });
  const data = await fetchJson(`${OPEN_METEO_ARCHIVE}?${params}`, { gapMs: 1500 });
  return data.daily;
}
