/** A 1×1 PNG served in place of every external photo. */
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  "base64",
);

/** Minimal MapLibre style so maps load without contacting a tile server. */
const STYLE = {
  version: 8,
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#e9e4da" } }],
};

/**
 * Stubs every non-local request: photos get a tiny PNG, the map style gets a blank style and
 * anything else is aborted. Tests therefore never depend on third-party services.
 */
export async function stubExternal(page) {
  await page.route(/^https?:\/\/(?!localhost)/, (route) => {
    const url = route.request().url();
    if (/upload\.wikimedia\.org/.test(url))
      return route.fulfill({ status: 200, contentType: "image/png", body: PIXEL });
    if (/tiles\.openfreemap\.org\/styles\//.test(url))
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STYLE) });
    return route.abort();
  });
}

export async function expectNoHorizontalScroll(page, expect) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}
