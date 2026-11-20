import { links } from "../lib/router.js";
import { Logo } from "./Logo.jsx";

export function Footer({ generatedAt }) {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Logo />
          <p>A free, open-data guide to India, state by state. No ads, no tracking, no sign-up.</p>
        </div>
        <div className="footer-links">
          <a href={links.states()}>Explore states</a>
          <a href={links.search()}>Search</a>
          <a href={links.about()}>About &amp; credits</a>
        </div>
        <p className="footer-note">
          Content from <a href="https://www.wikivoyage.org/">Wikivoyage</a>,{" "}
          <a href="https://www.wikipedia.org/">Wikipedia</a>, <a href="https://www.wikidata.org/">Wikidata</a>
          , <a href="https://commons.wikimedia.org/">Wikimedia Commons</a> and{" "}
          <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>, under their open
          licenses.
          {generatedAt && <> Data updated {generatedAt}.</>} Always check timings and conditions locally
          before you travel.
        </p>
      </div>
    </footer>
  );
}
