import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import { GOA, INDEX, SEARCH } from "./test/fixtures.js";

vi.mock("./lib/catalogue.js", async (importOriginal) => {
  const actual = await importOriginal();
  const { GOA: goa, INDEX: index, SEARCH: search } = await import("./test/fixtures.js");
  return {
    ...actual,
    getIndex: () => index,
    stateSummary: (id) => index.states.find((state) => state.id === id) ?? null,
    loadSearchIndex: () => Promise.resolve(search),
    useStateData: (id) =>
      id === "goa"
        ? { status: "ready", data: goa, retry: () => {} }
        : id === "broken"
          ? { status: "error", data: null, retry: () => {} }
          : { status: "missing", data: null, retry: () => {} },
  };
});

async function go(hash) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

function renderAt(hash = "") {
  window.location.hash = hash;
  const user = userEvent.setup();
  render(<App />);
  return { user };
}

describe("home", () => {
  it("introduces the guide with search, live states and featured content", () => {
    renderAt("");
    expect(screen.getByRole("heading", { level: 1, name: /Discover India/ })).toBeInTheDocument();
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.getByText("state", { exact: false, selector: "li" })).toHaveTextContent("1 state live");
    expect(screen.getAllByRole("link", { name: /Goa/ }).length).toBeGreaterThan(0);
    expect(screen.getByText("Karnataka, coming soon", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Iconic places" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bebinca" })).toBeInTheDocument();
    expect(document.title).toBe("Bharat Darshan — India, state by state");
  });

  it("searches from the hero", async () => {
    const { user } = renderAt("");
    await user.type(screen.getByRole("searchbox"), "bom jesus{Enter}");
    await waitFor(() => expect(window.location.hash).toBe("#/search?q=bom+jesus"));
  });
});

