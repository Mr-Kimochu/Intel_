import { useState, useCallback, useRef } from "react";

export default function LocationSearch({ onSelect, variant = "dark" }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const search = useCallback((text) => {
    setQuery(text);
    clearTimeout(debounceRef.current);

    if (text.trim().length < 3) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5`
        );
        const data = await res.json();
        setResults(data);
      } catch (e) {
        console.warn("location-search:", e?.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400); // debounce — respects Nominatim's ~1req/s fair-use limit
  }, []);

  const handleSelect = (result) => {
    onSelect(parseFloat(result.lat), parseFloat(result.lon));
    setQuery(result.display_name);
    setResults([]);
  };

  return (
    <div className={`location-search location-search--${variant}`}>
      <input
        className="location-search-input"
        type="text"
        value={query}
        placeholder="Search a place..."
        onChange={(e) => search(e.target.value)}
      />
      {loading && <span className="location-search-loading">Searching…</span>}
      {results.length > 0 && (
        <ul className="location-search-results">
          {results.map((r) => (
            <li key={r.place_id} onClick={() => handleSelect(r)}>
              {r.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}