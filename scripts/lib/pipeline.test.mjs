import { categorise } from "./categorise.mjs";
import { bestMonths, monthlyNormals } from "./climate.mjs";
import { distanceKm, slugify, stableId } from "./geo.mjs";
import { destinationLinks, extractListings } from "./listings.mjs";
import { inBbox, validateState } from "./validate.mjs";
import {
  tidyIntro,
  findTemplates,
  internalLinks,
  parseTemplate,
  sectionPath,
  sections,
  sectionText,
  splitParams,
  toPlainText,
} from "./wikitext.mjs";

const ARTICLE = `{{pagebanner|Goa banner.jpg}}
'''Goa''' is a state.

==Cities==
* {{marker|type=city|name=[[Panaji]]|lat=15.49|long=73.82}} — the capital
* [[Margao]] — commercial centre
* {{marker|type=city|name=[[Vasco da Gama (Goa)|Vasco da Gama]]}}

==Other destinations==
* [[Dudhsagar Falls]]

==See==
* {{see
| name=Basilica of Bom Jesus | alt=Bom Jesus | url=https://example.org | lat=15.5009 | long=73.9116
| wikidata=Q379150 | image=Bom_Jesus.jpg
| content=A '''UNESCO''' site with the remains of [[St. Francis Xavier|St Francis Xavier]].{{citation needed}}
}}
* {{listing|type=see|name=Fort Aguada|alt=guide@example.com|lat=15.49|long=73.77}}
* {{sleep|name=Some Hotel}}
* {{see|name=}}

==Eat==
===Budget===
* {{eat|name=Ritz Classic|content=Fish thali. Try the {{nowrap|prawn curry}}.|price=₹300}}
`;

