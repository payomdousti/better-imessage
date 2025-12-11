/**
 * SearchBar component
 * @module components/SearchBar
 */

import React, { useState, useEffect, useRef, memo } from 'react';

// ============================================================
// Icons
// ============================================================

const SearchIcon = ({ className, isFocused }) => (
  <svg
    className={`${className} transition-colors pointer-events-none ${isFocused ? 'text-primary' : 'text-muted-foreground'}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const ClearIcon = () => (
  <svg className="h-4 w-4 text-muted-foreground hover:text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ============================================================
// Main component
// ============================================================

/**
 * SearchBar - Search input with debounce
 */
const SearchBar = ({ onSearch }) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef(null);

  // Debounced search on typing
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      onSearch(query);
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, onSearch]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-2xl mx-auto w-full">
      <div className={`relative flex-1 transition-all ${isFocused ? 'scale-[1.01]' : ''}`}>
        <SearchIcon
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
          isFocused={isFocused}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search messages..."
          className="input pl-10 pr-10"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-accent transition-colors"
          >
            <ClearIcon />
          </button>
        )}
      </div>
    </form>
  );
};

export default memo(SearchBar);
