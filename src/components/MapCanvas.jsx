import { LngLatBounds, Map as MapLibreMap, NavigationControl, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";

const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

function currentTheme() {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Hides boundary lines from the base map: the guide is about places, not borders. */
function hideBoundaries(map) {
  for (const layer of map.getStyle()?.layers ?? []) {
    if (layer["source-layer"] === "boundary") map.setLayoutProperty(layer.id, "visibility", "none");
  }
}

function toGeoJson(points) {
  return {
    type: "FeatureCollection",
    features: points.map((point) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [point.lon, point.lat] },
      properties: {
        id: point.id,
        name: point.name,
        href: point.href ?? "",
        color: `oklch(0.62 0.16 ${point.hue ?? 35})`,
      },
    })),
  };
}

/** The MapLibre map itself; loaded lazily by MapView. */
export default function MapCanvas({ points, center, label, compact }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const map = new MapLibreMap({
      container: container.current,
      style: STYLES[currentTheme()],
      center: center ? [center.lon, center.lat] : [78.9, 22.5],
      zoom: center ? 6 : 4,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("error", (event) => {
      if (!map.isStyleLoaded() && /style|fetch|load/i.test(String(event?.error?.message ?? "")))
        setFailed(true);
    });
    map.on("load", () => {
      hideBoundaries(map);
      map.addSource("points", {
        type: "geojson",
        data: toGeoJson(points),
        cluster: points.length > 60,
        clusterRadius: 42,
      });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "points",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#e8622c",
          "circle-opacity": 0.85,
          "circle-radius": ["step", ["get", "point_count"], 16, 20, 21, 60, 27],
          "circle-stroke-width": 3,
          "circle-stroke-color": "#fff7ec",
        },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "points",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-font": ["Noto Sans Bold"],
        },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "points",
        type: "circle",
        source: "points",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": compact ? 7 : 6.5,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#ffffff",
        },
      });
      map.on("click", "clusters", async (event) => {
        const feature = event.features[0];
        const zoom = await map.getSource("points").getClusterExpansionZoom(feature.properties.cluster_id);
        map.easeTo({ center: feature.geometry.coordinates, zoom });
      });
      map.on("click", "points", (event) => {
        const { name, href } = event.features[0].properties;
        const element = document.createElement("div");
        element.className = "map-popup";
        const link = document.createElement(href ? "a" : "strong");
        link.textContent = name;
        if (href) link.href = href;
        element.append(link);
        new Popup({ offset: 10, closeButton: false })
          .setLngLat(event.features[0].geometry.coordinates)
          .setDOMContent(element)
          .addTo(map);
      });
      for (const layer of ["clusters", "points"]) {
        map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
        map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
      }
      if (points.length > 1) {
        const bounds = new LngLatBounds();
        points.forEach((point) => bounds.extend([point.lon, point.lat]));
        map.fitBounds(bounds, { padding: compact ? 40 : 56, maxZoom: compact ? 13 : 12, duration: 0 });
      } else if (points.length === 1) {
        map.jumpTo({ center: [points[0].lon, points[0].lat], zoom: 13 });
      }
    });
    return () => map.remove();
    // The map is created once per mount; points are refreshed in the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const source = mapRef.current?.getSource?.("points");
    if (source) source.setData(toGeoJson(points));
  }, [points]);

  return (
    <>
      <div ref={container} className="map-canvas" role="region" aria-label={label} />
      {failed && (
        <div className="map-loading">
          The map tiles could not be loaded. Check your connection and try again.
        </div>
      )}
    </>
  );
}
