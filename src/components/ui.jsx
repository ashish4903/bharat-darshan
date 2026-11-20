import { AlertTriangle, ExternalLink, SearchX } from "lucide-react";
import { category as categoryMeta } from "../lib/categories.js";
import { creditLine, srcSet } from "../lib/images.js";

/** Responsive Commons image with lazy loading. Renders a tinted placeholder when there is no image. */
export function Photo({
  image,
  alt = "",
  sizes = "(max-width: 720px) 100vw, 33vw",
  className = "",
  eager = false,
  fallbackIcon: Icon,
}) {
  if (!image?.src) {
    return (
      <div className={`photo photo-empty ${className}`} aria-hidden="true">
        {Icon && <Icon size={34} strokeWidth={1.5} />}
      </div>
    );
  }
  return (
    <img
      className={`photo ${className}`}
      src={image.src}
      srcSet={srcSet(image)}
      sizes={sizes}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      width={image.width}
      height={image.height}
    />
  );
}

/** Photo credit linking to the file's Commons page, as the licenses require. */
export function Credit({ image, className = "" }) {
  if (!image) return null;
  return (
    <a
      className={`credit ${className}`}
      href={image.page}
      target="_blank"
      rel="noreferrer"
      title={`${image.file} — ${image.license}`}
    >
      {creditLine(image)}
    </a>
  );
}

export function CategoryChip({ id, count, active, onClick, as = "span" }) {
  const meta = categoryMeta(id);
  const Icon = meta.icon;
  const content = (
    <>
      <Icon size={15} aria-hidden="true" />
      <span>{meta.label}</span>
      {count != null && <b>{count}</b>}
    </>
  );
  const style = { "--chip-hue": meta.hue };
  if (as === "button") {
    return (
      <button
        type="button"
        className={`chip chip-category ${active ? "active" : ""}`}
        style={style}
        aria-pressed={active}
        onClick={onClick}
      >
        {content}
      </button>
    );
  }
  return (
    <span className="chip chip-category" style={style}>
      {content}
    </span>
  );
}

export function SectionHeader({ eyebrow, title, intro, action, id, as: Heading = "h2" }) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Heading id={id}>{title}</Heading>
        {intro && <p className="section-intro">{intro}</p>}
      </div>
      {action && <div className="section-action">{action}</div>}
    </div>
  );
}

export function SourceLink({ source, children }) {
  if (!source?.url) return null;
  return (
    <a className="source-link" href={source.url} target="_blank" rel="noreferrer">
      {children ?? `Source: ${source.name}${source.title ? ` — ${source.title}` : ""}`}
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="state-message">
      <SearchX size={30} aria-hidden="true" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", children, onRetry }) {
  return (
    <div className="state-message state-error" role="alert">
      <AlertTriangle size={30} aria-hidden="true" />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {onRetry && (
        <button type="button" className="button button-primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = "", style }) {
  return <div className={`skeleton ${className}`} style={style} aria-hidden="true" />;
}

/** Loading layout for a page: a banner and a grid of cards. */
export function PageSkeleton({ label = "Loading…" }) {
  return (
    <div className="page-skeleton" role="status" aria-live="polite">
      <span className="visually-hidden">{label}</span>
      <Skeleton className="skeleton-banner" />
      <div className="card-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="skeleton-card" />
        ))}
      </div>
    </div>
  );
}
