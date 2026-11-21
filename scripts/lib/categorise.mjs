/**
 * Assigns each place one category. Wikidata classes win when available; otherwise the name
 * (and then the description) is matched against keyword patterns. Order matters: the first
 * match is used, so more specific categories come first.
 */

export const CATEGORIES = [
  "heritage",
  "religious",
  "museum",
  "nature",
  "beach",
  "wildlife",
  "experience",
  "sights",
  "food",
];

// Wikidata class IDs (instance of / subclass of) mapped to categories.
const CLASS_CATEGORIES = {
  beach: ["Q40080"],
  wildlife: ["Q473972", "Q46169", "Q43501", "Q20268407", "Q158454", "Q2616791"],
  museum: ["Q33506", "Q207694", "Q1007870", "Q17431399", "Q588140", "Q2772772"],
  religious: [
    "Q44539",
    "Q16970",
    "Q32815",
    "Q1457465",
    "Q160742",
    "Q842402",
    "Q44613",
    "Q1088552",
    "Q34627",
    "Q5393308",
    "Q2977",
    "Q56242215",
  ],
  heritage: [
    "Q1785071",
    "Q16560",
    "Q4989906",
    "Q839954",
    "Q162875",
    "Q81917",
    "Q15661340",
    "Q57821",
    "Q1343246",
    "Q23413",
    "Q12518",
    "Q2232001",
    "Q53060",
    "Q9259",
    "Q35509",
    "Q17715832",
  ],
  nature: [
    "Q23397",
    "Q34038",
    "Q8502",
    "Q1107656",
    "Q22698",
    "Q167346",
    "Q54050",
    "Q1144166",
    "Q4022",
    "Q39816",
    "Q133056",
    "Q107425",
    "Q1107656",
  ],
};

const NAME_PATTERNS = [
  ["beach", /\b(beach|praia|shore|seafront)\b/i],
  [
    "wildlife",
    /\b(sanctuary|national park|tiger reserve|wildlife|bird|zoo|biological park|safari|elephant)\b/i,
  ],
  ["museum", /\b(museum|gallery|sangrahalaya|planetarium|science cent(?:er|re)|memorial hall)\b/i],
  [
    "religious",
    /\b(temple|mandir|devi|devasthan|church|basilica|cathedral|chapel|convent|mosque|masjid|dargah|gurudwara|gurdwara|monastery|gompa|stupa|vihar|synagogue|jain|derasar|shrine|math|ashram|ghat|kovil|kshetram|ayyappa|shiva|vishnu|krishna|ganesh|ganpati|hanuman|balaji)\b/i,
  ],
  [
    "heritage",
    /\b(fort|qila|kila|killa|durg|palace|mahal|haveli|tomb|maqbara|mausoleum|minar|gate|darwaza|pol|caves?|stepwell|baori|baoli|vav|ruins?|monument|chhatri|cenotaph|memorial|towers?|clock tower|observatory|jantar mantar|heritage|colonial|old town|bungalow|lighthouse)\b/i,
  ],
  [
    "nature",
    /\b(lake|sagar|talao|tal|falls|waterfall|dam|river|backwaters?|hill|hills|peak|point|valley|garden|park|bagh|udyan|plateau|forest|island|dunes?|desert|lagoon|creek|viewpoint|sunset|sunrise|trek|cave|spring|estuary|mangrove)\b/i,
  ],
];

/** Category for a listing, using its type, optional Wikidata classes, name and description. */
export function categorise({ type, name, description }, classes = []) {
  if (type === "eat" || type === "drink") return "food";
  if (type === "do") {
    const fromName = NAME_PATTERNS.find(([, pattern]) => pattern.test(name ?? ""));
    return fromName && ["beach", "wildlife", "nature"].includes(fromName[0]) ? fromName[0] : "experience";
  }
  for (const [category, ids] of Object.entries(CLASS_CATEGORIES)) {
    if (classes.some((id) => ids.includes(id))) return category;
  }
  const byName = NAME_PATTERNS.find(([, pattern]) => pattern.test(name ?? ""));
  if (byName) return byName[0];
  const byDescription = NAME_PATTERNS.find(([, pattern]) => pattern.test(description ?? ""));
  // No evidence for a specific category: keep it neutral rather than guess.
  return byDescription ? byDescription[0] : "sights";
}
