import { Compass } from "lucide-react";
import { links } from "../lib/router.js";

export function NotFoundView({ title = "This page took a wrong turn" }) {
  return (
    <div className="container section">
      <div className="state-message">
        <Compass size={34} aria-hidden="true" />
        <h1 className="page-title">{title}</h1>
        <p>The link may be old, or the place may have moved in the sources.</p>
        <div className="row-gap">
          <a className="button button-primary" href={links.states()}>
            Explore states
          </a>
          <a className="button button-secondary" href={links.search()}>
            Search
          </a>
        </div>
      </div>
    </div>
  );
}
