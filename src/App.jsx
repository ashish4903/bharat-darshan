import { useEffect, useRef } from "react";
import { Footer } from "./components/Footer.jsx";
import { BottomNav, Header } from "./components/Header.jsx";
import { getIndex, stateSummary } from "./lib/catalogue.js";
import { useRoute } from "./lib/router.js";
import { useTheme } from "./lib/theme.js";
import { HomeView } from "./views/HomeView.jsx";
import { NotFoundView } from "./views/NotFoundView.jsx";
import { AboutView, StatesView } from "./views/OtherViews.jsx";
import { PlaceView } from "./views/PlaceView.jsx";
import { SearchView } from "./views/SearchView.jsx";
import { StateView } from "./views/StateView.jsx";

const SITE = "Bharat Darshan";

function titleFor(route) {
  const state = route.stateId ? stateSummary(route.stateId) : null;
  switch (route.name) {
    case "home":
      return `${SITE} — India, state by state`;
    case "states":
      return `States · ${SITE}`;
    case "state":
      return state
        ? `${state.name}${route.tab !== "overview" ? ` · ${route.tab[0].toUpperCase()}${route.tab.slice(1)}` : ""} · ${SITE}`
        : SITE;
    case "search":
      return `Search · ${SITE}`;
    case "about":
      return `About · ${SITE}`;
    case "place":
      // The place page sets its own title once the place has loaded.
      return null;
    default:
      return `Not found · ${SITE}`;
  }
}

export default function App() {
  const route = useRoute();
  const { theme, toggle } = useTheme();
  const index = getIndex();
  const main = useRef(null);
  const pageKey = `${route.name}/${route.stateId ?? ""}/${route.placeId ?? ""}/${route.tab ?? ""}`;
  const firstRender = useRef(true);

  // New page: update the title, scroll to top and move focus for keyboard and screen-reader users.
  useEffect(() => {
    const title = titleFor(route);
    if (title) document.title = title;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const keepScroll = route.name === "state" && route.tab !== "overview";
    if (!keepScroll) window.scrollTo({ top: 0 });
    main.current?.focus({ preventScroll: true });
    // Only page changes matter here, not filter changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <Header route={route} theme={theme} onToggleTheme={toggle} />
      <main id="main" ref={main} tabIndex={-1}>
        {route.name === "home" && <HomeView index={index} />}
        {route.name === "states" && <StatesView index={index} />}
        {route.name === "state" && <StateView route={route} />}
        {route.name === "place" && <PlaceView route={route} />}
        {route.name === "search" && <SearchView route={route} />}
        {route.name === "about" && <AboutView index={index} />}
        {route.name === "not-found" && <NotFoundView />}
      </main>
      <Footer generatedAt={index.generatedAt} />
      <BottomNav route={route} />
    </div>
  );
}
