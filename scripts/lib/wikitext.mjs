/**
 * Minimal, dependency-free MediaWiki wikitext helpers: templates, sections, links and
 * plain-text conversion. Only what the data pipeline needs, but robust to nesting.
 */

/**
 * Finds top-level templates whose name matches `names` (case-insensitive).
 * Returns `[{ name, raw, start, end }]` where `raw` is the text between `{{` and `}}`.
 */
export function findTemplates(text, names) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  const found = [];
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("{{", index);
    if (open === -1) break;
    const close = matchingClose(text, open);
    if (close === -1) break;
    const raw = text.slice(open + 2, close);
    const name = raw
      .split("|")[0]
      .replace(/<!--[\s\S]*?(-->|$)/g, "")
      .trim()
      .replace(/_/g, " ")
      .toLowerCase();
    if (wanted.has(name)) found.push({ name, raw, start: open, end: close + 2 });
    index = wanted.has(name) ? close + 2 : open + 2;
  }
  return found;
}

/** Index of the `}}` that closes the `{{` at `open`, or -1. */
function matchingClose(text, open) {
  let depth = 0;
  for (let index = open; index < text.length - 1; index += 1) {
    const pair = text.slice(index, index + 2);
    if (pair === "{{") {
      depth += 1;
      index += 1;
    } else if (pair === "}}") {
      depth -= 1;
      index += 1;
      if (depth === 0) return index - 1;
    }
  }
  return -1;
}

/** Splits template parameters on `|`, ignoring pipes inside nested templates and links. */
export function splitParams(raw) {
  const parts = [];
  let depthTemplate = 0;
  let depthLink = 0;
  let current = "";
  for (let index = 0; index < raw.length; index += 1) {
    const pair = raw.slice(index, index + 2);
    if (pair === "{{" || pair === "}}" || pair === "[[" || pair === "]]") {
      if (pair === "{{") depthTemplate += 1;
      if (pair === "}}") depthTemplate -= 1;
      if (pair === "[[") depthLink += 1;
      if (pair === "]]") depthLink -= 1;
      current += pair;
      index += 1;
      continue;
    }
    if (raw[index] === "|" && depthTemplate === 0 && depthLink === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += raw[index];
  }
  parts.push(current);
  return parts;
}

/** `{ name, params, positional }` for a template's raw body. Parameter names are lower-cased. */
export function parseTemplate(raw) {
  const [name, ...rest] = splitParams(raw);
  const params = {};
  const positional = [];
  rest.forEach((part) => {
    const equals = part.indexOf("=");
    const key = equals === -1 ? "" : part.slice(0, equals).trim();
    if (equals !== -1 && /^[\w\s-]+$/.test(key)) {
      params[key.toLowerCase()] = part.slice(equals + 1).trim();
    } else {
      positional.push(part.trim());
    }
  });
  return { name: name.trim().toLowerCase(), params, positional };
}

/**
 * Headings with their character ranges: `[{ level, title, start, end }]`. A section ends where
 * the next heading of the same or a higher level begins.
 */
export function sections(text) {
  const headings = [...text.matchAll(/^(={2,6})\s*(.+?)\s*\1\s*$/gm)].map((match) => ({
    level: match[1].length,
    title: toPlainText(match[2]),
    start: match.index,
  }));
  return headings.map((heading, index) => {
    const next = headings.slice(index + 1).find((other) => other.level <= heading.level);
    return { ...heading, end: next ? next.start : text.length };
  });
}

/** The text of the first level-2 section titled `title` (case-insensitive), or "". */
export function sectionText(text, title) {
  const section = sections(text).find(
    (item) => item.level === 2 && item.title.toLowerCase() === title.toLowerCase(),
  );
  return section ? text.slice(section.start, section.end) : "";
}

/** The innermost section headings that contain `position`, outermost first. */
export function sectionPath(allSections, position) {
  return allSections
    .filter((section) => section.start <= position && position < section.end)
    .sort((a, b) => a.level - b.level)
    .map((section) => section.title);
}

/** Targets of `[[internal links]]`, without anchors, in order of appearance. */
export function internalLinks(text) {
  return [...text.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)]
    .map((match) => match[1].trim().replace(/_/g, " "))
    .filter((target) => !/^(file|image|category|w|wikipedia|wikt|commons|s|:)\s*:/i.test(target));
}

/**
 * Removes pronunciation and transliteration clutter from encyclopedia intros:
 * empty "()" left by stripped templates and parentheses holding IPA or "Language: …" notes.
 */
export function tidyIntro(text) {
  let value = String(text ?? "");
  for (let guard = 0; guard < 4; guard += 1) {
    value = value
      .replace(/\s*\(\s*[;,]?\s*\)/g, "")
      .replace(/\s*\((?:[^()]*?(?:\[|ˈ|IPA|pronounced|pronunciation|[A-Z][a-z]+:)[^()]*)\)/g, "");
  }
  return value
    .replace(/\s+([,.;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const KEEP_TEXT_TEMPLATES = new Set(["nowrap", "small", "lang", "transl", "smallcaps"]);

/** Converts a wikitext fragment to readable plain text. */
export function toPlainText(wikitext) {
  let text = String(wikitext ?? "");
  text = text.replace(/<!--[\s\S]*?-->/g, "");
  text = text.replace(/<ref[^>]*\/>/gi, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  // Replace templates from the inside out. A few formatting templates keep their last argument.
  for (let guard = 0; guard < 10 && text.includes("{{"); guard += 1) {
    text = text.replace(/\{\{([^{}]*)\}\}/g, (_, body) => {
      const parts = body.split("|");
      const name = parts[0].trim().toLowerCase();
      if (KEEP_TEXT_TEMPLATES.has(name)) return parts[parts.length - 1];
      if (name === "convert" && parts.length >= 3) return `${parts[1]} ${parts[2]}`;
      return "";
    });
  }
  text = text.replace(/\[\[(?:file|image|category):[^\]]*\]\]/gi, "");
  text = text.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1");
  text = text.replace(/\[(?:https?:)?\/\/[^\s\]]+\s+([^\]]+)\]/g, "$1");
  text = text.replace(/\[(?:https?:)?\/\/[^\s\]]+\]/g, "");
  text = text.replace(/'{2,5}/g, "");
  text = text.replace(/<br\s*\/?>/gi, " ");
  text = text.replace(/<\/?[a-z][^>]*>/gi, "");
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—");
  return text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}
