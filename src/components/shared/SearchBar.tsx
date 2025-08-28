import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchHotelsByQuery } from '../../utils/api';
import './SearchBar.css';

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  onSearch?: (results: any[]) => void;
  showResults?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  placeholder = "Search for hotels, destinations...", 
  className = "",
  onSearch,
  showResults = false
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const searchResults = await searchHotelsByQuery(searchQuery, 5);
      setResults(searchResults);
      setShowDropdown(true);
      
      if (onSearch) {
        onSearch(searchResults);
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.trim()) {
      handleSearch(value);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  };

  const handleResultClick = (result: any) => {
    setQuery(result.name || result.location || '');
    setShowDropdown(false);
    
    // Navigate to search page with the selected result
    navigate(`/search?location=${encodeURIComponent(result.name || result.location || '')}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?location=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className={`search-bar-container ${className}`}>
      <div className="booking-wrapper">
        <div className="container">
          <div className="booking-inner clearfix">
            <form onSubmit={handleSubmit} className="form1 clearfix">
              <div className="col1 c1" style={{ width: '65%' }}>
                <div className="input1_wrapper">
                  <label>Location</label>
                  <div className="input1_inner">
                    <input 
                      type="text" 
                      className="form-control input" 
                      placeholder={placeholder}
                      value={query}
                      onChange={handleInputChange}
                      onFocus={() => query.trim() && setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                    />
                  </div>
                </div>
              </div>
              <div className="col4 c5" style={{ width: '35%' }}>
                <button 
                  type="submit" 
                  className="btn-form1-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    'Search Hotels'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {showDropdown && showResults && results.length > 0 && (
        <div className="search-results-dropdown">
          {results.map((result, index) => (
            <div
              key={result.id || index}
              className="search-result-item"
              onClick={() => handleResultClick(result)}
            >
              <div className="result-info">
                <h6>{result.name}</h6>
                <p>{result.location}</p>
                {result.price && <span className="price">${result.price}/night</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
