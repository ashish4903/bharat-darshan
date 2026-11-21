import { SEARCH } from "../test/fixtures.js";
import { category, categoryCounts } from "./categories.js";
import {
  distanceKm,
  excerpt,
  formatArea,
  formatDistance,
  formatPopulation,
  formatYear,
  monthRanges,
  plural,
  sentences,
} from "./format.js";
import { creditLine, srcSet, thumbAt } from "./images.js";
import { href, links, parseHash, replaceParams } from "./router.js";
import { createSearcher } from "./search.js";

describe("router", () => {
  it("parses every route", () => {
    expect(parseHash("")).toEqual({ name: "home", params: {} });
    expect(parseHash("#/states")).toMatchObject({ name: "states" });
    expect(parseHash("#/state/goa")).toMatchObject({ name: "state", stateId: "goa", tab: "overview" });
    expect(parseHash("#/state/goa/food?dest=panaji")).toMatchObject({
      tab: "food",
      params: { dest: "panaji" },
    });
    expect(parseHash("#/state/goa/unknown")).toMatchObject({ tab: "overview" });
    expect(parseHash("#/place/goa/se-cathedral-bbbbb")).toMatchObject({
      name: "place",
      stateId: "goa",
      placeId: "se-cathedral-bbbbb",
    });
    expect(parseHash("#/search?q=fort")).toMatchObject({ name: "search", params: { q: "fort" } });
    expect(parseHash("#/about")).toMatchObject({ name: "about" });
    expect(parseHash("#/nope")).toMatchObject({ name: "not-found" });
  });

  it("builds links without empty parameters", () => {
    expect(href("/search", { q: "fort", kind: "", photos: false })).toBe("#/search?q=fort");
    expect(links.state("goa")).toBe("#/state/goa");
    expect(links.state("goa", "overview")).toBe("#/state/goa");
    expect(links.state("goa", "places", { cat: "beach" })).toBe("#/state/goa/places?cat=beach");
    expect(links.place("goa", "x y")).toBe("#/place/goa/x%20y");
  });

  it("replaces parameters on the current route", () => {
    window.location.hash = "#/state/goa/places?cat=beach";
    const listener = vi.fn();
    window.addEventListener("hashchange", listener);
    replaceParams({ dest: "panaji", cat: "" });
    expect(window.location.hash).toBe("#/state/goa/places?dest=panaji");
    expect(listener).toHaveBeenCalled();
    window.removeEventListener("hashchange", listener);
  });
});

describe("format", () => {
  it("formats Indian numbers, areas and years", () => {
    expect(formatPopulation(112374333)).toBe("11.2 crore");
    expect(formatPopulation(25540000)).toBe("2.55 crore");
    expect(formatPopulation(1458545)).toBe("14.6 lakh");
    expect(formatPopulation(98765)).toBe("98,765");
    expect(formatPopulation(null)).toBeNull();
    expect(formatArea(3702.4)).toBe("3,702 km²");
    expect(formatArea(undefined)).toBeNull();
    expect(formatYear("1987-05-30")).toBe("1987");
    expect(formatYear(null)).toBeNull();
  });

  it("formats distances", () => {
    expect(formatDistance(0.42)).toBe("420 m");
    expect(formatDistance(4.25)).toBe("4.3 km");
    expect(formatDistance(21.4)).toBe("21 km");
    expect(formatDistance(NaN)).toBeNull();
    expect(distanceKm({ lat: 15.49, lon: 73.82 }, { lat: 15.5, lon: 73.91 })).toBeCloseTo(9.7, 0);
  });

  it("compresses months into ranges, wrapping around the year", () => {
    expect(monthRanges([0, 1, 2, 9, 10, 11])).toBe("Oct–Mar");
    expect(monthRanges([1, 2, 6])).toBe("Feb–Mar, Jul");
    expect(monthRanges([4])).toBe("May");
    expect(monthRanges([10, 11, 0], { long: true })).toBe("November–January");
    expect(monthRanges([])).toBeNull();
    expect(monthRanges([...Array(12).keys()])).toBe("all year");
  });

  it("trims text by sentences and length, and pluralises", () => {
    expect(sentences("One. Two! Three? Four.", 2)).toBe("One. Two!");
    expect(sentences("No full stop", 2)).toBe("No full stop");
    expect(excerpt("short")).toBe("short");
    expect(excerpt("A fairly long sentence that needs trimming, carefully.", 30)).toBe(
      "A fairly long sentence that…",
    );
    expect(plural(1, "place")).toBe("1 place");
    expect(plural(1200, "dish", "dishes")).toBe("1,200 dishes");
  });
});

describe("images", () => {
  const image = {
    src: "https://upload.wikimedia.org/x/thumb/a/ab/F.jpg/1920px-F.jpg",
    width: 1000,
    license: "CC0",
    author: "A",
  };

  it("resizes Commons thumbnails and builds srcsets capped at the image width", () => {
    expect(thumbAt(image.src, 500)).toBe("https://upload.wikimedia.org/x/thumb/a/ab/F.jpg/500px-F.jpg");
    expect(thumbAt("https://upload.wikimedia.org/x/a/ab/F.jpg", 500)).toBe(
      "https://upload.wikimedia.org/x/a/ab/F.jpg",
    );
    expect(thumbAt(null, 500)).toBeNull();
    expect(srcSet(image)).toBe(
      "https://upload.wikimedia.org/x/thumb/a/ab/F.jpg/330px-F.jpg 330w, https://upload.wikimedia.org/x/thumb/a/ab/F.jpg/500px-F.jpg 500w, https://upload.wikimedia.org/x/thumb/a/ab/F.jpg/960px-F.jpg 960w",
    );
    expect(srcSet({ src: "https://x/plain.jpg" })).toBeUndefined();
  });

  it("writes credit lines", () => {
    expect(creditLine(image)).toBe("Photo: A · CC0");
    expect(creditLine({ license: "CC BY 4.0" })).toBe("Photo: Unknown author · CC BY 4.0");
    expect(creditLine(null)).toBeNull();
  });
});

describe("categories and search", () => {
  it("looks up and counts categories", () => {
    expect(category("beach").label).toBe("Beaches");
    expect(category("unknown").id).toBe("sights");
    expect(
      categoryCounts([{ category: "beach" }, { category: "religious" }, { category: "beach" }]),
    ).toMatchObject([
      { id: "religious", count: 1 },
      { id: "beach", count: 2 },
    ]);
  });

  it("finds entries with typos and applies filters", () => {
    const search = createSearcher(SEARCH);
    expect(search("bom jesus").map((item) => item.id)).toContain("basilica-of-bom-jesus-aaaaa");
    expect(search("bebinka")[0].id).toBe("bebinca-eeeee");
    expect(search("panaji", { kind: "destination" }).map((item) => item.kind)).toEqual(["destination"]);
    expect(search("beach", { category: "religious" })).toEqual([]);
    expect(search("b")).toEqual([]);
  });
});
