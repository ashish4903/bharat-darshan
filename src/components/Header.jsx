import { Compass, Info, Moon, Search, Sun } from "lucide-react";
import { links } from "../lib/router.js";
import { Logo } from "./Logo.jsx";

const NAV = [
  {
    id: "states",
    label: "Explore states",
    href: links.states(),
    icon: Compass,
    match: ["states", "state", "place"],
  },
  { id: "search", label: "Search", href: links.search(), icon: Search, match: ["search"] },
  { id: "about", label: "About", href: links.about(), icon: Info, match: ["about"] },
];

export function Header({ route, theme, onToggleTheme }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="brand-link" href={links.home()} aria-label="Bharat Darshan — home">
          <Logo />
        </a>
        <nav className="header-nav" aria-label="Main">
          {NAV.map(({ id, label, href, match }) => (
            <a
              key={id}
              href={href}
              className="header-link"
              aria-current={match.includes(route.name) ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <a className="icon-button header-search" href={links.search()} aria-label="Search">
            <Search size={18} aria-hidden="true" />
          </a>
          <button
            type="button"
            className="icon-button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
          </button>
        </div>
      </div>
    </header>
  );
}

/** Phone navigation, pinned to the bottom of the screen. */
export function BottomNav({ route }) {
  const items = [{ id: "home", label: "Home", href: links.home(), icon: Compass, match: ["home"] }, ...NAV];
  return (
    <nav className="bottom-nav" aria-label="Quick">
      {items.map(({ id, label, href, icon: Icon, match }) => (
        <a key={id} href={href} aria-current={match.includes(route.name) ? "page" : undefined}>
          <Icon size={20} aria-hidden="true" />
          <span>{id === "states" ? "States" : label}</span>
        </a>
      ))}
    </nav>
  );
}
