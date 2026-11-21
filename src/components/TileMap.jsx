import { links } from "../lib/router.js";

const COLS = 10;
const ROWS = 9;

/**
 * Schematic tile grid of India's states and union territories. Live states link to their
 * pages; the rest are shown as coming soon. Deliberately not a geographic map.
 */
export function TileMap({ tiles, live, highlighted, onHover }) {
  const liveByCode = new Map(live.map((state) => [state.code, state]));
  return (
    <div className="tile-map" style={{ "--cols": COLS, "--rows": ROWS }}>
      <ul aria-label="States and union territories of India">
        {tiles.map((tile) => {
          const state = liveByCode.get(tile.code);
          const style = {
            gridColumn: tile.col + 1,
            gridRow: tile.row + 1,
            ...(state ? { "--accent": state.accent } : {}),
          };
          return (
            <li key={tile.code} style={style} className={state ? "tile-live" : "tile-soon"}>
              {state ? (
                <a
                  href={links.state(state.id)}
                  className={`tile ${highlighted === state.id ? "is-highlighted" : ""}`}
                  onMouseEnter={() => onHover?.(state.id)}
                  onMouseLeave={() => onHover?.(null)}
                  onFocus={() => onHover?.(state.id)}
                  onBlur={() => onHover?.(null)}
                  title={tile.name}
                >
                  {/* The accessible name starts with the visible code (WCAG 2.5.3, label in name). */}
                  {tile.code}
                  <span className="visually-hidden"> {tile.name}</span>
                </a>
              ) : (
                <span className="tile" title={`${tile.name} — coming soon`}>
                  {tile.code}
                  <span className="visually-hidden"> {tile.name}, coming soon</span>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="tile-legend">
        <span className="legend-live" aria-hidden="true" /> Live now{" "}
        <span className="legend-soon" aria-hidden="true" /> Coming soon
        <span className="tile-note">Schematic layout, not to scale.</span>
      </p>
    </div>
  );
}
