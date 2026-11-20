import { lazy, Suspense, useEffect, useState } from "react";
import { MapPinOff } from "lucide-react";

const MapCanvas = lazy(() => import("./MapCanvas.jsx"));

/** Detects WebGL once; MapLibre needs it. */
function webglAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Interactive map of points. MapLibre (and its ~250 kB) only loads when a map is shown.
 * `points`: [{ id, name, lat, lon, hue, href }]
 */
export function MapView({ points, center, label, height = 460, compact = false }) {
  const [supported, setSupported] = useState(null);
  useEffect(() => setSupported(webglAvailable()), []);
  const located = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  if (supported === false) {
    return (
      <div className="map-fallback" style={{ minHeight: compact ? 220 : height }}>
        <MapPinOff size={28} aria-hidden="true" />
        <p>
          The interactive map needs WebGL, which this browser doesn&apos;t provide. Each place still links to
          OpenStreetMap.
        </p>
      </div>
    );
  }
  return (
    <div className="map-frame" style={{ height }}>
      {supported && (
        <Suspense fallback={<div className="map-loading">Loading map…</div>}>
          <MapCanvas points={located} center={center} label={label} compact={compact} />
        </Suspense>
      )}
    </div>
  );
}
