import { Search } from "lucide-react";
import { useId, useState } from "react";
import { links } from "../lib/router.js";

/** Search form that opens the search page. Works without JavaScript-heavy suggestions. */
export function SearchBox({
  initial = "",
  placeholder = "Search forts, beaches, dishes, cities…",
  size = "lg",
  autoFocus = false,
  onSearch,
}) {
  const [value, setValue] = useState(initial);
  const id = useId();
  function submit(event) {
    event.preventDefault();
    const query = value.trim();
    if (onSearch) onSearch(query);
    else window.location.hash = links.search({ q: query }).slice(1);
  }
  return (
    <form className={`search-box search-box-${size}`} role="search" onSubmit={submit}>
      <label htmlFor={id} className="visually-hidden">
        Search places, dishes and destinations
      </label>
      <Search className="search-box-icon" size={size === "lg" ? 22 : 18} aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          setValue(event.target.value);
          onSearch?.(event.target.value);
        }}
        autoComplete="off"
        enterKeyHint="search"
        autoFocus={autoFocus}
      />
      {!onSearch && (
        <button type="submit" className="button button-primary">
          Search
        </button>
      )}
    </form>
  );
}