describe("wikitext", () => {
  it("finds templates, including nested ones, and parses their parameters", () => {
    const [see] = findTemplates(ARTICLE, ["see"]);
    const { params } = parseTemplate(see.raw);
    expect(params.name).toBe("Basilica of Bom Jesus");
    expect(params.content).toContain("{{citation needed}}");
    expect(findTemplates("{{a|{{b}}}} {{unclosed", ["a"])).toHaveLength(1);
    expect(findTemplates("{{a", ["a"])).toEqual([]);
  });

  it("splits parameters without breaking nested links and templates", () => {
    expect(splitParams("x|a=[[b|c]]|d={{e|f}}|g")).toEqual(["x", "a=[[b|c]]", "d={{e|f}}", "g"]);
    expect(parseTemplate("t|1|k = v").positional).toEqual(["1"]);
  });

  it("reads sections and their nesting", () => {
    const all = sections(ARTICLE);
    expect(all.map((section) => section.title)).toEqual([
      "Cities",
      "Other destinations",
      "See",
      "Eat",
      "Budget",
    ]);
    const position = ARTICLE.indexOf("Ritz");
    expect(sectionPath(all, position)).toEqual(["Eat", "Budget"]);
    expect(sectionText(ARTICLE, "other destinations")).toContain("Dudhsagar");
    expect(sectionText(ARTICLE, "Missing")).toBe("");
  });

  it("lists internal links, skipping files, categories and interwiki", () => {
    expect(internalLinks("[[A]] [[B|b]] [[File:x.jpg]] [[w:Goa]] [[C#Top|c]] [[Category:Y]]")).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("converts markup to plain text", () => {
    expect(
      toPlainText(
        "A '''bold''' [[x|link]] [https://e.org site] {{convert|5|km}} {{nowrap|kept}} {{drop|me}}<ref>n</ref><br/>end &amp; more",
      ),
    ).toBe("A bold link site 5 km kept end & more");
    expect(toPlainText(null)).toBe("");
  });
});

describe("tidyIntro", () => {
  it("removes pronunciation clutter but keeps meaningful parentheses", () => {
    expect(tidyIntro("A samosa () () or shingara is a fried snack.")).toBe(
      "A samosa or shingara is a fried snack.",
    );
    expect(tidyIntro("Chorizo (cha-REE-zoh, Spanish: [tʃoˈɾiθo]) is a sausage.")).toBe(
      "Chorizo is a sausage.",
    );
    expect(tidyIntro("The fort (built in 1612) overlooks the sea.")).toBe(
      "The fort (built in 1612) overlooks the sea.",
    );
  });
});

describe("listings", () => {
  it("extracts see/do/eat/drink listings with their section context", () => {
    const listings = extractListings(ARTICLE, { article: "Goa" });
    expect(listings.map((listing) => listing.name)).toEqual([
      "Basilica of Bom Jesus",
      "Fort Aguada",
      "Ritz Classic",
    ]);
    const [basilica, fort, ritz] = listings;
    expect(basilica).toMatchObject({
      type: "see",
      alt: "Bom Jesus",
      lat: 15.5009,
      lon: 73.9116,
      wikidata: "Q379150",
      image: "Bom Jesus.jpg",
      url: "https://example.org",
      description: "A UNESCO site with the remains of St Francis Xavier.",
      section: "See",
      article: "Goa",
    });
    expect(fort).toMatchObject({
      type: "see",
      alt: null,
      lat: 15.49,
      image: null,
      url: null,
      wikidata: null,
    });
    expect(ritz).toMatchObject({
      type: "eat",
      section: "Eat",
      subsection: "Budget",
      price: "₹300",
      description: "Fish thali. Try the prawn curry.",
    });
  });

  it("finds destinations from markers, bullets and region lists", () => {
    expect(destinationLinks(ARTICLE, ["Cities", "Other destinations"])).toEqual([
      "Panaji",
      "Vasco da Gama (Goa)",
      "Margao",
      "Dudhsagar Falls",
    ]);
    const delhi =
      "==Districts==\n{{Regionlist\n|region1name=[[Delhi/Old Delhi|Old Delhi]]\n|region1color=#fff\n|region2name=[[Delhi/South Delhi]]\n}}";
    expect(destinationLinks(delhi, ["Districts"])).toEqual(["Delhi/Old Delhi", "Delhi/South Delhi"]);
    const commented =
      "==Districts==\n{{Regionlist\n<!-- | regionmap=x.png -->\n| region1name=[[Delhi/Central|Central]]\n}}";
    expect(destinationLinks(commented, ["Districts"])).toEqual(["Delhi/Central"]);
  });
});

describe("categorise", () => {
  it("prefers Wikidata classes, then names, then descriptions", () => {
    expect(categorise({ type: "see", name: "Something" }, ["Q1785071"])).toBe("heritage");
    expect(categorise({ type: "see", name: "Calangute Beach" })).toBe("beach");
    expect(categorise({ type: "see", name: "Shri Mangueshi Temple" })).toBe("religious");
    expect(categorise({ type: "see", name: "Naval Aviation Museum" })).toBe("museum");
    expect(categorise({ type: "see", name: "Bhagwan Mahavir Sanctuary" })).toBe("wildlife");
    expect(categorise({ type: "see", name: "Aguada Fort" })).toBe("heritage");
    expect(categorise({ type: "see", name: "Dudhsagar Falls" })).toBe("nature");
    expect(categorise({ type: "see", name: "Mystery", description: "A quiet lake in the hills." })).toBe(
      "nature",
    );
    expect(categorise({ type: "see", name: "Mystery" })).toBe("sights");
  });

  it("files food and activities separately", () => {
    expect(categorise({ type: "eat", name: "Ritz" })).toBe("food");
    expect(categorise({ type: "drink", name: "Bar" })).toBe("food");
    expect(categorise({ type: "do", name: "Spice farm tour" })).toBe("experience");
    expect(categorise({ type: "do", name: "Baga Beach" })).toBe("beach");
  });
});

describe("climate", () => {
  const daily = { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [] };
  for (const year of [2020, 2021]) {
    for (let month = 1; month <= 12; month += 1) {
      for (const day of [1, 2]) {
        daily.time.push(`${year}-${String(month).padStart(2, "0")}-0${day}`);
        daily.temperature_2m_max.push(month >= 4 && month <= 5 ? 38 : 30);
        daily.temperature_2m_min.push(20);
        daily.precipitation_sum.push(month >= 6 && month <= 9 ? 50 : day === 1 ? 1 : null);
      }
    }
  }

  it("averages monthly normals across years", () => {
    const normals = monthlyNormals(daily);
    expect(normals).toHaveLength(12);
    expect(normals[0]).toEqual({ month: "Jan", maxC: 30, minC: 20, rainMm: 1, rainyDays: 0 });
    expect(normals[6]).toMatchObject({ month: "Jul", rainMm: 100, rainyDays: 2 });
  });

  it("picks months that are dry and not too hot", () => {
    expect(bestMonths(monthlyNormals(daily))).toEqual([0, 1, 2, 9, 10, 11]);
    expect(bestMonths([{ month: "Jan", maxC: null, minC: null, rainMm: null }])).toEqual([]);
  });
});

describe("geo", () => {
  it("measures distance, slugs and stable ids", () => {
    expect(distanceKm({ lat: 18.52, lon: 73.85 }, { lat: 19.08, lon: 72.88 })).toBeCloseTo(120, -1);
    expect(slugify("Café & Bar — Panjim")).toBe("cafe-and-bar-panjim");
    expect(slugify("बाजार")).toBe("item");
    expect(stableId("Fort Aguada", "goa")).toBe(stableId("Fort Aguada", "goa"));
    expect(stableId("Fort Aguada", "goa")).not.toBe(stableId("Fort Aguada", "kerala"));
    expect(stableId("Fort Aguada", "goa")).toMatch(/^fort-aguada-[0-9a-f]{5}$/);
  });
});

describe("validate", () => {
  const image = {
    src: "https://upload/x.jpg",
    file: "x.jpg",
    license: "CC BY-SA 4.0",
    page: "https://commons/x",
  };
  const source = { url: "https://en.wikivoyage.org/wiki/Goa" };
  const valid = {
    id: "goa",
    name: "Goa",
    bbox: [14.8, 73.6, 15.9, 74.4],
    hero: image,
    destinations: [{ id: "panaji", name: "Panaji", lat: 15.49, lon: 73.82, source }],
    places: [{ id: "a", name: "A", category: "beach", lat: 15.5, lon: 73.8, image, source }],
    dishes: [{ id: "d", name: "Bebinca", source }],
    services: [{ id: "s", name: "Hospital", lat: null, lon: null, source }],
  };

  it("accepts a complete document", () => {
    expect(validateState(valid)).toEqual([]);
    expect(inBbox(15, 74, valid.bbox)).toBe(true);
  });

  it("reports missing sources, bad coordinates, unlicensed images and duplicates", () => {
    const errors = validateState({
      ...valid,
      bbox: valid.bbox,
      places: [
        { id: "a", name: "Far", category: "beach", lat: 28.6, lon: 77.2, source },
        { id: "a", name: "Dup", category: "nope", source: {} },
        { id: "b", name: "Bad", category: "beach", lat: "x", lon: 1, image: { src: "s" }, source },
      ],
    });
    expect(errors).toEqual(
      expect.arrayContaining([
        'place "Far": coordinates outside Goa',
        'place "Dup": duplicate id a',
        'place "Dup": missing source',
        'place "Dup": unknown category nope',
        'place "Bad": invalid coordinates',
        'place "Bad": image is missing "license"',
      ]),
    );
    expect(validateState({})).toEqual(
      expect.arrayContaining(["state: missing id or name", "state: missing bbox"]),
    );
  });
});
