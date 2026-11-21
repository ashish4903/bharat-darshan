/**
 * Monthly climate normals from daily observations (Open-Meteo historical weather), and a
 * transparent rule for the most comfortable months to visit.
 */

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

/**
 * `daily` is Open-Meteo's `{ time, temperature_2m_max, temperature_2m_min, precipitation_sum }`.
 * Returns 12 entries of `{ month, maxC, minC, rainMm, rainyDays }`, averaged over all years.
 */
export function monthlyNormals(daily) {
  const buckets = Array.from({ length: 12 }, () => ({
    max: [],
    min: [],
    rainByYear: new Map(),
    rainyDaysByYear: new Map(),
  }));
  daily.time.forEach((date, index) => {
    const [year, month] = date.split("-").map(Number);
    const bucket = buckets[month - 1];
    const max = daily.temperature_2m_max[index];
    const min = daily.temperature_2m_min[index];
    const rain = daily.precipitation_sum[index];
    if (Number.isFinite(max)) bucket.max.push(max);
    if (Number.isFinite(min)) bucket.min.push(min);
    if (Number.isFinite(rain)) {
      bucket.rainByYear.set(year, (bucket.rainByYear.get(year) ?? 0) + rain);
      if (rain >= 2.5) bucket.rainyDaysByYear.set(year, (bucket.rainyDaysByYear.get(year) ?? 0) + 1);
      else if (!bucket.rainyDaysByYear.has(year)) bucket.rainyDaysByYear.set(year, 0);
    }
  });
  const mean = (values) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
  return buckets.map((bucket, index) => ({
    month: MONTHS[index],
    maxC: bucket.max.length ? round(mean(bucket.max)) : null,
    minC: bucket.min.length ? round(mean(bucket.min)) : null,
    rainMm: bucket.rainByYear.size ? Math.round(mean([...bucket.rainByYear.values()])) : null,
    rainyDays: bucket.rainyDaysByYear.size ? Math.round(mean([...bucket.rainyDaysByYear.values()])) : null,
  }));
}

/** The comfort rule, kept in one place so the UI can explain it. */
export const COMFORT_RULE = { maxRainMm: 60, maxTempC: 34, minTempC: 5 };

/** Indexes (0–11) of months that meet the comfort rule. */
export function bestMonths(normals, rule = COMFORT_RULE) {
  return normals.flatMap((month, index) =>
    month.rainMm != null &&
    month.maxC != null &&
    month.minC != null &&
    month.rainMm <= rule.maxRainMm &&
    month.maxC <= rule.maxTempC &&
    month.minC >= rule.minTempC
      ? [index]
      : [],
  );
}
