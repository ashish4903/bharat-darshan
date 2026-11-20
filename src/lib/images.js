/** Standard Wikimedia thumbnail widths; other widths are rendered on demand and discouraged. */
const STANDARD_WIDTHS = [330, 500, 960, 1280];

/**
 * A Commons thumbnail URL resized to `width`. URLs look like
 *   …/thumb/a/ab/File.jpg/1280px-File.jpg
 * Non-thumbnail URLs are returned unchanged.
 */
export function thumbAt(src, width) {
  if (!src || !src.includes("/thumb/")) return src ?? null;
  return src.split("?")[0].replace(/\/(\d+)px-([^/]+)$/, `/${width}px-$2`);
}

/** `srcSet` string for a Commons image, capped at the image's own width. */
export function srcSet(image) {
  if (!image?.src || !image.src.includes("/thumb/")) return undefined;
  const widths = STANDARD_WIDTHS.filter((width) => !image.width || width <= image.width);
  return widths.map((width) => `${thumbAt(image.src, width)} ${width}w`).join(", ");
}

/** Short credit line: "Photo: Author · CC BY-SA 4.0". */
export function creditLine(image) {
  if (!image) return null;
  const author = image.author ? image.author.slice(0, 80) : "Unknown author";
  return `Photo: ${author} · ${image.license}`;
}
