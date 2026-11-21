import {
  Building2,
  Church,
  Landmark,
  Mountain,
  PawPrint,
  Sparkles,
  Telescope,
  Umbrella,
  UtensilsCrossed,
} from "lucide-react";

/** Place categories, in display order. `hue` is an OKLCH hue used for chips and map markers. */
export const CATEGORIES = [
  { id: "heritage", label: "Heritage", plural: "Forts, palaces & monuments", icon: Landmark, hue: 35 },
  { id: "religious", label: "Spiritual", plural: "Temples, churches & shrines", icon: Church, hue: 350 },
  { id: "museum", label: "Museums", plural: "Museums & galleries", icon: Building2, hue: 265 },
  { id: "nature", label: "Nature", plural: "Lakes, hills & waterfalls", icon: Mountain, hue: 150 },
  { id: "beach", label: "Beaches", plural: "Beaches & coast", icon: Umbrella, hue: 210 },
  { id: "wildlife", label: "Wildlife", plural: "Parks & sanctuaries", icon: PawPrint, hue: 110 },
  { id: "experience", label: "Experiences", plural: "Things to do", icon: Sparkles, hue: 300 },
  { id: "sights", label: "Sights", plural: "Other sights", icon: Telescope, hue: 230 },
  { id: "food", label: "Food & drink", plural: "Places to eat & drink", icon: UtensilsCrossed, hue: 60 },
];

const BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

export function category(id) {
  return BY_ID.get(id) ?? BY_ID.get("sights");
}

/** Counts per category for a list of places, in display order, skipping empty ones. */
export function categoryCounts(places) {
  const counts = new Map();
  places.forEach((place) => counts.set(place.category, (counts.get(place.category) ?? 0) + 1));
  return CATEGORIES.filter((item) => counts.has(item.id)).map((item) => ({
    ...item,
    count: counts.get(item.id),
  }));
}