describe("state page", () => {
  it("shows facts, top sights, destinations and dishes on the overview", () => {
    renderAt("#/state/goa");
    expect(screen.getByRole("heading", { level: 1, name: /Goa/ })).toBeInTheDocument();
    expect(screen.getByText("गोंय")).toHaveAttribute("lang", "kok");
    expect(screen.getByText("14.6 lakh (2011)")).toBeInTheDocument();
    expect(screen.getByText("Nov–Mar")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Basilica of Bom Jesus/ })).toHaveAttribute(
      "href",
      "#/place/goa/basilica-of-bom-jesus-aaaaa",
    );
    expect(screen.getByRole("link", { name: /^Panaji The capital/ })).toHaveAttribute(
      "href",
      "#/state/goa/places?dest=panaji",
    );
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(document.title).toBe("Goa · Bharat Darshan");
  });

  it("filters places by category and destination through the URL", async () => {
    const { user } = renderAt("#/state/goa/places");
    expect(screen.getByRole("heading", { name: "3 places" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Beaches/ }));
    expect(window.location.hash).toBe("#/state/goa/places?cat=beach");
    expect(screen.getByRole("heading", { name: "1 place" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Beaches/ }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Destination" }), "old-goa");
    expect(screen.getByRole("heading", { name: "2 places in Old Goa" })).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Only places with photos" }));
    expect(screen.getByRole("heading", { name: "1 place in Old Goa" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByRole("heading", { name: "3 places" })).toBeInTheDocument();
  });

  it("sorts places by name and shows an empty state", async () => {
    const { user } = renderAt("#/state/goa/places?cat=wildlife");
    expect(screen.getByText("No places match these filters")).toBeInTheDocument();
    await go("#/state/goa/places?sort=name");
    const names = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(names).toEqual(["Basilica of Bom Jesus", "Miramar Beach", "Se Cathedral"]);
    await user.click(screen.getByRole("button", { name: /Filters/ }));
    expect(screen.getByRole("button", { name: /Filters/ })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getAllByRole("button", { name: "Close filters" })[0]);
  });

  it("lists dishes and eateries on the food tab", () => {
    renderAt("#/state/goa/food");
    expect(screen.getByRole("heading", { name: "Signature dishes of Goa" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Read on Wikipedia/ })).toHaveAttribute(
      "href",
      "https://en.wikipedia.org/wiki/Bebinca",
    );
    const panaji = screen.getByRole("region", { name: "Panaji" });
    expect(within(panaji).getByRole("link", { name: "Ritz Classic" })).toBeInTheDocument();
    expect(within(panaji).getByText("₹300")).toBeInTheDocument();
  });

  it("shows climate, helplines and services on the practical tab", () => {
    renderAt("#/state/goa/practical");
    expect(screen.getByRole("heading", { name: "Most comfortable: November–March" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Monthly climate in Panaji/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "112" })).toHaveAttribute("href", "tel:112");
    expect(screen.getByText("Goa Medical College")).toBeInTheDocument();
    expect(screen.getByText("GOI")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:+918322495000");
  });

  it("falls back gracefully on the map tab without WebGL", async () => {
    renderAt("#/state/goa/map");
    expect(await screen.findByText(/needs WebGL/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Everything/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("handles unknown and failing states", async () => {
    renderAt("#/state/atlantis");
    expect(screen.getByRole("heading", { name: "We don't cover this state yet" })).toBeInTheDocument();
    await go("#/state/broken");
    expect(screen.getByRole("alert")).toHaveTextContent("This guide could not be loaded");
  });
});

describe("place page", () => {
  it("shows details, directions, credit, nearby places and sources", async () => {
    renderAt("#/place/goa/basilica-of-bom-jesus-aaaaa");
    expect(screen.getByRole("heading", { level: 1, name: "Basilica of Bom Jesus" })).toBeInTheDocument();
    expect(screen.getByText("Bom Jesus · बॉम जीसस बेसिलिका")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Directions/ })).toHaveAttribute(
      "href",
      expect.stringContaining("destination=15.5009,73.9116"),
    );
    expect(screen.getByRole("link", { name: /Photo: Test Photographer/ })).toHaveAttribute(
      "href",
      expect.stringContaining("commons.wikimedia.org"),
    );
    expect(screen.getByText("9AM-6:30PM")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "example.org" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Nearby" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Se Cathedral/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Source: Wikivoyage/ })).toBeInTheDocument();
    await waitFor(() => expect(document.title).toBe("Basilica of Bom Jesus — Goa · Bharat Darshan"));
  });

  it("copies the link when native sharing is unavailable", async () => {
    Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
    const { user } = renderAt("#/place/goa/miramar-beach-ccccc");
    // userEvent.setup() installs its own clipboard; replace it afterwards.
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await user.click(screen.getByRole("button", { name: /Share/ }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("#/place/goa/miramar-beach-ccccc"));
    expect(await screen.findByRole("button", { name: /Link copied/ })).toBeInTheDocument();
  });

  it("says when a place is missing", () => {
    renderAt("#/place/goa/nowhere");
    expect(screen.getByRole("heading", { name: "We couldn't find that place" })).toBeInTheDocument();
  });
});

describe("search", () => {
  it("finds places, dishes and destinations, with filters", async () => {
    const { user } = renderAt("#/search");
    expect(await screen.findByText("What are you looking for?")).toBeInTheDocument();
    await user.type(screen.getByRole("searchbox"), "bebinka");
    expect(await screen.findByRole("link", { name: /Bebinca/ })).toHaveAttribute("href", "#/state/goa/food");
    await go("#/search?q=panaji&kind=destination");
    expect(await screen.findByRole("link", { name: /Panaji/ })).toHaveAttribute(
      "href",
      "#/state/goa/places?dest=panaji",
    );
    await go("#/search?q=zzzzzz");
    expect(await screen.findByText(/No results for/)).toBeInTheDocument();
  });
});

describe("shell", () => {
  it("toggles and remembers the theme", async () => {
    const { user } = renderAt("");
    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("bharat-darshan.theme")).toBe("dark");
  });

  it("renders the states, about and not-found pages", async () => {
    renderAt("#/states");
    expect(
      screen.getByRole("heading", { level: 1, name: "States and union territories" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Karnataka")).toBeInTheDocument();
    await go("#/about");
    expect(screen.getByRole("heading", { level: 1, name: /open knowledge/ })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "License" })).toBeInTheDocument();
    await go("#/missing");
    expect(
      screen.getByRole("heading", { level: 1, name: "This page took a wrong turn" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Not found · Bharat Darshan");
  });

  it("marks the current section in the navigation", async () => {
    renderAt("#/search");
    expect(
      screen
        .getAllByRole("link", { name: "Search" })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
    expect(GOA.places.length + INDEX.states.length + SEARCH.length).toBeGreaterThan(0);
  });
});
