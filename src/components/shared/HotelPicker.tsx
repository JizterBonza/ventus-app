import React, { useEffect, useState } from 'react';
import { searchPredictions } from '../../utils/api';
import { CategoryHotel } from '../../utils/categoryPages';
import { PredictiveSearchResult } from '../../types/search';

const HotelPicker: React.FC<{ onSelect: (hotel: CategoryHotel) => void; selectedIds: number[] }> = ({ onSelect, selectedIds }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PredictiveSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setResults([]); setError('');
    if (query.trim().length < 2) { setLoading(false); return; }
    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchPredictions(query, 20, ['hotel']).then((matches) => {
        if (active) setResults(matches.filter((match) => match.type === 'hotel' && match.id > 0));
      }).catch(() => { if (active) setError('Hotel search is unavailable. Try again in a moment.'); })
        .finally(() => { if (active) setLoading(false); });
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query]);
  return <div className="category-hotel-picker">
    <label htmlFor="category-hotel-search">Find a hotel to add</label>
    <input id="category-hotel-search" type="search" autoComplete="off" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by hotel name…" />
    <div aria-live="polite">
      {loading && <p>Searching hotels…</p>}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && query.trim().length >= 2 && !results.length && <p>No hotels found. Try another name.</p>}
    </div>
    {results.length > 0 && <ul aria-label="Hotel search results">
      {results.map((hotel) => <li key={hotel.id}>
        <div><strong>{hotel.text}</strong><small>{hotel.location || `Hotel #${hotel.id}`}</small></div>
        <button type="button" disabled={selectedIds.includes(hotel.id) || selectedIds.length >= 50} onClick={() => {
          onSelect({ id: hotel.id, name: hotel.text, location: hotel.location || '' }); setQuery('');
        }}>{selectedIds.includes(hotel.id) ? 'Added' : 'Add hotel'}</button>
      </li>)}
    </ul>}
  </div>;
};
export default HotelPicker;
