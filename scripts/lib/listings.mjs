import {
  findTemplates,
  internalLinks,
  parseTemplate,
  sectionPath,
  sections,
  sectionText,
  toPlainText,
} from "./wikitext.mjs";

/** Wikivoyage listing types we publish. Sleep, buy and go listings are out of scope for now. */
export const LISTING_TYPES = ["see", "do", "eat", "drink"];
const TEMPLATE_NAMES = [...LISTING_TYPES, "listing", "buy", "sleep", "go"];

function number(value) {
  const parsed = Number.parseFloat(String(value ?? "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanUrl(value) {
  const url = String(value ?? "").trim();
  return /^https?:\/\/[^\s]+$/i.test(url) ? url : null;
}

function cleanQid(value) {
  const qid = String(value ?? "")
    .trim()
    .toUpperCase();
  return /^Q\d+$/.test(qid) ? qid : null;
}

function cleanFile(value) {
  const file = String(value ?? "")
    .trim()
    .replace(/^(file|image):/i, "")
    .replace(/_/g, " ");
  return /\.(jpe?g|png|webp|tiff?|gif)$/i.test(file) ? file : null;
}

/** Plain text without e-mail addresses: contact details are not republished. */
function text(value) {
  const plain = toPlainText(value)
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,;:-]+|[\s,;:-]+$/g, "");
  return plain || null;
}

/**
 * Extracts `{{see}}`, `{{do}}`, `{{eat}}` and `{{drink}}` listings (and `{{listing|type=…}}`)
 * from a Wikivoyage article. Unnamed listings and other types are skipped.
 */
export function extractListings(wikitext, { article }) {
  const allSections = sections(wikitext);
  return findTemplates(wikitext, TEMPLATE_NAMES).flatMap(({ raw, start }) => {
    const { name, params } = parseTemplate(raw);
    const type = name === "listing" ? String(params.type ?? "").toLowerCase() : name;
    if (!LISTING_TYPES.includes(type)) return [];
    const title = toPlainText(params.name);
    if (!title) return [];
    const path = sectionPath(allSections, start);
    return [
      {
        type,
        name: title,
        alt: text(params.alt),
        description: text(params.content || params.description),
        lat: number(params.lat),
        lon: number(params.long ?? params.lon),
        url: cleanUrl(params.url),
        wikidata: cleanQid(params.wikidata),
        wikipedia: toPlainText(params.wikipedia) || null,
        image: cleanFile(params.image),
        address: text(params.address),
        hours: text(params.hours),
        price: text(params.price),
        section: path[0] ?? null,
        subsection: path[1] ?? null,
        article,
      },
    ];
  });
}

/**
 * Wikivoyage destinations linked from the given sections (e.g. "Cities", "Other destinations",
 * "Districts"). Handles `{{marker|name=[[X]]}}`, bullet links and `{{regionlist}}` parameters.
 */
export function destinationLinks(wikitext, sectionTitles) {
  const targets = sectionTitles.flatMap((title) => {
    const body = sectionText(wikitext, title).replace(/<!--[\s\S]*?-->/g, "");
    const fromMarkers = findTemplates(body, ["marker"]).flatMap(({ raw }) =>
      internalLinks(parseTemplate(raw).params.name ?? ""),
    );
    const fromRegionlist = findTemplates(body, ["regionlist"]).flatMap(({ raw }) =>
      Object.entries(parseTemplate(raw).params)
        .filter(([key]) => /^region\d+name$/.test(key))
        .flatMap(([, value]) => internalLinks(value)),
    );
    const fromBullets = body
      .split("\n")
      .filter((line) => /^\*/.test(line))
      .flatMap((line) => internalLinks(line.replace(/\{\{[\s\S]*?\}\}/g, "")).slice(0, 1));
    return [...fromMarkers, ...fromRegionlist, ...fromBullets];
  });
  return [...new Set(targets)];
}
