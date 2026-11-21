import { MONTHS } from "../lib/format.js";

const WIDTH = 720;
const HEIGHT = 240;
const PAD = { top: 18, right: 40, bottom: 34, left: 40 };

/**
 * Monthly rainfall (bars) and average daily high/low temperature (lines). Best months are
 * highlighted. Includes a data table for screen readers.
 */
export function ClimateChart({ climate }) {
  const { months, best } = climate;
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const step = innerW / 12;
  const rainMax = Math.max(100, ...months.map((month) => month.rainMm ?? 0));
  const temps = months.flatMap((month) => [month.maxC, month.minC]).filter(Number.isFinite);
  const tMin = Math.floor(Math.min(...temps) / 5) * 5;
  const tMax = Math.ceil(Math.max(...temps) / 5) * 5;
  const x = (index) => PAD.left + step * index + step / 2;
  const yTemp = (value) => PAD.top + innerH - ((value - tMin) / Math.max(1, tMax - tMin)) * innerH;
  const yRain = (value) => PAD.top + innerH - (value / rainMax) * innerH;
  const line = (key) =>
    months
      .map((month, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${yTemp(month[key]).toFixed(1)}`)
      .join(" ");
  const bestSet = new Set(best);

  return (
    <figure className="climate-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Monthly climate in ${climate.place}: rainfall and temperatures`}
      >
        {months.map((month, index) => (
          <g key={month.month}>
            {bestSet.has(index) && (
              <rect
                className="climate-best"
                x={PAD.left + step * index + 2}
                y={PAD.top - 8}
                width={step - 4}
                height={innerH + 8}
                rx="8"
              />
            )}
            <rect
              className="climate-rain"
              x={x(index) - step * 0.22}
              y={yRain(month.rainMm ?? 0)}
              width={step * 0.44}
              height={Math.max(0, PAD.top + innerH - yRain(month.rainMm ?? 0))}
              rx="3"
            />
            <text className="climate-axis" x={x(index)} y={HEIGHT - 12} textAnchor="middle">
              {MONTHS[index]}
            </text>
          </g>
        ))}
        <path className="climate-line climate-max" d={line("maxC")} />
        <path className="climate-line climate-min" d={line("minC")} />
        {[tMin, (tMin + tMax) / 2, tMax].map((value) => (
          <text key={value} className="climate-axis" x={PAD.left - 8} y={yTemp(value) + 4} textAnchor="end">
            {Math.round(value)}°
          </text>
        ))}
        {[0, rainMax / 2, rainMax].map((value) => (
          <text key={value} className="climate-axis" x={WIDTH - PAD.right + 8} y={yRain(value) + 4}>
            {Math.round(value)}
          </text>
        ))}
      </svg>
      <figcaption className="climate-legend">
        <span>
          <i className="swatch swatch-max" /> Avg. high °C
        </span>
        <span>
          <i className="swatch swatch-min" /> Avg. low °C
        </span>
        <span>
          <i className="swatch swatch-rain" /> Rain (mm/month)
        </span>
        <span>
          <i className="swatch swatch-best" /> Most comfortable
        </span>
      </figcaption>
      <table className="visually-hidden">
        <caption>
          Climate in {climate.place}, {climate.period}
        </caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Avg. high °C</th>
            <th scope="col">Avg. low °C</th>
            <th scope="col">Rain mm</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.month}>
              <th scope="row">{month.month}</th>
              <td>{month.maxC}</td>
              <td>{month.minC}</td>
              <td>{month.rainMm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
